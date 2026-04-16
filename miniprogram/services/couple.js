// services/couple.js
const request = require('../utils/request')

function createCouple() {
  return request.couple({ action: 'createCouple' })
}

function joinCouple(code) {
  return request.couple({ action: 'joinCouple', code })
}

function getCurrentCouple() {
  return request.couple({ action: 'getCurrentCouple' })
}

module.exports = { createCouple, joinCouple, getCurrentCouple }
