const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const OK = 0
const UNKNOWN = 1000
const COUPLE_NOT_BOUND = 3006
const BUCKET_ITEM_NOT_FOUND = 8201
const BUCKET_ALREADY_DONE = 8202

function resp(code, message, data) {
  return { code, message, data: data || null }
}

async function getCoupleId(openid) {
  const res = await db.collection('users').where({ openid }).limit(1).get()
  if (!res.data.length || !res.data[0].coupleId) return null
  return res.data[0].coupleId
}

async function listItems(event, openid) {
  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '未绑定伴侣')

  const res = await db.collection('bucket_items')
    .where({ coupleId, isDeleted: false })
    .orderBy('completedAt', 'desc')
    .limit(200)
    .get()

  const fileIDs = res.data
    .map(i => i.photoFileID)
    .filter(f => f && f.startsWith('cloud://'))

  let urlMap = {}
  if (fileIDs.length) {
    try {
      const { fileList } = await cloud.getTempFileURL({ fileList: fileIDs })
      fileList.forEach(({ fileID, tempFileURL }) => { urlMap[fileID] = tempFileURL })
    } catch (e) {}
  }

  const items = res.data.map(i => ({
    ...i,
    photoUrl: urlMap[i.photoFileID] || i.photoFileID || ''
  }))

  return resp(OK, 'ok', { items })
}

async function completeItem(event, openid) {
  const { itemIndex, photoFileID, description, location, doneDate } = event
  if (itemIndex === undefined || itemIndex === null) return resp(UNKNOWN, '缺少 itemIndex')
  if (!photoFileID) return resp(UNKNOWN, '请上传照片')

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '未绑定伴侣')

  const existing = await db.collection('bucket_items')
    .where({ coupleId, itemIndex, isDeleted: false })
    .limit(1).get()
  if (existing.data.length) return resp(BUCKET_ALREADY_DONE, '这件小事已经完成过了')

  const now = Date.now()
  await db.collection('bucket_items').add({
    data: {
      coupleId,
      itemIndex,
      completedBy: openid,
      photoFileID,
      description: description || '',
      location: location || '',
      doneDate: doneDate || '',
      completedAt: now,
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    }
  })
  return resp(OK, 'ok')
}

async function deleteItem(event, openid) {
  const { id } = event
  if (!id) return resp(UNKNOWN, '缺少 id')

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '未绑定伴侣')

  const res = await db.collection('bucket_items').doc(id).get()
  if (!res.data || res.data.isDeleted) return resp(BUCKET_ITEM_NOT_FOUND, '记录不存在')
  if (res.data.completedBy !== openid) return resp(UNKNOWN, '只有完成者才能删除')

  await db.collection('bucket_items').doc(id).update({
    data: { isDeleted: true, updatedAt: Date.now() }
  })
  return resp(OK, 'ok')
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    switch (event.action) {
      case 'listItems': return await listItems(event, OPENID)
      case 'completeItem': return await completeItem(event, OPENID)
      case 'deleteItem': return await deleteItem(event, OPENID)
      default: return resp(UNKNOWN, 'unknown action')
    }
  } catch (e) {
    return resp(UNKNOWN, e.message || 'server error')
  }
}
