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
 * 上传照片：使用微信云存储 wx.cloud.uploadFile
 * 上传后返回 fileID，再传给 confirmUpload 写库
 */
async function uploadToCOS(ticket, filePath, onProgress) {
  return new Promise((resolve, reject) => {
    const uploadTask = wx.cloud.uploadFile({
      cloudPath: ticket.cosKey,  // 用 cosKey 作为云存储路径
      filePath,
      success: (res) => resolve(res),
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
