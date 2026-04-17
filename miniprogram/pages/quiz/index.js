const quizService = require('../../services/quiz')
const authUtil = require('../../utils/auth')
const toast = require('../../utils/toast')

Page({
  data: {
    tab: 'today',
    loading: false,
    today: null,
    answerInput: '',
    submitting: false,
    historyList: [],
    historyPage: 1,
    historyTotal: 0,
    historyLoading: false
  },

  async onShow() {
    const data = await authUtil.bootstrap()
    if (!data.isBound) {
      wx.navigateTo({ url: '/pages/bind/index' })
      return
    }
    await this.loadToday()
  },

  async loadToday() {
    this.setData({ loading: true })
    try {
      const res = await quizService.getTodayQuiz()
      this.setData({ today: res, answerInput: res.myAnswer || '' })
    } catch (err) {
      toast.showError(err.message)
    } finally {
      this.setData({ loading: false })
    }
  },

  onTabSwitch(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.tab) return
    this.setData({ tab })
    if (tab === 'history' && !this.data.historyList.length) {
      this.loadHistory(1)
    }
  },

  async loadHistory(page) {
    this.setData({ historyLoading: true })
    try {
      const res = await quizService.listHistory(page)
      const list = page === 1 ? res.list : [...this.data.historyList, ...res.list]
      this.setData({ historyList: list, historyPage: page, historyTotal: res.total })
    } catch (err) {
      toast.showError(err.message)
    } finally {
      this.setData({ historyLoading: false })
    }
  },

  onAnswerInput(e) {
    this.setData({ answerInput: e.detail.value })
  },

  async onSubmit() {
    const { answerInput, submitting } = this.data
    if (!answerInput.trim()) return toast.showError('请填写你的答案')
    if (submitting) return
    this.setData({ submitting: true })
    try {
      await quizService.submitAnswer(answerInput.trim())
      toast.showSuccess('回答成功 💕')
      await this.loadToday()
    } catch (err) {
      toast.showError(err.message || '提交失败')
    } finally {
      this.setData({ submitting: false })
    }
  },

  onReachBottom() {
    if (this.data.tab !== 'history') return
    const { historyList, historyTotal, historyPage, historyLoading } = this.data
    if (historyLoading || historyList.length >= historyTotal) return
    this.loadHistory(historyPage + 1)
  }
})
