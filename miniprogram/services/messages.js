// services/messages.js
const request = require('../utils/request')

function createMessage(content) {
  return request.messages({ action: 'createMessage', content })
}

function listMessages(params = {}) {
  // params: { page, pageSize }
  return request.messages({ action: 'listMessages', ...params })
}

function deleteMessage(id) {
  return request.messages({ action: 'deleteMessage', id })
}

module.exports = { createMessage, listMessages, deleteMessage }
