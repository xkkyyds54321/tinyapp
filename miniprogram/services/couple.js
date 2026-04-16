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

function updateCover(fileID) {
  return request.couple({ action: 'updateCover', fileID })
}

function updateBoundAt(boundAt) {
  return request.couple({ action: 'updateBoundAt', boundAt })
}

module.exports = { createCouple, joinCouple, getCurrentCouple, updateCover, updateBoundAt }
