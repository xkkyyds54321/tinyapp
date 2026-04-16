// pages/home/index.js
const authUtil = require('../../utils/auth')
const dateUtil = require('../../utils/date')
const photoService = require('../../services/photos')
const annivService = require('../../services/anniversaries')
const msgService = require('../../services/messages')
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
    photos: [],
    anniversaries: [],
    messages: [],
    changingCover: false
  },

  async onShow() {
    await this.loadData()
  },

  async loadData() {
    this.setData({ loading: true, error: '' })
    try {
      const data = await authUtil.bootstrap()

      // 云函数未部署时给出明确提示
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

      // 计算在一起天数
      let togetherDays = 0
      if (couple.boundAt) {
        togetherDays = Math.floor((Date.now() - couple.boundAt) / 86400000)
      }

      // 并行拉取数据
      const [photosRes, annivRes, msgRes] = await Promise.all([
        photoService.listPhotos({ page: 1, pageSize: 6 }),
        annivService.listAnniversaries(),
        msgService.listMessages({ page: 1, pageSize: 3 })
      ])

      // 纪念日 label
      const anniversaries = (annivRes.list || []).slice(0, 3).map((a) => {
        const { label, days } = dateUtil.anniversaryLabel(a.date)
        return { ...a, label, days }
      })

      // 留言相对时间
      const messages = (msgRes.list || []).map((m) => ({
        ...m,
        timeLabel: dateUtil.relativeTime(m.createdAt)
      }))

      this.setData({
        loading: false,
        user,
        partner,
        couple,
        togetherDays,
        photos: photosRes.list || [],
        anniversaries,
        messages
      })
    } catch (err) {
      this.setData({ loading: false, error: err.message || '加载失败' })
    }
  },

  // 点击背景图更换封面
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

      // 压缩
      const compressedPath = await new Promise((resolve) => {
        wx.compressImage({
          src: filePath,
          quality: 80,
          success: (r) => resolve(r.tempFilePath),
          fail: () => resolve(filePath)
        })
      })

      // 上传到微信云存储
      const cloudPath = `covers/couple_${Date.now()}.jpg`
      const uploadRes = await new Promise((resolve, reject) => {
        wx.cloud.uploadFile({
          cloudPath,
          filePath: compressedPath,
          success: resolve,
          fail: (err) => reject(new Error(err.errMsg || '上传失败'))
        })
      })

      // 保存到 couple 记录
      await coupleService.updateCover(uploadRes.fileID)

      // 刷新全局 couple 并更新页面
      const refreshed = await authUtil.refresh()
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

  // 点击「在一起 x 天」进入详情
  goDetail() {
    wx.navigateTo({ url: '/pages/couple-detail/index' })
  },

  goGallery() {
    wx.switchTab({ url: '/pages/gallery/index' })
  },

  goAnniversaries() {
    wx.switchTab({ url: '/pages/anniversaries/index' })
  },

  goMessages() {
    wx.switchTab({ url: '/pages/messages/index' })
  }
})
