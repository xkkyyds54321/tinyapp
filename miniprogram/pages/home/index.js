// pages/home/index.js
const authUtil = require('../../utils/auth')
const dateUtil = require('../../utils/date')
const coupleService = require('../../services/couple')
const toast = require('../../utils/toast')

Page({
  data: {
    loading: true,
    error: '',
    user: {},
    partner: {},
    couple: null,
    togetherDays: 0,
    changingCover: false,
    statusBarHeight: 20
  },

  onLoad() {
    try {
      const info = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: info.statusBarHeight || 20 })
    } catch (e) {}
  },

  async onShow() {
    await this.loadData()
  },

  async loadData() {
    this.setData({ loading: true, error: '' })
    try {
      const data = await authUtil.bootstrap()

      if (data.cloudError) {
        this.setData({ loading: false, error: '云函数尚未部署，请在微信开发者工具中右键 cloudfunctions/auth → 上传并部署' })
        return
      }

      if (!data.isBound) {
        wx.navigateTo({ url: '/pages/bind/index' })
        return
      }

      const app = getApp()
      const user = app.globalData.userInfo || {}
      const partner = app.globalData.partnerInfo || {}
      const couple = app.globalData.couple || {}

      let togetherDays = 0
      if (couple.boundAt) {
        togetherDays = Math.floor((Date.now() - couple.boundAt) / 86400000)
      }

      this.setData({ loading: false, user, partner, couple, togetherDays })
    } catch (err) {
      this.setData({ loading: false, error: err.message || '加载失败' })
    }
  },

  async onChangeCover() {
    if (this.data.changingCover) return
    try {
      const res = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          success: resolve,
          fail: reject
        })
      })

      const file = res.tempFiles[0]
      const filePath = file.tempFilePath

      this.setData({ changingCover: true })
      toast.showLoading('上传中...')

      const compressedPath = await new Promise((resolve) => {
        wx.compressImage({
          src: filePath,
          quality: 80,
          success: (r) => resolve(r.tempFilePath),
          fail: () => resolve(filePath)
        })
      })

      const cloudPath = `covers/couple_${Date.now()}.jpg`
      const uploadRes = await new Promise((resolve, reject) => {
        wx.cloud.uploadFile({
          cloudPath,
          filePath: compressedPath,
          success: resolve,
          fail: (err) => reject(new Error(err.errMsg || '上传失败'))
        })
      })

      await coupleService.updateCover(uploadRes.fileID)
      await authUtil.refresh()
      const couple = getApp().globalData.couple || {}
      this.setData({ couple })

      wx.hideLoading()
      toast.showSuccess('封面已更换')
    } catch (err) {
      wx.hideLoading()
      if (err.message !== 'chooseMedia:fail cancel') {
        toast.showError(err.message || '更换失败，请重试')
      }
    } finally {
      this.setData({ changingCover: false })
    }
  },

  goDetail() {
    wx.navigateTo({ url: '/pages/couple-detail/index' })
  },

  goTrack() {
    wx.navigateTo({ url: '/pages/track/index' })
  },

  goQuiz() {
    wx.navigateTo({ url: '/pages/quiz/index' })
  },

  goBucket() {
    wx.navigateTo({ url: '/pages/bucket/index' })
  },

  goLetters() {
    wx.navigateTo({ url: '/pages/letters/index' })
  }
})
