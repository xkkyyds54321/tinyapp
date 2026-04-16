// cloudfunctions/anniversaries/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const col = db.collection('anniversaries')
const users = db.collection('users')

const OK = 0
const UNKNOWN = 1000
const COUPLE_NOT_BOUND = 3006
const ANNIVERSARY_NOT_FOUND = 5001
const ANNIVERSARY_TITLE_TOO_LONG = 5002
const ANNIVERSARY_DATE_INVALID = 5003

function resp(code, message, data = null) {
  return { code, message, data }
}

function isValidDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str))
}

async function getCoupleId(openid) {
  const { data } = await users.where({ openid }).get()
  return data[0] ? data[0].coupleId : null
}

async function createAnniversary(openid, event) {
  const { title, date, remark = '' } = event
  if (!title) return resp(UNKNOWN, '标题不能为空')
  if (title.length > 30) return resp(ANNIVERSARY_TITLE_TOO_LONG, '标题最长 30 字')
  if (!date || !isValidDate(date)) return resp(ANNIVERSARY_DATE_INVALID, '日期格式应为 YYYY-MM-DD')
  if (remark.length > 200) return resp(UNKNOWN, '备注最长 200 字')

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const now = Date.now()
  const res = await col.add({
    data: {
      coupleId,
      title,
      date,
      remark,
      createdBy: openid,
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    }
  })

  return resp(OK, '创建成功', { id: res._id })
}

async function updateAnniversary(openid, event) {
  const { id, title, date, remark } = event
  if (!id) return resp(UNKNOWN, '缺少 id')
  if (title && title.length > 30) return resp(ANNIVERSARY_TITLE_TOO_LONG, '标题最长 30 字')
  if (date && !isValidDate(date)) return resp(ANNIVERSARY_DATE_INVALID, '日期格式应为 YYYY-MM-DD')
  if (remark && remark.length > 200) return resp(UNKNOWN, '备注最长 200 字')

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const { data } = await col.where({ _id: id, coupleId, isDeleted: false }).get()
  if (!data.length) return resp(ANNIVERSARY_NOT_FOUND, '纪念日不存在')

  const updateData = { updatedAt: Date.now() }
  if (title !== undefined) updateData.title = title
  if (date !== undefined) updateData.date = date
  if (remark !== undefined) updateData.remark = remark

  await col.doc(id).update({ data: updateData })
  return resp(OK, '更新成功')
}

async function deleteAnniversary(openid, event) {
  const { id } = event
  if (!id) return resp(UNKNOWN, '缺少 id')

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const { data } = await col.where({ _id: id, coupleId, isDeleted: false }).get()
  if (!data.length) return resp(ANNIVERSARY_NOT_FOUND, '纪念日不存在')

  await col.doc(id).update({ data: { isDeleted: true, updatedAt: Date.now() } })
  return resp(OK, '删除成功')
}

async function listAnniversaries(openid) {
  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const { data } = await col
    .where({ coupleId, isDeleted: false })
    .orderBy('date', 'asc')
    .get()

  return resp(OK, 'ok', { list: data })
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) return resp(UNKNOWN, '无法获取用户身份')

  try {
    switch (event.action) {
      case 'createAnniversary': return await createAnniversary(openid, event)
      case 'updateAnniversary': return await updateAnniversary(openid, event)
      case 'deleteAnniversary': return await deleteAnniversary(openid, event)
      case 'listAnniversaries': return await listAnniversaries(openid)
      default: return resp(UNKNOWN, '未知 action')
    }
  } catch (err) {
    console.error('[anniversaries]', err)
    return resp(UNKNOWN, err.message || '服务错误')
  }
}
