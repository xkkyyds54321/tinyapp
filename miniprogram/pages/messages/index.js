// pages/messages/index.js
const msgService = require('../../services/messages')
const authUtil = require('../../utils/auth')
const dateUtil = require('../../utils/date')
const toast = require('../../utils/toast')

Page({
  data: {
    list: [],
    loading: false,
    loadingMore: false,
    page: 1,
    pageSize: 20,
    hasMore: true,
    inputText: '',
    sending: false,
    myOpenid: ''
  },

  async onShow() {
    const data = await authUtil.bootstrap()
    if (!data.isBound) {
      wx.navigateTo({ url: '/pages/bind/index' })
      return
    }
    const app = getApp()
    const myOpenid = (app.globalData.userInfo || {}).openid || ''
    this.setData({ myOpenid })
    await this.reload()
  },

  async reload() {
    this.setData({ page: 1, list: [], hasMore: true })
    await this.fetchList()
  },

  async fetchList() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const { page, pageSize, myOpenid } = this.data
      const res = await msgService.listMessages({ page, pageSize })
      const newList = (res.list || []).map((m) => ({
        ...m,
        isMine: m.senderOpenid === myOpenid,
        timeLabel: dateUtil.formatTimestamp(m.createdAt, 'MM-DD HH:mm')
      }))
      this.setData({
        list: page === 1 ? newList : [...this.data.list, ...newList],
        hasMore: newList.length === pageSize
      })
    } catch (err) {
      toast.showError(err.message)
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadMore() {
    if (!this.data.hasMore || this.data.loadingMore) return
    this.setData({ loadingMore: true, page: this.data.page + 1 })
    await this.fetchList()
    this.setData({ loadingMore: false })
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value })
  },

  async onSend() {
    const content = this.data.inputText.trim()
    if (!content || this.data.sending) return

    this.setData({ sending: true })
    try {
      await msgService.createMessage(content)
      this.setData({ inputText: '' })
      await this.reload()
    } catch (err) {
      toast.showError(err.message)
    } finally {
      this.setData({ sending: false })
    }
  },

  async onDelete(e) {
    const id = e.currentTarget.dataset.id
    const confirmed = await toast.showModal({
      title: '删除留言',
      content: '确定要删除这条留言吗？',
      confirmText: '删除'
    })
    if (!confirmed) return
    try {
      await msgService.deleteMessage(id)
      toast.showSuccess('已删除')
      await this.reload()
    } catch (err) {
      toast.showError(err.message)
    }
  }
})
