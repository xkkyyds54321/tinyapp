// pages/bind/index.js
const coupleService = require('../../services/couple')
const authUtil = require('../../utils/auth')
const toast = require('../../utils/toast')

Page({
  data: {
    creating: false,
    joining: false,
    inputCode: '',
    myCode: ''
  },

  async onLoad() {
    // 检查是否已绑定
    try {
      const data = await authUtil.bootstrap()
      if (data.isBound) {
        wx.switchTab({ url: '/pages/home/index' })
      }
    } catch (e) {}
  },

  async onCreateCouple() {
    if (this.data.creating) return
    this.setData({ creating: true })
    try {
      const res = await coupleService.createCouple()
      this.setData({ myCode: res.code })
      toast.showSuccess('创建成功！')
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('未部署') || msg.includes('Failed to fetch') || msg.includes('FUNCTION_NOT_FOUND')) {
        toast.showModal({
          title: '云函数未部署',
          content: '请在微信开发者工具 → cloudfunctions/couple → 右键「上传并部署」后重试',
          showCancel: false
        })
      } else {
        toast.showError(msg || '操作失败')
      }
    } finally {
      this.setData({ creating: false })
    }
  },

  onInputCode(e) {
    this.setData({ inputCode: e.detail.value.toUpperCase() })
  },

  onCopyCode() {
    wx.setClipboardData({
      data: this.data.myCode,
      success: () => toast.showSuccess('已复制绑定码')
    })
  },

  async onJoinCouple() {
    const code = this.data.inputCode.trim()
    if (code.length !== 6) return toast.showError('请输入 6 位绑定码')
    if (this.data.joining) return
    this.setData({ joining: true })
    try {
      await coupleService.joinCouple(code)
      toast.showSuccess('绑定成功！')
      // 刷新全局状态
      await authUtil.refresh()
      wx.switchTab({ url: '/pages/home/index' })
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('未部署') || msg.includes('Failed to fetch') || msg.includes('FUNCTION_NOT_FOUND')) {
        toast.showModal({
          title: '云函数未部署',
          content: '请在微信开发者工具 → cloudfunctions/couple → 右键「上传并部署」后重试',
          showCancel: false
        })
      } else {
        toast.showError(msg || '操作失败')
      }
    } finally {
      this.setData({ joining: false })
    }
  }
})
