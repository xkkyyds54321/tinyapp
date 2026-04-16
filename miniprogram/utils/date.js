// utils/date.js - 日期工具
/**
 * 毫秒时间戳 -> 显示字符串
 */
function formatTimestamp(ts, fmt = 'YYYY-MM-DD HH:mm') {
  if (!ts) return ''
  const d = new Date(ts)
  const map = {
    YYYY: d.getFullYear(),
    MM: String(d.getMonth() + 1).padStart(2, '0'),
    DD: String(d.getDate()).padStart(2, '0'),
    HH: String(d.getHours()).padStart(2, '0'),
    mm: String(d.getMinutes()).padStart(2, '0')
  }
  return fmt.replace(/YYYY|MM|DD|HH|mm/g, (key) => map[key])
}

/**
 * YYYY-MM-DD 字符串 -> 距今天数（正数=过去，负数=未来）
 */
function daysFromToday(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((today - target) / 86400000)
}

/**
 * 纪念日文案
 * 返回 { label, days }
 */
function anniversaryLabel(dateStr) {
  const days = daysFromToday(dateStr)
  if (days === null) return { label: '', days: 0 }
  if (days === 0) return { label: '就是今天 🎉', days: 0 }
  if (days > 0) return { label: `已在一起 ${days} 天`, days }
  return { label: `还有 ${-days} 天`, days }
}

/**
 * 相对时间（刚刚、X分钟前、X小时前、X天前、具体日期）
 */
function relativeTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  return formatTimestamp(ts, 'MM-DD')
}

/**
 * 当前时间戳（毫秒）
 */
function now() {
  return Date.now()
}

/**
 * yyyyMMdd 格式（备份用）
 */
function yyyyMMdd(ts) {
  const d = ts ? new Date(ts) : new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('')
}

/**
 * yyyy/MM 格式（相册月份筛选）
 */
function yyyyMM(ts) {
  const d = ts ? new Date(ts) : new Date()
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

module.exports = { formatTimestamp, daysFromToday, anniversaryLabel, relativeTime, now, yyyyMMdd, yyyyMM }
