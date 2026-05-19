// services/promises.js
const request = require('../utils/request')

function createPromise(content, dueDate) {
  return request.promises({ action: 'createPromise', content, dueDate })
}

function listPromises() {
  return request.promises({ action: 'listPromises' })
}

function togglePromise(id) {
  return request.promises({ action: 'togglePromise', id })
}

function deletePromise(id) {
  return request.promises({ action: 'deletePromise', id })
}

module.exports = { createPromise, listPromises, togglePromise, deletePromise }
