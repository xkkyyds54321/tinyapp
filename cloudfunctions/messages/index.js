// cloudfunctions/messages/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const col = db.collection('messages')
const users = db.collection('users')

const OK = 0
const UNKNOWN = 1000
const COUPLE_NOT_BOUND = 3006
const MESSAGE_NOT_FOUND = 6001
const MESSAGE_TOO_LONG = 6002
const MESSAGE_FORBIDDEN_DELETE = 6003

function resp(code, message, data = null) {
  return { code, message, data }
}

async function getCoupleId(openid) {
  const { data } = await users.where({ openid }).get()
  return data[0] ? data[0].coupleId : null
}

async function createMessage(openid, event) {
  const { content } = event
  if (!content || !content.trim()) return resp(UNKNOWN, '留言内容不能为空')
  if (content.length > 300) return resp(MESSAGE_TOO_LONG, '留言最长 300 字')

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const now = Date.now()
  const res = await col.add({
    data: {
      coupleId,
      senderOpenid: openid,
      content: content.trim(),
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    }
  })

  return resp(OK, '发送成功', { id: res._id })
}

async function listMessages(openid, event) {
  const { page = 1, pageSize = 20 } = event

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const query = col.where({ coupleId, isDeleted: false })
  const total = await query.count()
  const { data } = await query
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return resp(OK, 'ok', { list: data, total: total.total, page, pageSize })
}

async function deleteMessage(openid, event) {
  const { id } = event
  if (!id) return resp(UNKNOWN, '缺少 id')

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const { data } = await col.where({ _id: id, coupleId, isDeleted: false }).get()
  if (!data.length) return resp(MESSAGE_NOT_FOUND, '留言不存在')

  // 只能删除自己的留言
  if (data[0].senderOpenid !== openid) {
    return resp(MESSAGE_FORBIDDEN_DELETE, '只能删除自己发送的留言')
  }

  await col.doc(id).update({ data: { isDeleted: true, updatedAt: Date.now() } })
  return resp(OK, '删除成功')
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) return resp(UNKNOWN, '无法获取用户身份')

  try {
    switch (event.action) {
      case 'createMessage': return await createMessage(openid, event)
      case 'listMessages': return await listMessages(openid, event)
      case 'deleteMessage': return await deleteMessage(openid, event)
      default: return resp(UNKNOWN, '未知 action')
    }
  } catch (err) {
    console.error('[messages]', err)
    return resp(UNKNOWN, err.message || '服务错误')
  }
}
