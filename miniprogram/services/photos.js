// services/photos.js
const request = require('../utils/request')

function createUploadTicket(params) {
  // params: { filename, mimeType, size, takenAt }
  return request.photos({ action: 'createUploadTicket', ...params })
}

function confirmUpload(params) {
  // params: { photoId, width, height }
  return request.photos({ action: 'confirmUpload', ...params })
}

function listPhotos(params = {}) {
  // params: { page, pageSize, month }
  return request.photos({ action: 'listPhotos', ...params })
}

function getPhotoDetail(photoId) {
  return request.photos({ action: 'getPhotoDetail', photoId })
}

function deletePhoto(photoId) {
  return request.photos({ action: 'deletePhoto', photoId })
}

function restorePhoto(photoId) {
  return request.photos({ action: 'restorePhoto', photoId })
}

function listRecycleBin(params = {}) {
  return request.photos({ action: 'listRecycleBin', ...params })
}

/**
 * 上传照片到 COS（使用微信云存储上传能力模拟 COS 预签名上传）
 * 实际项目中前端通过 createUploadTicket 返回的 formData + url 直接 POST 到 COS
 */
async function uploadToCOS(ticket, filePath, onProgress) {
  return new Promise((resolve, reject) => {
    const uploadTask = wx.uploadFile({
      url: ticket.uploadUrl,
      filePath,
      name: 'file',
      header: ticket.headers || {},
      formData: ticket.formData || {},
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 204) {
          resolve(res)
        } else {
          reject(new Error(`上传失败: ${res.statusCode}`))
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '上传失败'))
    })
    if (onProgress && uploadTask) {
      uploadTask.onProgressUpdate((p) => onProgress(p.progress))
    }
  })
}

module.exports = {
  createUploadTicket,
  confirmUpload,
  listPhotos,
  getPhotoDetail,
  deletePhoto,
  restorePhoto,
  listRecycleBin,
  uploadToCOS
}
