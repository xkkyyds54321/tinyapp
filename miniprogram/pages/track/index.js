const trackService = require('../../services/track')
const authUtil = require('../../utils/auth')
const toast = require('../../utils/toast')

const REPORT_INTERVAL = 30000
const POLL_INTERVAL = 30000

Page({
  data: {
    tab: 'realtime',
    myLocation: null,
    partnerLocation: null,
    partnerUpdatedText: '',
    trackPoints: [],
    markers: [],
    polyline: [],
    mapCenter: { latitude: 39.9042, longitude: 116.4074 },
    scale: 14,
    locationGranted: false,
    loading: false
  },

  _reportTimer: null,
  _pollTimer: null,

  async onLoad() {
    const data = await authUtil.bootstrap()
    if (!data.isBound) {
      wx.navigateTo({ url: '/pages/bind/index' })
      return
    }
    await this.requestPermission()
  },

  onUnload() {
    this._stopAll()
  },

  onHide() {
    this._stopAll()
  },

  async onShow() {
    if (this.data.locationGranted) {
      this._startTracking()
    }
  },

  async requestPermission() {
    try {
      await new Promise((resolve, reject) => {
        wx.getLocation({
          type: 'gcj02',
          success: resolve,
          fail: reject
        })
      })
      this.setData({ locationGranted: true })
      this._startTracking()
    } catch (e) {
      wx.showModal({
        title: '需要位置权限',
        content: '请在设置中开启位置权限，才能使用情侣轨迹功能',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) wx.openSetting()
        }
      })
    }
  },

  _startTracking() {
    this._stopAll()
    wx.onLocationChange(this._onLocationChange.bind(this))
    try {
      wx.startLocationUpdateBackground({ type: 'gcj02' })
    } catch (e) {
      wx.startLocationUpdate({ type: 'gcj02' })
    }
    this._pollTimer = setInterval(() => this._pollPartner(), POLL_INTERVAL)
    this._pollPartner()
  },

  _stopAll() {
    wx.offLocationChange(this._onLocationChange.bind(this))
    try { wx.stopLocationUpdate() } catch (e) {}
    if (this._reportTimer) { clearTimeout(this._reportTimer); this._reportTimer = null }
    if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null }
  },

  _onLocationChange(loc) {
    const myLocation = { latitude: loc.latitude, longitude: loc.longitude }
    this.setData({ myLocation })
    if (this.data.tab === 'realtime') {
      this._updateRealtimeMarkers()
    }
    if (this._reportTimer) clearTimeout(this._reportTimer)
    this._reportTimer = setTimeout(() => {
      trackService.reportLocation({
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        speed: loc.speed
      }).catch(() => {})
    }, 2000)
  },

  async _pollPartner() {
    try {
      const res = await trackService.getPartnerLocation()
      if (res.location) {
        const ts = res.location.reportedAt
        const diff = Math.floor((Date.now() - ts) / 60000)
        const text = diff < 1 ? '刚刚' : diff < 60 ? `${diff}分钟前` : `${Math.floor(diff / 60)}小时前`
        this.setData({ partnerLocation: res.location, partnerUpdatedText: text })
        if (this.data.tab === 'realtime') this._updateRealtimeMarkers()
      }
    } catch (e) {}
  },

  _updateRealtimeMarkers() {
    const { myLocation, partnerLocation } = this.data
    const markers = []
    if (myLocation) {
      markers.push({
        id: 1,
        latitude: myLocation.latitude,
        longitude: myLocation.longitude,
        title: '我',
        iconPath: '/images/marker_me.png',
        width: 40,
        height: 40,
        callout: { content: '我', color: '#ff7eb3', fontSize: 12, borderRadius: 4, bgColor: '#fff', padding: 4, display: 'ALWAYS' }
      })
    }
    if (partnerLocation) {
      markers.push({
        id: 2,
        latitude: partnerLocation.latitude,
        longitude: partnerLocation.longitude,
        title: 'TA',
        iconPath: '/images/marker_partner.png',
        width: 40,
        height: 40,
        callout: { content: 'TA', color: '#a78bfa', fontSize: 12, borderRadius: 4, bgColor: '#fff', padding: 4, display: 'ALWAYS' }
      })
    }
    this.setData({ markers })
    if (myLocation) {
      this.setData({ mapCenter: myLocation })
    }
  },

  onTabSwitch(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.tab) return
    this.setData({ tab, markers: [], polyline: [] })
    if (tab === 'realtime') {
      this._updateRealtimeMarkers()
    } else {
      this.loadTodayTrack()
    }
  },

  async loadTodayTrack() {
    this.setData({ loading: true })
    try {
      const res = await trackService.getTodayTrack()
      const points = res.points || []
      if (!points.length) {
        toast.showError('TA 今天还没有轨迹数据')
        this.setData({ loading: false })
        return
      }
      const polyline = [{
        points: points.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
        color: '#a78bfa',
        width: 4,
        arrowLine: true
      }]
      const last = points[points.length - 1]
      const markers = [{
        id: 3,
        latitude: last.latitude,
        longitude: last.longitude,
        title: 'TA 最后位置',
        callout: { content: 'TA', color: '#a78bfa', fontSize: 12, borderRadius: 4, bgColor: '#fff', padding: 4, display: 'ALWAYS' }
      }]
      this.setData({
        polyline,
        markers,
        mapCenter: { latitude: last.latitude, longitude: last.longitude },
        trackPoints: points
      })
    } catch (err) {
      toast.showError(err.message)
    } finally {
      this.setData({ loading: false })
    }
  }
})
