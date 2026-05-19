// pages/promises/index.js
const promiseService = require('../../services/promises')
const authUtil = require('../../utils/auth')
const toast = require('../../utils/toast')
const { PROMISE_CONTENT_MAX } = require('../../config/constants')

Page({
  data: {
    pending: [],
    done: [],
    loading: false,
    showAddModal: false,
    contentInput: '',
    dueDateInput: '',
    submitting: false
  },

  async onShow() {
    const data = await authUtil.bootstrap()
    if (!data.isBound) {
      wx.navigateTo({ url: '/pages/bind/index' })
      return
    }
    await this.fetchList()
  },

  async fetchList() {
    this.setData({ loading: true })
    try {
      const res = await promiseService.listPromises()
      const all = res.list || []
      this.setData({
        pending: all.filter(p => !p.isDone),
        done: all.filter(p => p.isDone)
      })
    } catch (err) {
      toast.showError(err.message)
    } finally {
      this.setData({ loading: false })
    }
  },

  noop() {},

  onShowAdd() {
    this.setData({ showAddModal: true, contentInput: '', dueDateInput: '' })
  },

  onCloseAdd() {
    this.setData({ showAddModal: false })
  },

  onContentInput(e) {
    this.setData({ contentInput: e.detail.value })
  },

  onDueDateChange(e) {
    this.setData({ dueDateInput: e.detail.value })
  },

  async onSubmit() {
    const content = (this.data.contentInput || '').trim()
    if (!content) {
      toast.showError('请填写约定内容')
      return
    }
    if (content.length > PROMISE_CONTENT_MAX) {
      toast.showError(`最长 ${PROMISE_CONTENT_MAX} 字`)
      return
    }
    this.setData({ submitting: true })
    try {
      await promiseService.createPromise(content, this.data.dueDateInput || null)
      this.setData({ showAddModal: false })
      toast.showSuccess('约定已创建')
      await this.fetchList()
    } catch (err) {
      toast.showError(err.message)
    } finally {
      this.setData({ submitting: false })
    }
  },

  async onToggle(e) {
    const { id, done } = e.currentTarget.dataset
    try {
      await promiseService.togglePromise(id)
      await this.fetchList()
    } catch (err) {
      toast.showError(err.message)
    }
  },

  async onDelete(e) {
    const { id } = e.currentTarget.dataset
    const confirmed = await toast.showModal({
      title: '删除约定',
      content: '确定删除这个约定吗？',
      confirmText: '删除'
    })
    if (!confirmed) return
    try {
      await promiseService.deletePromise(id)
      await this.fetchList()
    } catch (err) {
      toast.showError(err.message)
    }
  }
})
