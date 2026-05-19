// services/mood.js
const request = require('../utils/request')

function createMood(mood, content) {
  return request.moods({ action: 'createMood', mood, content })
}

function listMoods(params = {}) {
  return request.moods({ action: 'listMoods', ...params })
}

function deleteMood(id) {
  return request.moods({ action: 'deleteMood', id })
}

module.exports = { createMood, listMoods, deleteMood }
