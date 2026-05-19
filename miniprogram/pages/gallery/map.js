// pages/gallery/map.js
const photoService = require('../../services/photos')
const authUtil = require('../../utils/auth')
const dateUtil = require('../../utils/date')
const toast = require('../../utils/toast')

Page({
  data: {
    loading: true,
    markers: [],
    latitude: 39.9042,
    longitude: 116.4074,
    scale: 12,
    // 选中的照片（点击 marker 后展示）
    selectedPhoto: null
  },

  async onLoad() {
    const data = await authUtil.bootstrap()
    if (!data.isBound) {
      wx.navigateTo({ url: '/pages/bind/index' })
      return
    }
    await this.loadPhotos()
  },

  async loadPhotos() {
    this.setData({ loading: true })
    try {
      const res = await photoService.listPhotosWithLocation()
      const photos = res.list || []

      if (!photos.length) {
        this.setData({ loading: false, markers: [] })
        return
      }

      // 计算地图中心
      const avgLat = photos.reduce((s, p) => s + p.location.latitude, 0) / photos.length
      const avgLng = photos.reduce((s, p) => s + p.location.longitude, 0) / photos.length

      const markers = photos.map((p, idx) => ({
        id: idx,
        _id: p._id,
        latitude: p.location.latitude,
        longitude: p.location.longitude,
        fileID: p.fileID,
        createdAt: p.createdAt,
        width: 60,
        height: 60,
        iconPath: p.fileID || '/assets/default-avatar.png',
        callout: {
          content: dateUtil.formatTimestamp(p.takenAt || p.createdAt, 'MM-DD'),
          color: '#333',
          fontSize: 12,
          borderRadius: 6,
          bgColor: '#fff',
          padding: 6,
          display: 'BYCLICK'
        }
      }))

      this.setData({
        loading: false,
        markers,
        latitude: avgLat,
        longitude: avgLng
      })
    } catch (err) {
      this.setData({ loading: false })
      toast.showError(err.message)
    }
  },

  onMarkerTap(e) {
    const markerId = e.markerId
    const marker = this.data.markers.find(m => m.id === markerId)
    if (!marker) return
    this.setData({
      selectedPhoto: {
        _id: marker._id,
        fileID: marker.fileID,
        timeText: dateUtil.formatTimestamp(marker.createdAt)
      }
    })
  },

  onClosePreview() {
    this.setData({ selectedPhoto: null })
  },

  goDetail() {
    if (!this.data.selectedPhoto) return
    wx.navigateTo({ url: `/pages/gallery/detail?id=${this.data.selectedPhoto._id}` })
  }
})
