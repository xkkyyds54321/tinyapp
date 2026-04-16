// cloudfunctions/backup/index.js
// 定时触发器：每天凌晨 3 点
const cloud = require('wx-server-sdk')
const COS = require('cos-nodejs-sdk-v5')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const backupJobs = db.collection('backup_jobs')

const OK = 0
const BACKUP_FAILED = 7002

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

// 列出 COS 下照片所有对象
function listAllObjects(cos, prefix) {
  return new Promise((resolve, reject) => {
    cos.getBucket(
      { Bucket: process.env.COS_BUCKET, Region: process.env.COS_REGION, Prefix: prefix, MaxKeys: 1000 },
      (err, data) => { if (err) reject(err); else resolve(data.Contents || []) }
    )
  })
}

async function runDailyBackup() {
  const now = Date.now()
  const jobDate = yyyyMMdd(now)

  const jobRes = await backupJobs.add({
    data: {
      jobDate,
      status: 'processing',
      dbSnapshotKey: null,
      photoManifestKey: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now
    }
  })
  const jobId = jobRes._id

  try {
    // 1. 导出数据库快照
    const [usersData, couplesData, photosData, annivData, msgsData] = await Promise.all([
      db.collection('users').get(),
      db.collection('couples').get(),
      db.collection('photos').get(),
      db.collection('anniversaries').get(),
      db.collection('messages').get()
    ])

    const snapshot = {
      backupDate: jobDate,
      createdAt: now,
      users: usersData.data,
      couples: couplesData.data,
      photos: photosData.data,
      anniversaries: annivData.data,
      messages: msgsData.data
    }

    const dbSnapshotKey = `system/backups/${jobDate}/db-snapshot.json`
    const cos = getCOS()
    await putObject(cos, dbSnapshotKey, JSON.stringify(snapshot, null, 2))

    // 2. 生成照片对象清单
    const objects = await listAllObjects(cos, 'couples/')
    const manifest = {
      backupDate: jobDate,
      createdAt: now,
      total: objects.length,
      objects: objects.map((o) => ({ key: o.Key, size: o.Size, lastModified: o.LastModified }))
    }

    const photoManifestKey = `system/backups/${jobDate}/photos-manifest.json`
    await putObject(cos, photoManifestKey, JSON.stringify(manifest, null, 2))

    // 3. 更新 job 状态
    await backupJobs.doc(jobId).update({
      data: {
        status: 'done',
        dbSnapshotKey,
        photoManifestKey,
        updatedAt: Date.now()
      }
    })

    return resp(OK, '备份完成', { jobDate, dbSnapshotKey, photoManifestKey })
  } catch (err) {
    await backupJobs.doc(jobId).update({
      data: { status: 'failed', errorMessage: err.message, updatedAt: Date.now() }
    })
    return resp(BACKUP_FAILED, `备份失败: ${err.message}`)
  }
}

exports.main = async (event, context) => {
  try {
    return await runDailyBackup()
  } catch (err) {
    console.error('[backup]', err)
    return resp(BACKUP_FAILED, err.message || '备份失败')
  }
}
