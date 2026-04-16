// services/auth.js
const request = require('../utils/request')

function bootstrap() {
  return request.auth({ action: 'bootstrap' })
}

module.exports = { bootstrap }
