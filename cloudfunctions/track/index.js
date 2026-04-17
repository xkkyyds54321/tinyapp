const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const OK = 0
const UNKNOWN = 1000
const COUPLE_NOT_BOUND = 3006

function resp(code, message, data) {
  return { code, message, data: data || null }
}

async function getCoupleId(openid) {
  const res = await db.collection('users').where({ openid }).limit(1).get()
  if (!res.data.length || !res.data[0].coupleId) return null
  return res.data[0].coupleId
}

function dateKey(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function reportLocation(event, openid) {
  const { latitude, longitude, accuracy, speed } = event
  if (!latitude || !longitude) return resp(UNKNOWN, '缺少位置信息')

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '未绑定伴侣')

  const now = Date.now()
  await db.collection('track_locations').add({
    data: {
      coupleId,
      openid,
      latitude,
      longitude,
      accuracy: accuracy || 0,
      speed: speed || 0,
      reportedAt: now,
      dateKey: dateKey(now)
    }
  })

  // async cleanup: delete records older than 7 days (best effort)
  const sevenDaysAgo = now - 7 * 24 * 3600 * 1000
  db.collection('track_locations')
    .where({ coupleId, reportedAt: _.lt(sevenDaysAgo) })
    .remove()
    .catch(() => {})

  return resp(OK, 'ok')
}

async function getPartnerLocation(event, openid) {
  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '未绑定伴侣')

  const res = await db.collection('track_locations')
    .where({ coupleId, openid: _.neq(openid) })
    .orderBy('reportedAt', 'desc')
    .limit(1)
    .get()

  if (!res.data.length) return resp(OK, 'ok', { location: null })
  const loc = res.data[0]
  return resp(OK, 'ok', {
    location: {
      latitude: loc.latitude,
      longitude: loc.longitude,
      reportedAt: loc.reportedAt
    }
  })
}

async function getTodayTrack(event, openid) {
  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '未绑定伴侣')

  const today = dateKey(Date.now())
  const res = await db.collection('track_locations')
    .where({ coupleId, openid: _.neq(openid), dateKey: today })
    .orderBy('reportedAt', 'asc')
    .limit(500)
    .get()

  const points = res.data.map(l => ({
    latitude: l.latitude,
    longitude: l.longitude,
    reportedAt: l.reportedAt
  }))

  return resp(OK, 'ok', { points })
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    switch (event.action) {
      case 'reportLocation': return await reportLocation(event, OPENID)
      case 'getPartnerLocation': return await getPartnerLocation(event, OPENID)
      case 'getTodayTrack': return await getTodayTrack(event, OPENID)
      default: return resp(UNKNOWN, 'unknown action')
    }
  } catch (e) {
    return resp(UNKNOWN, e.message || 'server error')
  }
}
