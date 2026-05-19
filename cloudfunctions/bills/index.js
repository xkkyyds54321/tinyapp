// cloudfunctions/bills/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const col = db.collection('bills')
const users = db.collection('users')

const OK = 0
const UNKNOWN = 1000
const COUPLE_NOT_BOUND = 3006
const BILL_NOT_FOUND = 9101

function resp(code, message, data = null) {
  return { code, message, data }
}

async function getCoupleId(openid) {
  const { data } = await users.where({ openid }).get()
  return data[0] ? data[0].coupleId : null
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function createBill(openid, event) {
  const { amount, category, note, billDate } = event
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return resp(UNKNOWN, '请填写有效金额')
  if (!category) return resp(UNKNOWN, '请选择分类')

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const now = Date.now()
  const res = await col.add({
    data: {
      coupleId,
      createdBy: openid,
      amount: Math.round(Number(amount) * 100) / 100,
      category,
      note: (note || '').trim().slice(0, 50),
      billDate: billDate || todayKey(),
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    }
  })
  return resp(OK, '已记录', { id: res._id })
}

async function listBills(openid, event) {
  const { page = 1, pageSize = 20, month } = event
  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  let query = col.where({ coupleId, isDeleted: false })

  if (month) {
    const [yyyy, mm] = month.split('/')
    const start = `${yyyy}-${String(mm).padStart(2, '0')}-01`
    const nextMonth = parseInt(mm) === 12
      ? `${parseInt(yyyy) + 1}-01-01`
      : `${yyyy}-${String(parseInt(mm) + 1).padStart(2, '0')}-01`
    query = col.where({
      coupleId,
      isDeleted: false,
      billDate: _.gte(start).and(_.lt(nextMonth))
    })
  }

  const total = await query.count()
  const { data } = await query
    .orderBy('billDate', 'desc')
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  const openids = [...new Set(data.map(b => b.createdBy))]
  const usersRes = await users.where({ openid: _.in(openids) }).get()
  const userMap = {}
  usersRes.data.forEach(u => { userMap[u.openid] = u })

  const list = data.map(b => ({
    ...b,
    isMine: b.createdBy === openid,
    creatorName: (userMap[b.createdBy] && userMap[b.createdBy].nickname) || (b.createdBy === openid ? '我' : 'TA')
  }))

  return resp(OK, 'ok', { list, total: total.total, page, pageSize })
}

async function deleteBill(openid, event) {
  const { id } = event
  if (!id) return resp(UNKNOWN, '缺少 id')

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const { data } = await col.where({ _id: id, coupleId, isDeleted: false }).get()
  if (!data.length) return resp(BILL_NOT_FOUND, '记录不存在')
  if (data[0].createdBy !== openid) return resp(UNKNOWN, '只能删除自己的记录')

  await col.doc(id).update({ data: { isDeleted: true, updatedAt: Date.now() } })
  return resp(OK, '已删除')
}

async function getStats(openid, event) {
  const { month } = event
  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const [yyyy, mm] = (month || '').split('/') || [null, null]
  if (!yyyy || !mm) return resp(UNKNOWN, '缺少 month 参数')

  const start = `${yyyy}-${String(mm).padStart(2, '0')}-01`
  const nextMonth = parseInt(mm) === 12
    ? `${parseInt(yyyy) + 1}-01-01`
    : `${yyyy}-${String(parseInt(mm) + 1).padStart(2, '0')}-01`

  const { data } = await col.where({
    coupleId,
    isDeleted: false,
    billDate: _.gte(start).and(_.lt(nextMonth))
  }).limit(500).get()

  let total = 0
  const byCat = {}
  data.forEach(b => {
    total += b.amount
    byCat[b.category] = (byCat[b.category] || 0) + b.amount
  })

  return resp(OK, 'ok', {
    total: Math.round(total * 100) / 100,
    byCategory: byCat,
    count: data.length
  })
}

exports.main = async (event, context) => {
  const { OPENID: openid } = cloud.getWXContext()
  if (!openid) return resp(UNKNOWN, '无法获取用户身份')
  try {
    switch (event.action) {
      case 'createBill': return await createBill(openid, event)
      case 'listBills': return await listBills(openid, event)
      case 'deleteBill': return await deleteBill(openid, event)
      case 'getStats': return await getStats(openid, event)
      default: return resp(UNKNOWN, '未知 action')
    }
  } catch (err) {
    console.error('[bills]', err)
    return resp(UNKNOWN, err.message || '服务错误')
  }
}
