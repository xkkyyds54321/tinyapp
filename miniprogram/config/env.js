// config/env.js - 环境配置
const ENV = {
  dev: {
    // 从图片1获取的环境 ID
    ENV_ID: 'cloud1-7gpresv479f0c12c', 
    // 从图片2获取的存储桶名称 (Bucket)
    COS_BUCKET: 'shawn-1422162486', 
    // 从图片2获取的所属地域 (Region)
    COS_REGION: 'ap-guangzhou', 
    SIGN_URL_EXPIRE_SECONDS: 600
  },
  prod: {
    // 如果你有正式环境，请在此处填写；目前先复用 dev 配置或保持空
    ENV_ID: 'cloud1-7gpresv479f0c12c',
    COS_BUCKET: 'shawn-1422162486',
    COS_REGION: 'ap-guangzhou',
    SIGN_URL_EXPIRE_SECONDS: 600
  }
}

// 当前环境，开发阶段使用 'dev'
const CURRENT_ENV = 'dev'

const config = ENV[CURRENT_ENV]

module.exports = {
  ...config,
  CURRENT_ENV
}