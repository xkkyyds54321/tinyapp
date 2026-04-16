// utils/guard.js - 路由守卫
/**
 * 检查用户是否已绑定情侣空间，未绑定则跳转 bind 页
 * 在各页面 onLoad/onShow 中调用
 */
function requireBound() {
  const app = getApp()
  if (!app.globalData.isBound) {
    wx.redirectTo({ url: '/pages/bind/index' })
    return false
  }
  return true
}

/**
 * 检查是否已登录（有 userInfo）
 */
function requireLogin() {
  const app = getApp()
  return !!app.globalData.userInfo
}

module.exports = { requireBound, requireLogin }
