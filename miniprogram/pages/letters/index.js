// pages/letters/index.js
const lettersService = require('../../services/letters')
const authUtil = require('../../utils/auth')
const dateUtil = require('../../utils/date')
const toast = require('../../utils/toast')

Page({
  data: {
    list: [],
    loading: false,
    showModal: false,
    showDetail: false,
    submitting: false,
    detailLetter: null,
    myOpenid: '',
    form: { title: '', content: '', unlockDate: '' }
  },

  async onShow() {
    const data = await authUtil.bootstrap()
    if (!data.isBound) {
      wx.navigateTo({ url: '/pages/bind/index' })
      return
    }
    const app = getApp()
    this.setData({ myOpenid: (app.globalData.userInfo || {}).openid || '' })
    await this.loadList()
  },

  async loadList() {
    this.setData({ loading: true })
    try {
      const res = await lettersService.listLetters()
      const list = (res.list || []).map((l) => ({
        ...l,
        unlockDateText: dateUtil.formatTimestamp(l.unlockAt, 'YYYY-MM-DD'),
        createdDateText: dateUtil.formatTimestamp(l.createdAt, 'YYYY-MM-DD')
      }))
      this.setData({ list })
    } catch (err) {
      toast.showError(err.message)
    } finally {
      this.setData({ loading: false })
    }
  },

  onAdd() {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    const defaultDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    this.setData({ showModal: false, form: { title: '', content: '', unlockDate: defaultDate } })
    wx.nextTick(() => { this.setData({ showModal: true }) })
  },

  onModalClose() {
    this.setData({ showModal: false })
  },

  noop() {},

  onFormTitle(e) { this.setData({ 'form.title': e.detail.value }) },
  onFormContent(e) { this.setData({ 'form.content': e.detail.value }) },
  onFormDate(e) { this.setData({ 'form.unlockDate': e.detail.value }) },

  async onSubmit() {
    const { form, submitting } = this.data
    const title = (form.title || '').trim()
    const content = (form.content || '').trim()
    if (!title) return toast.showError('请填写标题')
    if (!content) return toast.showError('请填写内容')
    if (!form.unlockDate) return toast.showError('请选择解锁日期')
    const unlockAt = new Date(form.unlockDate + 'T00:00:00').getTime()
    if (unlockAt <= Date.now()) return toast.showError('解锁日期必须是未来的日期')
    if (submitting) return

    this.setData({ submitting: true })
    try {
      await lettersService.createLetter({ title, content, unlockAt })
      toast.showSuccess('情书已封存 💌')
      this.setData({ showModal: false })
      await this.loadList()
    } catch (err) {
      toast.showError(err.message || '保存失败')
    } finally {
      this.setData({ submitting: false })
    }
  },

  async onTapLetter(e) {
    const item = e.currentTarget.dataset.item
    if (!item.isUnlocked) {
      toast.showError(`还有 ${item.daysLeft} 天才能打开`)
      return
    }
    try {
      const res = await lettersService.getLetter(item._id)
      this.setData({ detailLetter: { ...item, content: res.content }, showDetail: true })
    } catch (err) {
      toast.showError(err.message)
    }
  },

  onDetailClose() {
    this.setData({ showDetail: false, detailLetter: null })
  },

  async onDelete(e) {
    const id = e.currentTarget.dataset.id
    const confirmed = await toast.showModal({ title: '删除情书', content: '确定要删除这封情书吗？', confirmText: '删除' })
    if (!confirmed) return
    try {
      await lettersService.deleteLetter(id)
      toast.showSuccess('已删除')
      await this.loadList()
    } catch (err) {
      toast.showError(err.message)
    }
  }
})
