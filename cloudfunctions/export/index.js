// cloudfunctions/export/index.js
const cloud = require('wx-server-sdk')
const COS = require('cos-nodejs-sdk-v5')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const users = db.collection('users')
const exports_ = db.collection('exports')

const OK = 0
const UNKNOWN = 1000
const COUPLE_NOT_BOUND = 3006
const EXPORT_FAILED = 7001

function resp(code, message, data = null) {
  return { code, message, data }
}

function getCOS() {
  return new COS({ SecretId: process.env.COS_SECRET_ID, SecretKey: process.env.COS_SECRET_KEY })
}

function yyyyMMdd(ts) {
  const d = ts ? new Date(ts) : new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

function putObject(cos, key, body) {
  return new Promise((resolve, reject) => {
    cos.putObject(
      { Bucket: process.env.COS_BUCKET, Region: process.env.COS_REGION, Key: key, Body: body },
      (err, data) => { if (err) reject(err); else resolve(data) }
    )
  })
}

async function createExportJob(openid) {
  const { data: userData } = await users.where({ openid }).get()
  const user = userData[0]
  if (!user || !user.coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const coupleId = user.coupleId
  const now = Date.now()
  const exportId = `exp_${now}_${Math.random().toString(36).slice(2, 6)}`

  // 创建导出记录
  await exports_.add({
    data: {
      _id: exportId,
      coupleId,
      requestedBy: openid,
      status: 'processing',
      fileKey: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now
    }
  })

  try {
    // 聚合元数据
    const [coupleRes, photosRes, annivRes, msgsRes, usersRes] = await Promise.all([
      db.collection('couples').doc(coupleId).get(),
      db.collection('photos').where({ coupleId }).get(),
      db.collection('anniversaries').where({ coupleId, isDeleted: false }).get(),
      db.collection('messages').where({ coupleId, isDeleted: false }).get(),
      db.collection('users').where({ coupleId }).get()
    ])

    const exportData = {
      exportedAt: now,
      couple: coupleRes.data,
      users: usersRes.data,
      photos: photosRes.data,
      anniversaries: annivRes.data,
      messages: msgsRes.data
    }

    const fileKey = `couples/${coupleId}/exports/${yyyyMMdd(now)}/${exportId}.json`
    const cos = getCOS()
    await putObject(cos, fileKey, JSON.stringify(exportData, null, 2))

    await exports_.doc(exportId).update({
      data: { status: 'done', fileKey, updatedAt: Date.now() }
    })

    // 生成下载链接
    const signExpire = parseInt(process.env.SIGN_URL_EXPIRE_SECONDS || '600')
    const downloadUrl = await new Promise((resolve, reject) => {
      cos.getObjectUrl(
        { Bucket: process.env.COS_BUCKET, Region: process.env.COS_REGION, Key: fileKey, Sign: true, Expires: signExpire },
        (err, data) => { if (err) reject(err); else resolve(data.Url) }
      )
    })

    return resp(OK, '导出成功', { exportId, fileKey, downloadUrl })
  } catch (err) {
    await exports_.doc(exportId).update({
      data: { status: 'failed', errorMessage: err.message, updatedAt: Date.now() }
    })
    return resp(EXPORT_FAILED, `导出失败: ${err.message}`)
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) return resp(UNKNOWN, '无法获取用户身份')

  try {
    switch (event.action) {
      case 'createExportJob': return await createExportJob(openid)
      default: return resp(UNKNOWN, '未知 action')
    }
  } catch (err) {
    console.error('[export]', err)
    return resp(UNKNOWN, err.message || '服务错误')
  }
}
