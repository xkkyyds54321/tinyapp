// pages/profile/index.js
const authUtil = require('../../utils/auth')
const exportService = require('../../services/exports')
const photoService = require('../../services/photos')
const dateUtil = require('../../utils/date')
const request = require('../../utils/request')
const toast = require('../../utils/toast')

Page({
  data: {
    user: {},
    partner: null,
    couple: null,
    togetherDays: 0,
    boundAtText: '',
    storageInfo: null,
    nicknameInput: '',
    showPartnerModal: false
  },

  async onShow() {
    const data = await authUtil.bootstrap()
    if (!data.isBound) {
      wx.navigateTo({ url: '/pages/bind/index' })
      return
    }
    const app = getApp()
    const user = app.globalData.userInfo || {}
    const partner = app.globalData.partnerInfo || null
    const couple = app.globalData.couple || null

    let togetherDays = 0
    let boundAtText = ''
    if (couple && couple.boundAt) {
      togetherDays = Math.floor((Date.now() - couple.boundAt) / 86400000)
      boundAtText = dateUtil.formatTimestamp(couple.boundAt, 'YYYY-MM-DD')
    }

    this.setData({ user, partner, couple, togetherDays, boundAtText, nicknameInput: user.nickname || '' })
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

  // 微信头像授权回调
  async onChooseAvatar(e) {
    const { avatarUrl, nickName } = e.detail
    if (!avatarUrl) return

    toast.showLoading('保存中...')
    try {
      const app = getApp()
      const user = app.globalData.userInfo || {}
      const openid = user.openid || `avatar_${Date.now()}`

      // 上传头像到微信云存储
      const cloudPath = `avatars/${openid}.jpg`
      const uploadRes = await new Promise((resolve, reject) => {
        wx.cloud.uploadFile({
          cloudPath,
          filePath: avatarUrl,
          success: resolve,
          fail: (err) => reject(new Error(err.errMsg || '上传失败'))
        })
      })

      // 如果用户还没有昵称，用微信返回的昵称；微信昵称也没有则用 openid 后6位
      const existingNickname = (user.nickname || '').trim()
      const wxNickname = (nickName || '').trim()
      const defaultNickname = openid.slice(-6)
      const finalNickname = existingNickname || wxNickname || defaultNickname

      // 保存到用户记录
      await request.auth({ action: 'updateProfile', avatarUrl: uploadRes.fileID, nickname: finalNickname })

      // 刷新全局状态
      await authUtil.refresh()
      const updatedUser = getApp().globalData.userInfo || {}
      this.setData({ user: updatedUser, nicknameInput: updatedUser.nickname || '' })

      wx.hideLoading()
      toast.showSuccess('头像已更新')
    } catch (err) {
      wx.hideLoading()
      toast.showError(err.message || '保存失败，请重试')
    }
  },

  onNicknameInput(e) {
    this.setData({ nicknameInput: e.detail.value })
  },

  // type="nickname" 选择微信昵称时触发 bindchange（与手动输入后触发的 bindinput 区别）
  onNicknameChange(e) {
    // 微信昵称选择后 detail.value 已包含昵称，直接触发保存
    this.setData({ nicknameInput: e.detail.value })
    this.saveNickname()
  },

  // 失去焦点或按回车时保存昵称
  async onNicknameBlur() {
    await this.saveNickname()
  },

  async onNicknameConfirm() {
    await this.saveNickname()
  },

  async saveNickname() {
    const nickname = (this.data.nicknameInput || '').trim()
    if (!nickname) return
    const current = this.data.user.nickname || ''
    if (nickname === current) return

    try {
      await request.auth({ action: 'updateProfile', nickname })
      await authUtil.refresh()
      const updatedUser = getApp().globalData.userInfo || {}
      this.setData({ user: updatedUser })
      toast.showSuccess('昵称已保存')
    } catch (err) {
      toast.showError(err.message || '保存失败')
    }
  },

  goRecycle() {
    wx.navigateTo({ url: '/pages/gallery/recycle' })
  },

  onViewPartner() {
    this.setData({ showPartnerModal: true })
  },

  onClosePartnerModal() {
    this.setData({ showPartnerModal: false })
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
