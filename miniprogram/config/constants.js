// config/constants.js - 全局常量
module.exports = {
  // 分页
  PAGE_SIZE: 20,

  // 照片
  THUMB_MAX_SIDE: 1200,
  SIGN_URL_EXPIRE: 600,

  // 留言最大长度
  MESSAGE_MAX_LENGTH: 300,

  // 纪念日标题/备注最大长度
  ANNIVERSARY_TITLE_MAX: 30,
  ANNIVERSARY_REMARK_MAX: 200,

  // 情侣绑定码
  BIND_CODE_LENGTH: 6,

  // 情侣空间 pending 超时天数
  COUPLE_PENDING_EXPIRE_DAYS: 7,

  // 问答回答最大字数
  QUIZ_ANSWER_MAX: 200,

  // 情书
  LETTER_CONTENT_MAX: 2000,
  LETTER_TITLE_MAX: 30,

  // 100件小事完成描述最大字数
  BUCKET_DESC_MAX: 100,

  // 云函数名称
  CLOUD_FUNCTIONS: {
    AUTH: 'auth',
    COUPLE: 'couple',
    PHOTOS: 'photos',
    ANNIVERSARIES: 'anniversaries',
    MESSAGES: 'messages',
    EXPORT: 'export',
    BACKUP: 'backup',
    TRACK: 'track',
    QUIZ: 'quiz',
    BUCKET: 'bucket',
    LETTERS: 'letters'
  }
}
