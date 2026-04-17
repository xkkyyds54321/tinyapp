// utils/request.js - 云函数调用封装
const { CLOUD_FUNCTIONS } = require('../config/constants')
const { OK } = require('../config/error-codes')

/**
 * 调用云函数，统一处理返回结构
 * @param {string} name 云函数名
 * @param {object} data 参数
 * @returns {Promise<any>} 返回 data 字段，失败时 throw Error
 */
async function callFunction(name, data = {}) {
  try {
    const res = await wx.cloud.callFunction({ name, data })
    const result = res.result
    if (!result) throw new Error('云函数无返回')
    if (result.code !== OK) {
      const err = new Error(result.message || '请求失败')
      err.code = result.code
      throw err
    }
    return result.data
  } catch (err) {
    if (err.code) throw err
    console.error(`[callFunction] ${name} error:`, err)
    const msg = err.message || ''
    // 云函数未部署或网络不通
    if (
      msg.includes('Failed to fetch') ||
      msg.includes('FUNCTION_NOT_FOUND') ||
      msg.includes('FunctionName') ||
      msg.includes('timeout')
    ) {
      throw new Error(`云函数「${name}」未部署，请在开发者工具右键上传并部署`)
    }
    throw new Error(msg || '网络错误，请重试')
  }
}

// 各云函数快捷方法
const auth = (data) => callFunction(CLOUD_FUNCTIONS.AUTH, data)
const couple = (data) => callFunction(CLOUD_FUNCTIONS.COUPLE, data)
const photos = (data) => callFunction(CLOUD_FUNCTIONS.PHOTOS, data)
const anniversaries = (data) => callFunction(CLOUD_FUNCTIONS.ANNIVERSARIES, data)
const messages = (data) => callFunction(CLOUD_FUNCTIONS.MESSAGES, data)
const exportFn = (data) => callFunction(CLOUD_FUNCTIONS.EXPORT, data)
const track = (data) => callFunction(CLOUD_FUNCTIONS.TRACK, data)
const quiz = (data) => callFunction(CLOUD_FUNCTIONS.QUIZ, data)
const bucket = (data) => callFunction(CLOUD_FUNCTIONS.BUCKET, data)
const letters = (data) => callFunction(CLOUD_FUNCTIONS.LETTERS, data)

module.exports = { callFunction, auth, couple, photos, anniversaries, messages, exportFn, track, quiz, bucket, letters }
