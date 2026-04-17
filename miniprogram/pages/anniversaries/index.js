// pages/anniversaries/index.js
const annivService = require('../../services/anniversaries')
const authUtil = require('../../utils/auth')
const dateUtil = require('../../utils/date')
const toast = require('../../utils/toast')

Page({
  data: {
    list: [],
    loading: false,
    showModal: false,
    submitting: false,
    editId: '',
    form: { title: '', date: '', remark: '' }
  },

  async onShow() {
    const data = await authUtil.bootstrap()
    if (!data.isBound) {
      wx.navigateTo({ url: '/pages/bind/index' })
      return
    }
    await this.loadList()
  },

  async loadList() {
    this.setData({ loading: true })
    try {
      const res = await annivService.listAnniversaries()
      const list = (res.list || []).map((a) => {
        const { label, days } = dateUtil.anniversaryLabel(a.date)
        return { ...a, label, days }
      })
      this.setData({ list })
    } catch (err) {
      toast.showError(err.message)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 新建：先关掉弹窗（清空 DOM），下一帧再带空数据打开
  onAdd() {
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    this.setData({ showModal: false, editId: '', form: { title: '', date: today, remark: '' } })
    wx.nextTick(() => {
      this.setData({ showModal: true })
    })
  },

  // 编辑：同理，先清后填
  onEdit(e) {
    const item = e.currentTarget.dataset.item
    this.setData({
      showModal: false,
      editId: item._id,
      form: { title: item.title, date: item.date, remark: item.remark || '' }
    })
    wx.nextTick(() => {
      this.setData({ showModal: true })
    })
  },

  onModalClose() {
    this.setData({ showModal: false })
  },

  onFormTitle(e) {
    this.setData({ 'form.title': e.detail.value })
  },

  onFormDate(e) {
    this.setData({ 'form.date': e.detail.value })
  },

  onFormRemark(e) {
    this.setData({ 'form.remark': e.detail.value })
  },

  async onSubmit() {
    const { form, editId, submitting } = this.data
    const title = (form.title || '').trim()
    if (!title) return toast.showError('请填写标题')
    if (!form.date) return toast.showError('请选择日期')
    if (submitting) return

    this.setData({ submitting: true })
    try {
      if (editId) {
        await annivService.updateAnniversary(editId, { title, date: form.date, remark: form.remark || '' })
        toast.showSuccess('已更新')
      } else {
        await annivService.createAnniversary({ title, date: form.date, remark: form.remark || '' })
        toast.showSuccess('已创建')
      }
      this.setData({ showModal: false })
      await this.loadList()
    } catch (err) {
      toast.showError(err.message || '操作失败，请重试')
    } finally {
      this.setData({ submitting: false })
    }
  },

  async onDelete(e) {
    const id = e.currentTarget.dataset.id
    const confirmed = await toast.showModal({
      title: '删除纪念日',
      content: '确定要删除这个纪念日吗？',
      confirmText: '删除'
    })
    if (!confirmed) return
    try {
      await annivService.deleteAnniversary(id)
      toast.showSuccess('已删除')
      await this.loadList()
    } catch (err) {
      toast.showError(err.message)
    }
  }
})
