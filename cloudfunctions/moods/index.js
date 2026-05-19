// cloudfunctions/moods/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const col = db.collection('moods')
const users = db.collection('users')

const OK = 0
const UNKNOWN = 1000
const COUPLE_NOT_BOUND = 3006
const MOOD_NOT_FOUND = 9001

function resp(code, message, data = null) {
  return { code, message, data }
}

async function getCoupleId(openid) {
  const { data } = await users.where({ openid }).get()
  return data[0] ? data[0].coupleId : null
}

function dateKey(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function createMood(openid, event) {
  const { mood, content } = event
  if (!mood) return resp(UNKNOWN, '请选择心情')
  const text = (content || '').trim()
  if (text.length > 200) return resp(UNKNOWN, '内容最长200字')

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const now = Date.now()
  const res = await col.add({
    data: {
      coupleId,
      openid,
      mood,
      content: text,
      dateKey: dateKey(now),
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    }
  })
  return resp(OK, '已记录', { id: res._id })
}

async function listMoods(openid, event) {
  const { page = 1, pageSize = 30 } = event
  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const query = col.where({ coupleId, isDeleted: false })
  const total = await query.count()
  const { data } = await query
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  // 批量查询用户信息
  const openids = [...new Set(data.map(m => m.openid))]
  const usersRes = await users.where({ openid: db.command.in(openids) }).get()
  const userMap = {}
  usersRes.data.forEach(u => { userMap[u.openid] = u })

  const list = data.map(m => ({
    ...m,
    isMine: m.openid === openid,
    nickname: (userMap[m.openid] && userMap[m.openid].nickname) || (m.openid === openid ? '我' : 'TA')
  }))

  return resp(OK, 'ok', { list, total: total.total, page, pageSize })
}

async function deleteMood(openid, event) {
  const { id } = event
  if (!id) return resp(UNKNOWN, '缺少 id')

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const { data } = await col.where({ _id: id, coupleId, isDeleted: false }).get()
  if (!data.length) return resp(MOOD_NOT_FOUND, '记录不存在')
  if (data[0].openid !== openid) return resp(UNKNOWN, '只能删除自己的记录')

  await col.doc(id).update({ data: { isDeleted: true, updatedAt: Date.now() } })
  return resp(OK, '已删除')
}

exports.main = async (event, context) => {
  const { OPENID: openid } = cloud.getWXContext()
  if (!openid) return resp(UNKNOWN, '无法获取用户身份')
  try {
    switch (event.action) {
      case 'createMood': return await createMood(openid, event)
      case 'listMoods': return await listMoods(openid, event)
      case 'deleteMood': return await deleteMood(openid, event)
      default: return resp(UNKNOWN, '未知 action')
    }
  } catch (err) {
    console.error('[moods]', err)
    return resp(UNKNOWN, err.message || '服务错误')
  }
}
