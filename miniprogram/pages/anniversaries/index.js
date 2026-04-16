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

  onAdd() {
    this.setData({ showModal: true, editId: '', form: { title: '', date: '', remark: '' } })
  },

  onEdit(e) {
    const item = e.currentTarget.dataset.item
    this.setData({
      showModal: true,
      editId: item._id,
      form: { title: item.title, date: item.date, remark: item.remark || '' }
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
    const { form, editId } = this.data
    if (!form.title.trim()) return toast.showError('请填写标题')
    if (!form.date) return toast.showError('请选择日期')
    if (this.data.submitting) return

    this.setData({ submitting: true })
    try {
      if (editId) {
        await annivService.updateAnniversary(editId, form)
        toast.showSuccess('已更新')
      } else {
        await annivService.createAnniversary(form)
        toast.showSuccess('已创建')
      }
      this.setData({ showModal: false })
      await this.loadList()
    } catch (err) {
      toast.showError(err.message)
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
