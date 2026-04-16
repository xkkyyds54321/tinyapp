// services/exports.js
const request = require('../utils/request')

function createExportJob() {
  return request.exportFn({ action: 'createExportJob' })
}

module.exports = { createExportJob }
