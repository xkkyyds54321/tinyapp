// pages/home/index.js
const authUtil = require('../../utils/auth')
const dateUtil = require('../../utils/date')
const coupleService = require('../../services/couple')
const anniversaryService = require('../../services/anniversaries')
const toast = require('../../utils/toast')
const { ANNIVERSARY_REMIND_DAYS, MILESTONE_DAYS } = require('../../config/constants')

Page({
  data: {
    loading: true,
    error: '',
    user: {},
    partner: {},
    couple: null,
    togetherDays: 0,
    milestoneText: '',
    changingCover: false,
    statusBarHeight: 20,
    upcomingAnniversaries: []
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

      const milestoneText = this._getMilestoneText(togetherDays)

      this.setData({ loading: false, user, partner, couple, togetherDays, milestoneText })

      // 异步加载纪念日提醒（不阻塞主流程）
      this._loadAnniversaryReminders()
    } catch (err) {
      this.setData({ loading: false, error: err.message || '加载失败' })
    }
  },

  _getMilestoneText(days) {
    if (MILESTONE_DAYS.includes(days)) {
      if (days === 365) return '🎊 恭喜你们在一起满 1 周年！'
      if (days === 730) return '🎊 恭喜你们在一起满 2 周年！'
      if (days === 1095) return '🎊 恭喜你们在一起满 3 周年！'
      if (days === 1825) return '🎊 恭喜你们在一起满 5 周年！'
      return `🎉 恭喜你们在一起满 ${days} 天！`
    }
    return ''
  },

  async _loadAnniversaryReminders() {
    try {
      const res = await anniversaryService.listAnniversaries()
      const list = res.list || res || []
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const upcoming = list.filter(ann => {
        if (ann.isDeleted) return false
        const d = new Date(ann.date)
        const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate())
        const daysLeft = Math.ceil((thisYear.getTime() - today.getTime()) / 86400000)
        if (daysLeft >= 0 && daysLeft <= ANNIVERSARY_REMIND_DAYS) {
          ann._daysLeft = daysLeft
          return true
        }
        // 检查明年（当年已过）
        const nextYear = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate())
        const daysLeftNextYear = Math.ceil((nextYear.getTime() - today.getTime()) / 86400000)
        if (daysLeftNextYear <= ANNIVERSARY_REMIND_DAYS) {
          ann._daysLeft = daysLeftNextYear
          return true
        }
        return false
      }).slice(0, 3)

      this.setData({ upcomingAnniversaries: upcoming })
    } catch (e) {}
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
  },

  goMood() {
    wx.navigateTo({ url: '/pages/mood/index' })
  },

  goPromises() {
    wx.navigateTo({ url: '/pages/promises/index' })
  },

  goBills() {
    wx.navigateTo({ url: '/pages/bills/index' })
  },

  goAnniversaries() {
    wx.switchTab({ url: '/pages/anniversaries/index' })
  }
})
