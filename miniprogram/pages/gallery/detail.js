// pages/gallery/detail.js
const photoService = require('../../services/photos')
const dateUtil = require('../../utils/date')
const toast = require('../../utils/toast')

Page({
  data: {
    loading: true,
    error: '',
    photo: null,
    thumbUrl: '',
    originalUrl: '',
    uploadedBySelf: false,
    timeText: '',
    sizeText: ''
  },

  async onLoad(options) {
    const { id } = options
    if (!id) {
      this.setData({ loading: false, error: '缺少照片 ID' })
      return
    }
    await this.loadDetail(id)
  },

  async loadDetail(id) {
    this.setData({ loading: true })
    try {
      const res = await photoService.getPhotoDetail(id)
      const app = getApp()
      const openid = app.globalData.userInfo ? app.globalData.userInfo.openid : ''
      const photo = res.photo

      let sizeText = ''
      if (photo.size) {
        sizeText = photo.size > 1024 * 1024
          ? `${(photo.size / 1024 / 1024).toFixed(1)} MB`
          : `${(photo.size / 1024).toFixed(0)} KB`
      }

      this.setData({
        loading: false,
        photo,
        thumbUrl: res.thumbUrl,
        originalUrl: res.originalUrl,
        uploadedBySelf: photo.uploadedBy === openid,
        timeText: dateUtil.formatTimestamp(photo.takenAt || photo.createdAt),
        sizeText
      })
    } catch (err) {
      this.setData({ loading: false, error: err.message })
    }
  },

  onPreview() {
    const url = this.data.originalUrl || this.data.thumbUrl
    if (!url) return
    wx.previewImage({ urls: [url], current: url })
  },

  async onDelete() {
    const confirmed = await toast.showModal({
      title: '移入回收站',
      content: '照片将移入回收站，可以在回收站恢复',
      confirmText: '移入回收站'
    })
    if (!confirmed) return

    try {
      await photoService.deletePhoto(this.data.photo._id)
      toast.showSuccess('已移入回收站')
      wx.navigateBack()
    } catch (err) {
      toast.showError(err.message)
    }
  }
})
