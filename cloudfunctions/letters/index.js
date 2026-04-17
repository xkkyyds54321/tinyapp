// cloudfunctions/letters/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const col = db.collection('letters')
const users = db.collection('users')

const OK = 0
const UNKNOWN = 1000
const COUPLE_NOT_BOUND = 3006
const LETTER_NOT_FOUND = 8301
const LETTER_STILL_LOCKED = 8302

function resp(code, message, data = null) {
  return { code, message, data }
}

async function getCoupleId(openid) {
  const { data } = await users.where({ openid }).get()
  return data[0] ? data[0].coupleId : null
}

async function createLetter(openid, event) {
  const { title, content, unlockAt } = event
  if (!title || !title.trim()) return resp(UNKNOWN, '请填写标题')
  if (title.length > 30) return resp(UNKNOWN, '标题最长 30 字')
  if (!content || !content.trim()) return resp(UNKNOWN, '请填写内容')
  if (content.length > 2000) return resp(UNKNOWN, '内容最长 2000 字')
  if (!unlockAt || unlockAt <= Date.now()) return resp(UNKNOWN, '解锁日期必须是未来的日期')

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const now = Date.now()
  const res = await col.add({
    data: {
      coupleId,
      authorOpenid: openid,
      title: title.trim(),
      content: content.trim(),
      unlockAt,
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    }
  })
  return resp(OK, '情书已封存', { id: res._id })
}

async function listLetters(openid, event) {
  const { page = 1, pageSize = 20 } = event
  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const { data } = await col
    .where({ coupleId, isDeleted: false })
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  const now = Date.now()
  const list = data.map((l) => {
    const isUnlocked = l.unlockAt <= now
    const daysLeft = isUnlocked ? 0 : Math.ceil((l.unlockAt - now) / 86400000)
    return {
      _id: l._id,
      title: l.title,
      authorOpenid: l.authorOpenid,
      unlockAt: l.unlockAt,
      isUnlocked,
      daysLeft,
      createdAt: l.createdAt,
      // 未解锁不返回正文
      content: isUnlocked ? l.content : null
    }
  })
  return resp(OK, 'ok', { list })
}

async function getLetter(openid, event) {
  const { id } = event
  if (!id) return resp(UNKNOWN, '缺少 id')

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const { data } = await col.where({ _id: id, coupleId, isDeleted: false }).get()
  if (!data.length) return resp(LETTER_NOT_FOUND, '情书不存在')

  const letter = data[0]
  const now = Date.now()
  if (letter.unlockAt > now) {
    const daysLeft = Math.ceil((letter.unlockAt - now) / 86400000)
    return resp(LETTER_STILL_LOCKED, `还有 ${daysLeft} 天解锁`, { daysLeft })
  }

  return resp(OK, 'ok', { ...letter, isUnlocked: true })
}

async function deleteLetter(openid, event) {
  const { id } = event
  if (!id) return resp(UNKNOWN, '缺少 id')

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const { data } = await col.where({ _id: id, coupleId, isDeleted: false }).get()
  if (!data.length) return resp(LETTER_NOT_FOUND, '情书不存在')
  if (data[0].authorOpenid !== openid) return resp(UNKNOWN, '只能删除自己写的情书')

  await col.doc(id).update({ data: { isDeleted: true, updatedAt: Date.now() } })
  return resp(OK, '已删除')
}

exports.main = async (event, context) => {
  const { OPENID: openid } = cloud.getWXContext()
  if (!openid) return resp(UNKNOWN, '无法获取用户身份')
  try {
    switch (event.action) {
      case 'createLetter': return await createLetter(openid, event)
      case 'listLetters': return await listLetters(openid, event)
      case 'getLetter': return await getLetter(openid, event)
      case 'deleteLetter': return await deleteLetter(openid, event)
      default: return resp(UNKNOWN, '未知 action')
    }
  } catch (err) {
    console.error('[letters]', err)
    return resp(UNKNOWN, err.message || '服务错误')
  }
}
