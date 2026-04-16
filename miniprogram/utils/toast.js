// utils/toast.js - 提示工具
function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({ title, icon, duration })
}

function showSuccess(title = '操作成功') {
  wx.showToast({ title, icon: 'success', duration: 1500 })
}

function showError(title = '操作失败') {
  wx.showToast({ title: title.length > 14 ? title.slice(0, 14) : title, icon: 'none', duration: 2500 })
}

function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true })
}

function hideLoading() {
  wx.hideLoading()
}

function showModal({ title = '提示', content = '', confirmText = '确定', cancelText = '取消' } = {}) {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmText,
      cancelText,
      success: (res) => resolve(res.confirm)
    })
  })
}

module.exports = { showToast, showSuccess, showError, showLoading, hideLoading, showModal }
