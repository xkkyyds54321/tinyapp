// cloudfunctions/couple/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const couples = db.collection('couples')
const users = db.collection('users')

const OK = 0
const UNKNOWN = 1000
const COUPLE_ALREADY_BOUND = 3002
const COUPLE_FULL = 3003
const COUPLE_CODE_INVALID = 3004
const COUPLE_CODE_EXPIRED = 3005
const COUPLE_NOT_BOUND = 3006

function resp(code, message, data = null) {
  return { code, message, data }
}

// 生成随机绑定码
function generateCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < len; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// 获取当前用户记录
async function getUser(openid) {
  const { data } = await users.where({ openid }).get()
  return data[0] || null
}

// 创建情侣空间
async function createCouple(openid) {
  const now = Date.now()
  const user = await getUser(openid)
  if (!user) return resp(UNKNOWN, '用户不存在')

  // 已有 active 绑定禁止再创建
  if (user.coupleId) {
    const existing = await couples.doc(user.coupleId).get().catch(() => ({ data: null }))
    if (existing.data && existing.data.status === 'active') {
      return resp(COUPLE_ALREADY_BOUND, '你已有情侣空间，无法重复创建')
    }
  }

  // 生成唯一绑定码
  let code, exists
  do {
    code = generateCode()
    const res = await couples.where({ code, status: 'pending' }).get()
    exists = res.data.length > 0
  } while (exists)

  const addRes = await couples.add({
    data: {
      code,
      memberAOpenid: openid,
      memberBOpenid: null,
      status: 'pending',
      createdAt: now,
      boundAt: null,
      updatedAt: now
    }
  })

  const coupleId = addRes._id

  // 更新用户的 coupleId
  await users.doc(user._id).update({
    data: { coupleId, updatedAt: now }
  })

  return resp(OK, 'ok', { coupleId, code })
}

// 使用绑定码加入情侣空间
async function joinCouple(openid, code) {
  if (!code) return resp(COUPLE_CODE_INVALID, '请输入绑定码')
  const now = Date.now()
  const user = await getUser(openid)
  if (!user) return resp(UNKNOWN, '用户不存在')

  // 已有 active 绑定
  if (user.coupleId) {
    const existing = await couples.doc(user.coupleId).get().catch(() => ({ data: null }))
    if (existing.data && existing.data.status === 'active') {
      return resp(COUPLE_ALREADY_BOUND, '你已绑定情侣空间')
    }
  }

  // 查找绑定码
  const { data } = await couples.where({ code: code.toUpperCase(), status: 'pending' }).get()
  if (!data || data.length === 0) {
    return resp(COUPLE_CODE_INVALID, '绑定码无效或已失效')
  }

  const couple = data[0]

  // 检查是否过期（7天）
  const expireDays = 7
  if (now - couple.createdAt > expireDays * 86400000) {
    await couples.doc(couple._id).update({ data: { status: 'expired', updatedAt: now } })
    return resp(COUPLE_CODE_EXPIRED, '绑定码已过期')
  }

  // 不能绑定自己（测试时可临时注释掉这段）
  // if (couple.memberAOpenid === openid) {
  //   return resp(COUPLE_CODE_INVALID, '不能绑定自己')
  // }

  // 已满员
  if (couple.memberBOpenid) {
    return resp(COUPLE_FULL, '该情侣空间已满')
  }

  const coupleId = couple._id

  // 更新情侣空间
  await couples.doc(coupleId).update({
    data: {
      memberBOpenid: openid,
      status: 'active',
      boundAt: now,
      updatedAt: now
    }
  })

  // 更新双方用户信息
  await Promise.all([
    users.where({ openid: couple.memberAOpenid }).update({
      data: { coupleId, partnerOpenid: openid, updatedAt: now }
    }),
    users.where({ openid }).update({
      data: { coupleId, partnerOpenid: couple.memberAOpenid, updatedAt: now }
    })
  ])

  const updatedCouple = await couples.doc(coupleId).get()
  return resp(OK, '绑定成功', { couple: updatedCouple.data })
}

// 获取当前情侣信息
async function getCurrentCouple(openid) {
  const user = await getUser(openid)
  if (!user || !user.coupleId) {
    return resp(COUPLE_NOT_BOUND, '尚未绑定情侣空间', { isBound: false })
  }

  const coupleRes = await couples.doc(user.coupleId).get().catch(() => ({ data: null }))
  if (!coupleRes.data) {
    return resp(COUPLE_NOT_BOUND, '情侣空间不存在', { isBound: false })
  }

  return resp(OK, 'ok', { couple: coupleRes.data, isBound: coupleRes.data.status === 'active' })
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) return resp(UNKNOWN, '无法获取用户身份')

  try {
    switch (event.action) {
      case 'createCouple': return await createCouple(openid)
      case 'joinCouple': return await joinCouple(openid, event.code)
      case 'getCurrentCouple': return await getCurrentCouple(openid)
      default: return resp(UNKNOWN, '未知 action')
    }
  } catch (err) {
    console.error('[couple]', err)
    return resp(UNKNOWN, err.message || '服务错误')
  }
}
