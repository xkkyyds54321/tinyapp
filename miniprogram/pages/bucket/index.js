const bucketService = require('../../services/bucket')
const authUtil = require('../../utils/auth')
const toast = require('../../utils/toast')
const BUCKET_LIST = require('../../config/bucket-list')

Page({
  data: {
    list: BUCKET_LIST,
    doneMap: {},
    doneCount: 0,
    loading: false,
    showPanel: false,
    panelItem: null,
    uploading: false,
    form: { photoPath: '', description: '', doneDate: '', location: '' }
  },

  async onShow() {
    const data = await authUtil.bootstrap()
    if (!data.isBound) {
      wx.navigateTo({ url: '/pages/bind/index' })
      return
    }
    await this.loadItems()
  },

  async loadItems() {
    this.setData({ loading: true })
    try {
      const res = await bucketService.listItems()
      const doneMap = {}
      ;(res.items || []).forEach(item => {
        doneMap[item.itemIndex] = item
      })
      this.setData({ doneMap, doneCount: Object.keys(doneMap).length })
    } catch (err) {
      toast.showError(err.message)
    } finally {
      this.setData({ loading: false })
    }
  },

  onTapItem(e) {
    const index = e.currentTarget.dataset.index
    const done = this.data.doneMap[index]
    if (done) {
      this.setData({ showPanel: true, panelItem: { ...done, title: BUCKET_LIST[index], isDone: true } })
    } else {
      const d = new Date()
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      this.setData({
        showPanel: true,
        panelItem: { itemIndex: index, title: BUCKET_LIST[index], isDone: false },
        form: { photoPath: '', description: '', doneDate: today, location: '' }
      })
    }
  },

  onPanelClose() {
    this.setData({ showPanel: false, panelItem: null })
  },

  noop() {},

  async onChoosePhoto() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          success: resolve,
          fail: reject
        })
      })
      const path = res.tempFiles[0].tempFilePath
      this.setData({ 'form.photoPath': path })
    } catch (e) {}
  },

  onFormDesc(e) { this.setData({ 'form.description': e.detail.value }) },
  onFormDate(e) { this.setData({ 'form.doneDate': e.detail.value }) },
  onFormLocation(e) { this.setData({ 'form.location': e.detail.value }) },

  async onComplete() {
    const { form, panelItem, uploading } = this.data
    if (!form.photoPath) return toast.showError('请先选择一张照片')
    if (uploading) return
    this.setData({ uploading: true })
    try {
      const ext = form.photoPath.split('.').pop() || 'jpg'
      const cloudPath = `bucket/${panelItem.itemIndex}_${Date.now()}.${ext}`
      const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: form.photoPath })
      await bucketService.completeItem({
        itemIndex: panelItem.itemIndex,
        photoFileID: uploadRes.fileID,
        description: form.description,
        doneDate: form.doneDate,
        location: form.location
      })
      toast.showSuccess('打卡成功 🎉')
      this.setData({ showPanel: false, panelItem: null })
      await this.loadItems()
    } catch (err) {
      toast.showError(err.message || '打卡失败')
    } finally {
      this.setData({ uploading: false })
    }
  },

  async onDeleteItem() {
    const { panelItem } = this.data
    if (!panelItem || !panelItem._id) return
    const confirmed = await toast.showModal({ title: '删除记录', content: '确定要删除这条打卡记录吗？', confirmText: '删除' })
    if (!confirmed) return
    try {
      await bucketService.deleteItem(panelItem._id)
      toast.showSuccess('已删除')
      this.setData({ showPanel: false, panelItem: null })
      await this.loadItems()
    } catch (err) {
      toast.showError(err.message)
    }
  }
})
