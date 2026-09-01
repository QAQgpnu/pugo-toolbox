const EVENT_IDS = Object.freeze({
  TOOL_OPEN: 'pugo_tool_open',
  TOOL_ACTION: 'pugo_tool_action',
  COPY_RESULT: 'pugo_copy_result',
  FAVORITE_CHANGE: 'pugo_favorite'
})

const EVENT_FIELDS = Object.freeze({
  [EVENT_IDS.TOOL_OPEN]: Object.freeze(['tool_id']),
  [EVENT_IDS.TOOL_ACTION]: Object.freeze(['tool_id', 'action_id', 'result']),
  [EVENT_IDS.COPY_RESULT]: Object.freeze(['tool_id']),
  [EVENT_IDS.FAVORITE_CHANGE]: Object.freeze(['tool_id', 'state'])
})

// 周期记录属于敏感健康相关数据；表格文本整理、成分 OCR 与证件照会经手
// 用户原始文本或图片，按 1.4.0 约定完全不进入匿名统计。即使调用方误触发任意行为事件，
// 也统一在上报边界拦截，避免只封住某一种事件后又从其他入口泄漏。
const SENSITIVE_TOOL_IDS = Object.freeze(['period', 'table-cleaner', 'cosmetics', 'photo-bg'])

function isSensitiveTool(toolId) {
  return SENSITIVE_TOOL_IDS.includes(String(toolId || ''))
}

function shouldBlockReport(data) {
  return isSensitiveTool(data && data.tool_id)
}

function sanitizeData(eventId, data) {
  const safe = {}
  const allowedFields = EVENT_FIELDS[eventId]
  if (!allowedFields) return safe
  const source = data || {}
  if (shouldBlockReport(source)) return safe

  allowedFields.forEach((key) => {
    const value = source[key]
    if (typeof value === 'string') safe[key] = value.slice(0, 64)
  })
  return safe
}

function report(eventId, data) {
  if (!EVENT_FIELDS[eventId]) return false
  if (shouldBlockReport(data)) return false
  if (typeof wx === 'undefined' || typeof wx.reportEvent !== 'function') return false

  try {
    wx.reportEvent(eventId, sanitizeData(eventId, data || {}))
    return true
  } catch (error) {
    return false
  }
}

function trackToolOpen(toolId) {
  return report(EVENT_IDS.TOOL_OPEN, { tool_id: toolId })
}

function trackToolAction(toolId, actionId, result) {
  return report(EVENT_IDS.TOOL_ACTION, {
    tool_id: toolId,
    action_id: actionId,
    result: result || 'success'
  })
}

function trackCopy(toolId) {
  return report(EVENT_IDS.COPY_RESULT, { tool_id: toolId })
}

function trackFavorite(toolId, isFavorite) {
  return report(EVENT_IDS.FAVORITE_CHANGE, {
    tool_id: toolId,
    state: isFavorite ? 'added' : 'removed'
  })
}

module.exports = {
  EVENT_IDS,
  EVENT_FIELDS,
  SENSITIVE_TOOL_IDS,
  isSensitiveTool,
  shouldBlockReport,
  sanitizeData,
  report,
  trackToolOpen,
  trackToolAction,
  trackCopy,
  trackFavorite
}
