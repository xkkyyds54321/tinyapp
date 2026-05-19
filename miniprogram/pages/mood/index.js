// pages/mood/index.js
const moodService = require('../../services/mood')
const authUtil = require('../../utils/auth')
const dateUtil = require('../../utils/date')
const toast = require('../../utils/toast')
const { MOOD_EMOJIS, MOOD_CONTENT_MAX } = require('../../config/constants')

// 模块级缓存，分页合并用
let _allMoodItems = []

Page({
  data: {
    list: [],
    loading: false,
    page: 1,
    pageSize: 30,
    hasMore: true,
    moodEmojis: MOOD_EMOJIS,
    selectedMood: '',
    contentInput: '',
    submitting: false,
    showPicker: true
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
    _allMoodItems = []
    this.setData({ page: 1, list: [], hasMore: true })
    await this.fetchMoods()
  },

  async fetchMoods() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const { page, pageSize } = this.data
      const res = await moodService.listMoods({ page, pageSize })
      const rawList = res.list || []

      _allMoodItems = page === 1 ? rawList : [..._allMoodItems, ...rawList]

      const grouped = this._groupByDate(_allMoodItems)
      // 格式化时间
      grouped.forEach(g => g.items.forEach(m => {
        m.timeText = dateUtil.relativeTime ? dateUtil.relativeTime(m.createdAt) : dateUtil.formatTimestamp(m.createdAt)
      }))
      this.setData({ list: grouped, hasMore: rawList.length === pageSize })
    } catch (err) {
      toast.showError(err.message)
    } finally {
      this.setData({ loading: false })
    }
  },

  _groupByDate(items) {
    const map = {}
    const order = []
    items.forEach(item => {
      if (!map[item.dateKey]) { map[item.dateKey] = []; order.push(item.dateKey) }
      map[item.dateKey].push(item)
    })
    return order.map(dk => ({ dateKey: dk, items: map[dk] }))
  },

  async loadMore() {
    if (!this.data.hasMore || this.data.loading) return
    this.setData({ page: this.data.page + 1 })
    await this.fetchMoods()
  },

  onSelectMood(e) {
    this.setData({ selectedMood: e.currentTarget.dataset.emoji })
  },

  onContentInput(e) {
    this.setData({ contentInput: e.detail.value })
  },

  async onSubmit() {
    if (!this.data.selectedMood) {
      toast.showError('请先选择一个心情')
      return
    }
    const content = (this.data.contentInput || '').trim()
    if (content.length > MOOD_CONTENT_MAX) {
      toast.showError(`内容最长 ${MOOD_CONTENT_MAX} 字`)
      return
    }
    this.setData({ submitting: true })
    try {
      await moodService.createMood(this.data.selectedMood, content)
      this.setData({ selectedMood: '', contentInput: '' })
      toast.showSuccess('已记录')
      await this.reload()
    } catch (err) {
      toast.showError(err.message)
    } finally {
      this.setData({ submitting: false })
    }
  },

  async onDelete(e) {
    const { id } = e.currentTarget.dataset
    const confirmed = await toast.showModal({
      title: '删除记录',
      content: '确定删除这条心情记录吗？',
      confirmText: '删除'
    })
    if (!confirmed) return
    try {
      await moodService.deleteMood(id)
      await this.reload()
    } catch (err) {
      toast.showError(err.message)
    }
  }
})
