// pages/profile/index.js
const authUtil = require('../../utils/auth')
const exportService = require('../../services/exports')
const photoService = require('../../services/photos')
const dateUtil = require('../../utils/date')
const toast = require('../../utils/toast')

Page({
  data: {
    user: {},
    couple: null,
    togetherDays: 0,
    boundAtText: '',
    storageInfo: null
  },

  async onShow() {
    const data = await authUtil.bootstrap()
    if (!data.isBound) {
      wx.navigateTo({ url: '/pages/bind/index' })
      return
    }
    const app = getApp()
    const user = app.globalData.userInfo || {}
    const couple = app.globalData.couple || null

    let togetherDays = 0
    let boundAtText = ''
    if (couple && couple.boundAt) {
      togetherDays = Math.floor((Date.now() - couple.boundAt) / 86400000)
      boundAtText = dateUtil.formatTimestamp(couple.boundAt, 'YYYY-MM-DD')
    }

    this.setData({ user, couple, togetherDays, boundAtText })
    this.loadStorageInfo()
  },

  async loadStorageInfo() {
    try {
      const [allRes, recycleRes] = await Promise.all([
        photoService.listPhotos({ page: 1, pageSize: 1 }),
        photoService.listRecycleBin({ page: 1, pageSize: 1 })
      ])
      this.setData({
        storageInfo: {
          total: allRes.total || 0,
          deleted: recycleRes.total || 0
        }
      })
    } catch (e) {}
  },

  goRecycle() {
    wx.navigateTo({ url: '/pages/gallery/recycle' })
  },

  async onExport() {
    const confirmed = await toast.showModal({
      title: '导出数据',
      content: '将导出情侣空间的所有元数据（照片清单、纪念日、留言等）到 COS，稍后可下载',
      confirmText: '开始导出'
    })
    if (!confirmed) return

    toast.showLoading('导出中...')
    try {
      const res = await exportService.createExportJob()
      toast.hideLoading()
      const confirmed2 = await toast.showModal({
        title: '导出成功',
        content: '数据已导出，点击确定可复制下载链接',
        confirmText: '复制链接'
      })
      if (confirmed2 && res.downloadUrl) {
        wx.setClipboardData({
          data: res.downloadUrl,
          success: () => toast.showSuccess('链接已复制')
        })
      }
    } catch (err) {
      toast.hideLoading()
      toast.showError(err.message)
    }
  }
})
