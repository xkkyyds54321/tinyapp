// pages/couple-detail/index.js
const authUtil = require('../../utils/auth')
const coupleService = require('../../services/couple')
const annivService = require('../../services/anniversaries')
const dateUtil = require('../../utils/date')
const toast = require('../../utils/toast')

Page({
  data: {
    loading: true,
    user: {},
    partner: {},
    couple: null,
    togetherDays: 0,
    boundAtDate: '',       // YYYY-MM-DD for picker
    anniversaries: [],
    showAddModal: false,
    submitting: false,
    editId: '',
    form: { title: '', date: '', remark: '' }
  },

  async onShow() {
    await this.loadData()
  },

  async loadData() {
    this.setData({ loading: true })
    try {
      const app = getApp()
      const user = app.globalData.userInfo || {}
      const partner = app.globalData.partnerInfo || {}
      const couple = app.globalData.couple || {}

      let togetherDays = 0
      let boundAtDate = ''
      if (couple.boundAt) {
        togetherDays = Math.floor((Date.now() - couple.boundAt) / 86400000)
        const d = new Date(couple.boundAt)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        boundAtDate = `${y}-${m}-${day}`
      }

      const annivRes = await annivService.listAnniversaries()
      const anniversaries = (annivRes.list || []).map((a) => {
        const { label, days } = dateUtil.anniversaryLabel(a.date)
        return { ...a, label, days }
      })

      this.setData({ loading: false, user, partner, couple, togetherDays, boundAtDate, anniversaries })
    } catch (err) {
      this.setData({ loading: false })
      toast.showError(err.message || '加载失败')
    }
  },

  // 修改在一起日期
  async onBoundAtChange(e) {
    const dateStr = e.detail.value  // YYYY-MM-DD
    const boundAt = new Date(dateStr).getTime()
    if (isNaN(boundAt)) return

    try {
      toast.showLoading('保存中...')
      await coupleService.updateBoundAt(boundAt)

      // 刷新全局 couple
      await authUtil.refresh()
      const couple = getApp().globalData.couple || {}
      const togetherDays = couple.boundAt
        ? Math.floor((Date.now() - couple.boundAt) / 86400000)
        : 0

      this.setData({ couple, togetherDays, boundAtDate: dateStr })
      wx.hideLoading()
      toast.showSuccess('日期已更新')
    } catch (err) {
      wx.hideLoading()
      toast.showError(err.message || '保存失败')
    }
  },

  // 纪念日：添加
  onAdd() {
    this.setData({ showAddModal: true, editId: '', form: { title: '', date: '', remark: '' } })
  },

  // 纪念日：编辑
  onEdit(e) {
    const item = e.currentTarget.dataset.item
    this.setData({
      showAddModal: true,
      editId: item._id,
      form: { title: item.title, date: item.date, remark: item.remark || '' }
    })
  },

  onModalClose() {
    this.setData({ showAddModal: false })
  },

  onFormTitle(e) { this.setData({ 'form.title': e.detail.value }) },
  onFormDate(e) { this.setData({ 'form.date': e.detail.value }) },
  onFormRemark(e) { this.setData({ 'form.remark': e.detail.value }) },

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
        toast.showSuccess('已添加')
      }
      this.setData({ showAddModal: false })
      await this.loadData()
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
      await this.loadData()
    } catch (err) {
      toast.showError(err.message)
    }
  }
})
