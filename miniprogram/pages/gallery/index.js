// pages/gallery/index.js
const photoService = require('../../services/photos')
const authUtil = require('../../utils/auth')
const dateUtil = require('../../utils/date')
const toast = require('../../utils/toast')

Page({
  data: {
    list: [],
    loading: false,
    loadingMore: false,
    error: '',
    page: 1,
    pageSize: 20,
    hasMore: true,
    filterMonth: '',
    uploading: false,
    uploadProgress: 0
  },

  async onShow() {
    const data = await authUtil.bootstrap()
    if (!data.isBound) {
      wx.navigateTo({ url: '/pages/bind/index' })
      return
    }
    await this.reload()
  },

  async reload() {
    this.setData({ page: 1, list: [], hasMore: true, error: '' })
    await this.fetchPhotos()
  },

  async fetchPhotos() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const { page, pageSize, filterMonth } = this.data
      const params = { page, pageSize }
      if (filterMonth) params.month = filterMonth.replace('-', '/')
      const res = await photoService.listPhotos(params)
      const newList = (res.list || []).map((p) => ({
        ...p,
        thumbUrl: p.fileID || '',
        timeLabel: dateUtil.formatTimestamp(p.takenAt || p.createdAt, 'MM-DD')
      }))
      this.setData({
        list: page === 1 ? newList : [...this.data.list, ...newList],
        hasMore: newList.length === pageSize
      })
    } catch (err) {
      this.setData({ error: err.message })
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadMore() {
    if (!this.data.hasMore || this.data.loadingMore) return
    this.setData({ loadingMore: true, page: this.data.page + 1 })
    await this.fetchPhotos()
    this.setData({ loadingMore: false })
  },

  onMonthChange(e) {
    const month = e.detail.value // YYYY-MM
    this.setData({ filterMonth: month })
    this.reload()
  },

  async onUpload() {
    if (this.data.uploading) return
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
      const filename = filePath.split('/').pop() || `photo_${Date.now()}.jpg`
      const mimeType = 'image/jpeg'

      this.setData({ uploading: true, uploadProgress: 0 })

      // 压缩图片（质量 80%，长边限制 1920px）
      const compressedPath = await new Promise((resolve) => {
        wx.compressImage({
          src: filePath,
          quality: 80,
          success: (r) => resolve(r.tempFilePath),
          fail: () => resolve(filePath) // 压缩失败则用原图
        })
      })

      // 1. 获取上传凭证（cosKey、photoId）
      const ticket = await photoService.createUploadTicket({
        filename,
        mimeType,
        size: file.size || 0,
        takenAt: null
      })

      // 2. 上传压缩后的图片到微信云存储
      const uploadRes = await photoService.uploadToCOS(ticket, compressedPath, (progress) => {
        this.setData({ uploadProgress: progress })
      })

      // 3. 确认上传，把 fileID 一并传给云函数写库
      await photoService.confirmUpload({
        photoId: ticket.photoId,
        cosKey: ticket.cosKey,
        thumbnailKey: ticket.thumbnailKey,
        fileID: uploadRes.fileID || '',
        originalName: filename,
        size: file.size || 0,
        mimeType,
        width: file.width || 0,
        height: file.height || 0,
        takenAt: null
      })

      toast.showSuccess('上传成功')
      await this.reload()
    } catch (err) {
      toast.showError(err.message || '上传失败，请重试')
    } finally {
      this.setData({ uploading: false, uploadProgress: 0 })
    }
  },

  onPhotoTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/gallery/detail?id=${id}` })
  },

  goRecycle() {
    wx.navigateTo({ url: '/pages/gallery/recycle' })
  }
})
