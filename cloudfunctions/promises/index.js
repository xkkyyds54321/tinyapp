// cloudfunctions/promises/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const col = db.collection('promises')
const users = db.collection('users')

const OK = 0
const UNKNOWN = 1000
const COUPLE_NOT_BOUND = 3006
const PROMISE_NOT_FOUND = 9201

function resp(code, message, data = null) {
  return { code, message, data }
}

async function getCoupleId(openid) {
  const { data } = await users.where({ openid }).get()
  return data[0] ? data[0].coupleId : null
}

async function createPromise(openid, event) {
  const { content, dueDate } = event
  const text = (content || '').trim()
  if (!text) return resp(UNKNOWN, '请填写约定内容')
  if (text.length > 100) return resp(UNKNOWN, '内容最长100字')

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const now = Date.now()
  const res = await col.add({
    data: {
      coupleId,
      createdBy: openid,
      content: text,
      isDone: false,
      doneAt: null,
      doneBy: null,
      dueDate: dueDate || null,
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    }
  })
  return resp(OK, '已创建', { id: res._id })
}

async function listPromises(openid, event) {
  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const { data } = await col
    .where({ coupleId, isDeleted: false })
    .orderBy('isDone', 'asc')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get()

  const openids = [...new Set([...data.map(p => p.createdBy), ...data.map(p => p.doneBy).filter(Boolean)])]
  const usersRes = await users.where({ openid: _.in(openids) }).get()
  const userMap = {}
  usersRes.data.forEach(u => { userMap[u.openid] = u })

  const getName = (oid) => {
    if (!oid) return ''
    if (oid === openid) return '我'
    return (userMap[oid] && userMap[oid].nickname) || 'TA'
  }

  const list = data.map(p => ({
    ...p,
    isMine: p.createdBy === openid,
    creatorName: getName(p.createdBy),
    doneByName: getName(p.doneBy)
  }))

  return resp(OK, 'ok', { list })
}

async function togglePromise(openid, event) {
  const { id } = event
  if (!id) return resp(UNKNOWN, '缺少 id')

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const { data } = await col.where({ _id: id, coupleId, isDeleted: false }).get()
  if (!data.length) return resp(PROMISE_NOT_FOUND, '约定不存在')

  const promise = data[0]
  const now = Date.now()

  if (promise.isDone) {
    // 撤销完成：只有创建者或完成者可以撤销
    if (promise.createdBy !== openid && promise.doneBy !== openid) {
      return resp(UNKNOWN, '无权操作')
    }
    await col.doc(id).update({ data: { isDone: false, doneAt: null, doneBy: null, updatedAt: now } })
    return resp(OK, '已撤销')
  } else {
    await col.doc(id).update({ data: { isDone: true, doneAt: now, doneBy: openid, updatedAt: now } })
    return resp(OK, '已完成 🎉')
  }
}

async function deletePromise(openid, event) {
  const { id } = event
  if (!id) return resp(UNKNOWN, '缺少 id')

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const { data } = await col.where({ _id: id, coupleId, isDeleted: false }).get()
  if (!data.length) return resp(PROMISE_NOT_FOUND, '约定不存在')
  if (data[0].createdBy !== openid) return resp(UNKNOWN, '只能删除自己创建的约定')

  await col.doc(id).update({ data: { isDeleted: true, updatedAt: Date.now() } })
  return resp(OK, '已删除')
}

exports.main = async (event, context) => {
  const { OPENID: openid } = cloud.getWXContext()
  if (!openid) return resp(UNKNOWN, '无法获取用户身份')
  try {
    switch (event.action) {
      case 'createPromise': return await createPromise(openid, event)
      case 'listPromises': return await listPromises(openid, event)
      case 'togglePromise': return await togglePromise(openid, event)
      case 'deletePromise': return await deletePromise(openid, event)
      default: return resp(UNKNOWN, '未知 action')
    }
  } catch (err) {
    console.error('[promises]', err)
    return resp(UNKNOWN, err.message || '服务错误')
  }
}
