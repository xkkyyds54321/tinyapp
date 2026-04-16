// utils/auth.js - 登录态工具（缓存 bootstrap 结果）
const request = require('./request')

let bootstrapPromise = null

/**
 * 初始化登录态，全局只执行一次
 * 返回 { user, couple, isBound }
 * 云函数未部署时返回 { user: null, couple: null, isBound: false, cloudError: true }
 */
async function bootstrap(forceRefresh = false) {
  if (bootstrapPromise && !forceRefresh) return bootstrapPromise
  bootstrapPromise = request.auth({ action: 'bootstrap' })
    .then((data) => {
      const app = getApp()
      app.setUserInfo(data.user)
      app.setPartnerInfo(data.partner || null)
      app.setCoupleInfo(data.couple, data.isBound)
      return data
    })
    .catch((err) => {
      bootstrapPromise = null
      // 云函数未找到时，返回未绑定状态而不是抛出异常，避免页面崩溃
      const msg = err.message || ''
      if (msg.includes('FunctionName') || msg.includes('FUNCTION_NOT_FOUND') || msg.includes('timeout')) {
        console.warn('[auth] 云函数未部署或超时，请先在开发者工具上传云函数:', err.message)
        return { user: null, couple: null, isBound: false, cloudError: true }
      }
      throw err
    })
  return bootstrapPromise
}

/**
 * 刷新状态（重新 bootstrap）
 */
function refresh() {
  return bootstrap(true)
}

module.exports = { bootstrap, refresh }
