const request = require('../utils/request')

function reportLocation(params) {
  return request.track({ action: 'reportLocation', ...params })
}

function getPartnerLocation() {
  return request.track({ action: 'getPartnerLocation' })
}

function getTodayTrack() {
  return request.track({ action: 'getTodayTrack' })
}

module.exports = { reportLocation, getPartnerLocation, getTodayTrack }
