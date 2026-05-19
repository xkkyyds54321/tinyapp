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

  // 照片备注最大长度
  PHOTO_NOTE_MAX: 200,
  PHOTO_TAG_MAX_LEN: 10,
  PHOTO_TAGS_MAX: 5,

  // 心情日记
  MOOD_CONTENT_MAX: 200,

  // 账本
  BILL_NOTE_MAX: 50,
  BILL_CATEGORIES: [
    { key: 'dining', label: '餐饮', emoji: '🍜' },
    { key: 'travel', label: '出行', emoji: '🚗' },
    { key: 'shopping', label: '购物', emoji: '🛍' },
    { key: 'entertainment', label: '娱乐', emoji: '🎭' },
    { key: 'gift', label: '礼物', emoji: '🎁' },
    { key: 'other', label: '其他', emoji: '💰' }
  ],

  // 约定清单
  PROMISE_CONTENT_MAX: 100,

  // 纪念日提醒提前天数
  ANNIVERSARY_REMIND_DAYS: 3,

  // 里程碑天数
  MILESTONE_DAYS: [100, 200, 365, 500, 730, 1000, 1500, 1825, 2000, 3000],

  // 心情表情
  MOOD_EMOJIS: ['😊', '🥰', '😄', '😌', '🤗', '😁', '😴', '😢', '😔', '😤', '🤒', '😮'],

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
    LETTERS: 'letters',
    MOODS: 'moods',
    BILLS: 'bills',
    PROMISES: 'promises'
  }
}
