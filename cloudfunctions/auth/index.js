// cloudfunctions/auth/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const users = db.collection('users')

const OK = 0
const UNKNOWN = 1000

function resp(code, message, data = null) {
  return { code, message, data }
}

// bootstrap: 获取或创建当前用户，返回绑定状态
async function bootstrap(openid) {
  const now = Date.now()

  // 查找用户
  const { data } = await users.where({ openid }).get()
  let user = data[0]

  if (!user) {
    // 首次登录，创建用户
    const res = await users.add({
      data: {
        openid,
        nickname: '',
        avatarUrl: '',
        partnerOpenid: null,
        coupleId: null,
        createdAt: now,
        updatedAt: now
      }
    })
    user = {
      _id: res._id,
      openid,
      nickname: '',
      avatarUrl: '',
      partnerOpenid: null,
      coupleId: null,
      createdAt: now,
      updatedAt: now
    }
  }

  let couple = null
  let isBound = false

  if (user.coupleId) {
    const coupleRes = await db.collection('couples').doc(user.coupleId).get().catch(() => ({ data: null }))
    couple = coupleRes.data
    isBound = couple && couple.status === 'active'
  }

  return resp(OK, 'ok', { user, couple, isBound })
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) return resp(UNKNOWN, '无法获取用户身份')

  try {
    switch (event.action) {
      case 'bootstrap':
        return await bootstrap(openid)
      default:
        return resp(UNKNOWN, '未知 action')
    }
  } catch (err) {
    console.error('[auth]', err)
    return resp(UNKNOWN, err.message || '服务错误')
  }
}
