// app.js
App({
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: require('./config/env').ENV_ID,
        traceUser: true
      })
    }

    // 缓存全局状态
    this.globalData = {
      userInfo: null,
      couple: null,
      isBound: false
    }
  },

  // 设置全局用户信息
  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo
  },

  // 设置情侣绑定信息
  setCoupleInfo(couple, isBound) {
    this.globalData.couple = couple
    this.globalData.isBound = isBound
  }
})
