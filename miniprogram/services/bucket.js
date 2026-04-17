const request = require('../utils/request')

function listItems() {
  return request.bucket({ action: 'listItems' })
}

function completeItem(params) {
  return request.bucket({ action: 'completeItem', ...params })
}

function deleteItem(id) {
  return request.bucket({ action: 'deleteItem', id })
}

module.exports = { listItems, completeItem, deleteItem }
