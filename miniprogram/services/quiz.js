const request = require('../utils/request')

function getTodayQuiz() {
  return request.quiz({ action: 'getTodayQuiz' })
}

function submitAnswer(answer) {
  return request.quiz({ action: 'submitAnswer', answer })
}

function listHistory(page = 1, pageSize = 20) {
  return request.quiz({ action: 'listHistory', page, pageSize })
}

module.exports = { getTodayQuiz, submitAnswer, listHistory }
