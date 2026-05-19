// pages/bills/index.js
const billService = require('../../services/bills')
const authUtil = require('../../utils/auth')
const toast = require('../../utils/toast')
const { BILL_CATEGORIES, BILL_NOTE_MAX } = require('../../config/constants')

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

Page({
  data: {
    list: [],
    loading: false,
    page: 1,
    pageSize: 20,
    hasMore: true,
    filterMonth: currentMonth(),
    stats: null,
    statsLoading: false,
    categories: BILL_CATEGORIES,
    showAddModal: false,
    form: { amount: '', category: '', note: '', billDate: todayStr() },
    submitting: false
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
    this.setData({ page: 1, list: [], hasMore: true })
    await Promise.all([this.fetchBills(), this.fetchStats()])
  },

  async fetchBills() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const { page, pageSize, filterMonth } = this.data
      const res = await billService.listBills({ page, pageSize, month: filterMonth })
      const newList = (res.list || []).map(b => {
        const cat = BILL_CATEGORIES.find(c => c.key === b.category)
        return { ...b, categoryEmoji: cat ? cat.emoji : '💰', categoryLabel: cat ? cat.label : b.category }
      })
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

  async fetchStats() {
    this.setData({ statsLoading: true })
    try {
      const stats = await billService.getStats(this.data.filterMonth)
      this.setData({ stats })
    } catch (e) {
      this.setData({ stats: null })
    } finally {
      this.setData({ statsLoading: false })
    }
  },

  async loadMore() {
    if (!this.data.hasMore || this.data.loading) return
    this.setData({ page: this.data.page + 1 })
    await this.fetchBills()
  },

  onMonthChange(e) {
    const month = e.detail.value.replace('-', '/')
    this.setData({ filterMonth: month })
    this.reload()
  },

  noop() {},

  onShowAdd() {
    this.setData({ showAddModal: true, form: { amount: '', category: '', note: '', billDate: todayStr() } })
  },

  onCloseAdd() {
    this.setData({ showAddModal: false })
  },

  onAmountInput(e) {
    this.setData({ 'form.amount': e.detail.value })
  },

  onSelectCategory(e) {
    this.setData({ 'form.category': e.currentTarget.dataset.key })
  },

  onNoteInput(e) {
    this.setData({ 'form.note': e.detail.value })
  },

  onDateChange(e) {
    this.setData({ 'form.billDate': e.detail.value })
  },

  async onSubmit() {
    const { amount, category, note, billDate } = this.data.form
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.showError('请填写有效金额')
      return
    }
    if (!category) {
      toast.showError('请选择分类')
      return
    }
    if ((note || '').length > BILL_NOTE_MAX) {
      toast.showError(`备注最长 ${BILL_NOTE_MAX} 字`)
      return
    }
    this.setData({ submitting: true })
    try {
      await billService.createBill({ amount: Number(amount), category, note, billDate })
      this.setData({ showAddModal: false })
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
      title: '删除账单',
      content: '确定删除这条记录吗？',
      confirmText: '删除'
    })
    if (!confirmed) return
    try {
      await billService.deleteBill(id)
      await this.reload()
    } catch (err) {
      toast.showError(err.message)
    }
  },

  getCategoryLabel(key) {
    const cat = BILL_CATEGORIES.find(c => c.key === key)
    return cat ? `${cat.emoji} ${cat.label}` : key
  }
})
