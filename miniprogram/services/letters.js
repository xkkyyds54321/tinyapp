// services/letters.js
const request = require('../utils/request')

function createLetter(params) {
  return request.letters({ action: 'createLetter', ...params })
}

function listLetters(params = {}) {
  return request.letters({ action: 'listLetters', ...params })
}

function getLetter(id) {
  return request.letters({ action: 'getLetter', id })
}

function deleteLetter(id) {
  return request.letters({ action: 'deleteLetter', id })
}

module.exports = { createLetter, listLetters, getLetter, deleteLetter }
