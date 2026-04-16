// services/anniversaries.js
const request = require('../utils/request')

function createAnniversary(params) {
  // params: { title, date, remark }
  return request.anniversaries({ action: 'createAnniversary', ...params })
}

function updateAnniversary(id, params) {
  // params: { title, date, remark }
  return request.anniversaries({ action: 'updateAnniversary', id, ...params })
}

function deleteAnniversary(id) {
  return request.anniversaries({ action: 'deleteAnniversary', id })
}

function listAnniversaries() {
  return request.anniversaries({ action: 'listAnniversaries' })
}

module.exports = { createAnniversary, updateAnniversary, deleteAnniversary, listAnniversaries }
