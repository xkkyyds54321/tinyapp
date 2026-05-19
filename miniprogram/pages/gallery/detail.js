// pages/gallery/detail.js
const photoService = require('../../services/photos')
const dateUtil = require('../../utils/date')
const toast = require('../../utils/toast')
const { PHOTO_NOTE_MAX, PHOTO_TAGS_MAX, PHOTO_TAG_MAX_LEN } = require('../../config/constants')

Page({
  data: {
    loading: true,
    error: '',
    photo: null,
    thumbUrl: '',
    originalUrl: '',
    uploadedBySelf: false,
    timeText: '',
    sizeText: '',
    locationText: '',
    canAddTag: true,
    editingNote: false,
    noteInput: '',
    tagInput: '',
    savingNote: false
  },

  async onLoad(options) {
    const { id } = options
    if (!id) {
      this.setData({ loading: false, error: '缺少照片 ID' })
      return
    }
    await this.loadDetail(id)
  },

  async loadDetail(id) {
    this.setData({ loading: true })
    try {
      const res = await photoService.getPhotoDetail(id)
      const app = getApp()
      const openid = app.globalData.userInfo ? app.globalData.userInfo.openid : ''
      const photo = res.photo

      let sizeText = ''
      if (photo.size) {
        sizeText = photo.size > 1024 * 1024
          ? `${(photo.size / 1024 / 1024).toFixed(1)} MB`
          : `${(photo.size / 1024).toFixed(0)} KB`
      }

      let locationText = ''
      if (photo.location && photo.location.latitude) {
        const lat = photo.location.latitude.toFixed(4)
        const lng = photo.location.longitude.toFixed(4)
        locationText = `${lat}, ${lng}`
      }

      this.setData({
        loading: false,
        photo,
        thumbUrl: res.thumbUrl,
        originalUrl: res.originalUrl,
        uploadedBySelf: photo.uploadedBy === openid,
        timeText: dateUtil.formatTimestamp(photo.takenAt || photo.createdAt),
        sizeText,
        locationText,
        noteInput: photo.note || '',
        canAddTag: (photo.tags || []).length < PHOTO_TAGS_MAX
      })
    } catch (err) {
      this.setData({ loading: false, error: err.message })
    }
  },

  onPreview() {
    const url = this.data.originalUrl || this.data.thumbUrl
    if (!url) return
    wx.previewImage({ urls: [url], current: url })
  },

  onEditNote() {
    this.setData({ editingNote: true, noteInput: this.data.photo.note || '' })
  },

  onNoteInput(e) {
    this.setData({ noteInput: e.detail.value })
  },

  onCancelNote() {
    this.setData({ editingNote: false, noteInput: this.data.photo.note || '' })
  },

  async onSaveNote() {
    const note = (this.data.noteInput || '').trim()
    if (note.length > PHOTO_NOTE_MAX) {
      toast.showError(`备注最长 ${PHOTO_NOTE_MAX} 字`)
      return
    }
    this.setData({ savingNote: true })
    try {
      await photoService.updatePhotoNote(this.data.photo._id, note, this.data.photo.tags || [])
      this.setData({ photo: { ...this.data.photo, note }, editingNote: false })
      toast.showSuccess('已保存')
    } catch (err) {
      toast.showError(err.message)
    } finally {
      this.setData({ savingNote: false })
    }
  },

  onTagInput(e) {
    this.setData({ tagInput: e.detail.value })
  },

  async onAddTag() {
    const tag = (this.data.tagInput || '').trim().slice(0, PHOTO_TAG_MAX_LEN)
    if (!tag) return
    const tags = this.data.photo.tags || []
    if (tags.length >= PHOTO_TAGS_MAX) {
      toast.showError(`最多 ${PHOTO_TAGS_MAX} 个标签`)
      return
    }
    if (tags.includes(tag)) {
      this.setData({ tagInput: '' })
      return
    }
    const newTags = [...tags, tag]
    try {
      await photoService.updatePhotoNote(this.data.photo._id, this.data.photo.note || '', newTags)
      this.setData({ photo: { ...this.data.photo, tags: newTags }, tagInput: '', canAddTag: newTags.length < PHOTO_TAGS_MAX })
    } catch (err) {
      toast.showError(err.message)
    }
  },

  async onRemoveTag(e) {
    const idx = e.currentTarget.dataset.idx
    const newTags = (this.data.photo.tags || []).filter((_, i) => i !== idx)
    try {
      await photoService.updatePhotoNote(this.data.photo._id, this.data.photo.note || '', newTags)
      this.setData({ photo: { ...this.data.photo, tags: newTags }, canAddTag: newTags.length < PHOTO_TAGS_MAX })
    } catch (err) {
      toast.showError(err.message)
    }
  },

  async onDelete() {
    const confirmed = await toast.showModal({
      title: '移入回收站',
      content: '照片将移入回收站，可以在回收站恢复',
      confirmText: '移入回收站'
    })
    if (!confirmed) return

    try {
      await photoService.deletePhoto(this.data.photo._id)
      toast.showSuccess('已移入回收站')
      wx.navigateBack()
    } catch (err) {
      toast.showError(err.message)
    }
  }
})
