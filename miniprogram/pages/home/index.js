// pages/home/index.js
const authUtil = require('../../utils/auth')
const guard = require('../../utils/guard')
const dateUtil = require('../../utils/date')
const photoService = require('../../services/photos')
const annivService = require('../../services/anniversaries')
const msgService = require('../../services/messages')
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
    messages: []
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
      const couple = app.globalData.couple || {}

      // 找 partner
      const partnerOpenid = user.partnerOpenid
      let partner = {}
      if (partnerOpenid) {
        // 同一 couple，另一方信息通过 couple 记录推断
        partner = { nickname: 'TA', avatarUrl: '' }
      }

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
