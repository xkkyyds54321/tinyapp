// pages/gallery/recycle.js
const photoService = require('../../services/photos')
const dateUtil = require('../../utils/date')
const toast = require('../../utils/toast')

Page({
  data: {
    list: [],
    loading: false,
    loadingMore: false,
    page: 1,
    pageSize: 20,
    hasMore: true
  },

  async onShow() {
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
      const { page, pageSize } = this.data
      const res = await photoService.listRecycleBin({ page, pageSize })
      const newList = (res.list || []).map((p) => ({
        ...p,
        deletedLabel: dateUtil.formatTimestamp(p.deletedAt, 'MM-DD')
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

  async onRestore(e) {
    const id = e.currentTarget.dataset.id
    const confirmed = await toast.showModal({
      title: '恢复照片',
      content: '确定要恢复这张照片吗？',
      confirmText: '恢复'
    })
    if (!confirmed) return
    try {
      await photoService.restorePhoto(id)
      toast.showSuccess('已恢复')
      await this.reload()
    } catch (err) {
      toast.showError(err.message)
    }
  }
})
