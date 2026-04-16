// cloudfunctions/photos/index.js
const cloud = require('wx-server-sdk')
const COS = require('cos-nodejs-sdk-v5')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const photosCol = db.collection('photos')
const users = db.collection('users')

const OK = 0
const UNKNOWN = 1000
const COUPLE_NOT_BOUND = 3006
const PHOTO_NOT_FOUND = 4001
const PHOTO_ALREADY_CONFIRMED = 4002
const PHOTO_COS_NOT_FOUND = 4003

function resp(code, message, data = null) {
  return { code, message, data }
}

// 初始化 COS
function getCOS() {
  return new COS({
    SecretId: process.env.COS_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY
  })
}

const BUCKET = process.env.COS_BUCKET
const REGION = process.env.COS_REGION
const SIGN_EXPIRE = parseInt(process.env.SIGN_URL_EXPIRE_SECONDS || '600')

// 获取用户并校验绑定状态
async function getUserWithCouple(openid) {
  const { data } = await users.where({ openid }).get()
  const user = data[0]
  if (!user || !user.coupleId) return { user, coupleId: null }
  return { user, coupleId: user.coupleId }
}

// 生成唯一 photoId
function genPhotoId() {
  return `ph_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// 路径生成
function cosKey(coupleId, photoId, filename, takenAt) {
  const d = new Date(takenAt || Date.now())
  const yyyy = d.getFullYear()
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  return `couples/${coupleId}/photos/original/${yyyy}/${MM}/${photoId}-${filename}`
}

function thumbKey(coupleId, photoId, takenAt) {
  const d = new Date(takenAt || Date.now())
  const yyyy = d.getFullYear()
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  return `couples/${coupleId}/photos/thumb/${yyyy}/${MM}/${photoId}.jpg`
}

// 检查对象是否存在
function cosObjectExists(cos, key) {
  return new Promise((resolve) => {
    cos.headObject({ Bucket: BUCKET, Region: REGION, Key: key }, (err) => {
      resolve(!err)
    })
  })
}

// 生成临时签名 URL
function signUrl(cos, key) {
  return new Promise((resolve, reject) => {
    cos.getObjectUrl(
      { Bucket: BUCKET, Region: REGION, Key: key, Sign: true, Expires: SIGN_EXPIRE },
      (err, data) => {
        if (err) reject(err)
        else resolve(data.Url)
      }
    )
  })
}

// 生成上传预签名 URL
function getUploadUrl(cos, key) {
  return new Promise((resolve, reject) => {
    cos.getObjectUrl(
      { Bucket: BUCKET, Region: REGION, Key: key, Sign: true, Method: 'PUT', Expires: 600 },
      (err, data) => {
        if (err) reject(err)
        else resolve(data.Url)
      }
    )
  })
}

// ---- actions ----

async function createUploadTicket(openid, event) {
  const { filename, mimeType, size, takenAt } = event
  if (!filename || !mimeType) return resp(UNKNOWN, '缺少参数 filename/mimeType')

  const { coupleId } = await getUserWithCouple(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const photoId = genPhotoId()
  const originalKey = cosKey(coupleId, photoId, filename, takenAt)
  const thumbnailKey = thumbKey(coupleId, photoId, takenAt)

  const cos = getCOS()
  const uploadUrl = await getUploadUrl(cos, originalKey)

  return resp(OK, 'ok', {
    photoId,
    cosKey: originalKey,
    thumbnailKey,
    uploadUrl,
    headers: { 'Content-Type': mimeType }
  })
}

async function confirmUpload(openid, event) {
  const { photoId, cosKey: key, thumbnailKey, originalName, size, mimeType, width, height, takenAt } = event
  if (!photoId || !key) return resp(UNKNOWN, '缺少参数')

  const { user, coupleId } = await getUserWithCouple(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  // 防止重复确认
  const existing = await photosCol.where({ _id: photoId }).get().catch(() => ({ data: [] }))
  if (existing.data.length > 0) return resp(PHOTO_ALREADY_CONFIRMED, '照片已存在')

  // 校验对象是否存在
  const cos = getCOS()
  const exists = await cosObjectExists(cos, key)
  if (!exists) return resp(PHOTO_COS_NOT_FOUND, '文件尚未上传到 COS')

  const now = Date.now()
  await photosCol.add({
    data: {
      _id: photoId,
      coupleId,
      uploadedBy: openid,
      cosKey: key,
      thumbnailKey,
      originalName: originalName || '',
      size: size || 0,
      mimeType: mimeType || 'image/jpeg',
      width: width || 0,
      height: height || 0,
      takenAt: takenAt || null,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      version: 1
    }
  })

  return resp(OK, '上传成功', { photoId })
}

async function listPhotos(openid, event) {
  const { page = 1, pageSize = 20, month } = event
  const { coupleId } = await getUserWithCouple(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  let query = photosCol.where({ coupleId, isDeleted: false })

  if (month) {
    // month 格式 YYYY/MM
    const [yyyy, mm] = month.split('/')
    const start = new Date(`${yyyy}-${mm}-01`).getTime()
    const end = new Date(`${yyyy}-${String(parseInt(mm) + 1).padStart(2, '0')}-01`).getTime()
    query = photosCol.where({
      coupleId,
      isDeleted: false,
      createdAt: db.command.gte(start).and(db.command.lt(end))
    })
  }

  const total = await query.count()
  const { data } = await query
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return resp(OK, 'ok', { list: data, total: total.total, page, pageSize })
}

async function getPhotoDetail(openid, event) {
  const { photoId } = event
  if (!photoId) return resp(UNKNOWN, '缺少 photoId')

  const { coupleId } = await getUserWithCouple(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const { data } = await photosCol.where({ _id: photoId, coupleId }).get()
  if (!data.length) return resp(PHOTO_NOT_FOUND, '照片不存在')

  const photo = data[0]
  const cos = getCOS()

  const [thumbUrl, originalUrl] = await Promise.all([
    signUrl(cos, photo.thumbnailKey).catch(() => ''),
    signUrl(cos, photo.cosKey).catch(() => '')
  ])

  return resp(OK, 'ok', { photo, thumbUrl, originalUrl })
}

async function deletePhoto(openid, event) {
  const { photoId } = event
  if (!photoId) return resp(UNKNOWN, '缺少 photoId')

  const { coupleId } = await getUserWithCouple(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const { data } = await photosCol.where({ _id: photoId, coupleId, isDeleted: false }).get()
  if (!data.length) return resp(PHOTO_NOT_FOUND, '照片不存在或已删除')

  const now = Date.now()
  await photosCol.doc(photoId).update({
    data: { isDeleted: true, deletedAt: now, deletedBy: openid, updatedAt: now }
  })

  return resp(OK, '已移入回收站')
}

async function restorePhoto(openid, event) {
  const { photoId } = event
  if (!photoId) return resp(UNKNOWN, '缺少 photoId')

  const { coupleId } = await getUserWithCouple(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const { data } = await photosCol.where({ _id: photoId, coupleId, isDeleted: true }).get()
  if (!data.length) return resp(PHOTO_NOT_FOUND, '照片不存在或未被删除')

  const now = Date.now()
  await photosCol.doc(photoId).update({
    data: { isDeleted: false, deletedAt: null, deletedBy: null, updatedAt: now }
  })

  return resp(OK, '已恢复')
}

async function listRecycleBin(openid, event) {
  const { page = 1, pageSize = 20 } = event
  const { coupleId } = await getUserWithCouple(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '请先绑定情侣空间')

  const query = photosCol.where({ coupleId, isDeleted: true })
  const total = await query.count()
  const { data } = await query
    .orderBy('deletedAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return resp(OK, 'ok', { list: data, total: total.total, page, pageSize })
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) return resp(UNKNOWN, '无法获取用户身份')

  try {
    switch (event.action) {
      case 'createUploadTicket': return await createUploadTicket(openid, event)
      case 'confirmUpload': return await confirmUpload(openid, event)
      case 'listPhotos': return await listPhotos(openid, event)
      case 'getPhotoDetail': return await getPhotoDetail(openid, event)
      case 'deletePhoto': return await deletePhoto(openid, event)
      case 'restorePhoto': return await restorePhoto(openid, event)
      case 'listRecycleBin': return await listRecycleBin(openid, event)
      default: return resp(UNKNOWN, '未知 action')
    }
  } catch (err) {
    console.error('[photos]', err)
    return resp(UNKNOWN, err.message || '服务错误')
  }
}
