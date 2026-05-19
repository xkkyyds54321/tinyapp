// services/bills.js
const request = require('../utils/request')

function createBill(params) {
  return request.bills({ action: 'createBill', ...params })
}

function listBills(params = {}) {
  return request.bills({ action: 'listBills', ...params })
}

function deleteBill(id) {
  return request.bills({ action: 'deleteBill', id })
}

function getStats(month) {
  return request.bills({ action: 'getStats', month })
}

module.exports = { createBill, listBills, deleteBill, getStats }
