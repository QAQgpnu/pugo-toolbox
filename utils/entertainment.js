const daily = require('./daily-tools')

const MAX_MOYU_RECORDS = 120
const MAX_VALUE_RECORDS = 20
const MAX_FOCUS_RECORDS = 180
const MOYU_SCENES = Object.freeze(['上厕所', '喝水', '发呆', '自定义'])
const FOCUS_MODES = Object.freeze({
  short: Object.freeze({ id: 'short', focusSeconds: 25 * 60, breakSeconds: 5 * 60, label: '25 / 5 分钟' }),
  long: Object.freeze({ id: 'long', focusSeconds: 50 * 60, breakSeconds: 10 * 60, label: '50 / 10 分钟' })
})

function clampInteger(value, min, max, fallback = min) {
  const number = Math.floor(Number(value))
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback
}

function localDateKey(timestamp = Date.now()) {
  return daily.formatDate(new Date(Number(timestamp) || Date.now()))
}

function normalizeWoodfishStats(value) {
  const source = value && typeof value === 'object' ? value : {}
  const rawDays = source.days && typeof source.days === 'object' ? source.days : {}
  const days = {}
  Object.keys(rawDays).sort().slice(-45).forEach((key) => {
    if (daily.validDate(key)) days[key] = clampInteger(rawDays[key], 0, 999999, 0)
  })
  const counted = Object.values(days).reduce((sum, count) => sum + count, 0)
  return { total: Math.max(counted, clampInteger(source.total, 0, 99999999, 0)), days }
}

function addWoodfishHit(value, dateKey = localDateKey(), amount = 1) {
  const stats = normalizeWoodfishStats(value)
  const increment = clampInteger(amount, 1, 100, 1)
  stats.days[dateKey] = clampInteger(stats.days[dateKey], 0, 999999, 0) + increment
  stats.total += increment
  return normalizeWoodfishStats(stats)
}

function clearWoodfishToday(value, dateKey = localDateKey()) {
  const stats = normalizeWoodfishStats(value)
  const today = stats.days[dateKey] || 0
  delete stats.days[dateKey]
  stats.total = Math.max(0, stats.total - today)
  return stats
}

function normalizeMoyuState(value) {
  const source = value && typeof value === 'object' ? value : {}
  const history = (Array.isArray(source.history) ? source.history : []).map((item) => {
    const startAt = Number(item && item.startAt) || 0
    const endAt = Number(item && item.endAt) || 0
    const durationMs = clampInteger(item && item.durationMs, 1000, 24 * 3600000, Math.max(1000, endAt - startAt))
    return {
      id: String(item && item.id || `moyu-${endAt}`).slice(0, 80),
      scene: MOYU_SCENES.includes(item && item.scene) ? item.scene : '自定义',
      startAt,
      endAt,
      durationMs
    }
  }).filter((item) => item.startAt > 0 && item.endAt >= item.startAt).slice(0, MAX_MOYU_RECORDS)
  const activeSource = source.active && typeof source.active === 'object' ? source.active : null
  const active = activeSource && Number(activeSource.startAt) > 0
    ? { startAt: Number(activeSource.startAt), scene: MOYU_SCENES.includes(activeSource.scene) ? activeSource.scene : '自定义' }
    : null
  return { active, history }
}

function startMoyu(value, scene = '上厕所', now = Date.now()) {
  const state = normalizeMoyuState(value)
  if (state.active) return state
  state.active = { startAt: Number(now), scene: MOYU_SCENES.includes(scene) ? scene : '自定义' }
  return state
}

function finishMoyu(value, now = Date.now()) {
  const state = normalizeMoyuState(value)
  if (!state.active) return { state, record: null }
  const endAt = Math.max(state.active.startAt + 1000, Number(now))
  const record = {
    id: `moyu-${endAt}`,
    scene: state.active.scene,
    startAt: state.active.startAt,
    endAt,
    durationMs: Math.min(24 * 3600000, endAt - state.active.startAt)
  }
  state.active = null
  state.history = [record].concat(state.history).slice(0, MAX_MOYU_RECORDS)
  return { state, record }
}

function mondayStart(timestamp) {
  const date = new Date(timestamp)
  const day = date.getDay() || 7
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - day + 1)
  return date.getTime()
}

function moyuSummary(value, now = Date.now()) {
  const state = normalizeMoyuState(value)
  const today = localDateKey(now)
  const weekStart = mondayStart(now)
  const durations = {}
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart + index * 86400000)
    return [daily.formatDate(date), 0]
  }).forEach((item) => { durations[item[0]] = item[1] })
  state.history.forEach((item) => {
    const key = localDateKey(item.endAt)
    if (Object.prototype.hasOwnProperty.call(durations, key)) durations[key] += item.durationMs
  })
  if (state.active) {
    const key = localDateKey(now)
    if (Object.prototype.hasOwnProperty.call(durations, key)) durations[key] += Math.max(0, now - state.active.startAt)
  }
  const week = Object.keys(durations).map((dateKey, index) => ({ dateKey, label: '一二三四五六日'[index], durationMs: durations[dateKey] }))
  return {
    activeDurationMs: state.active ? Math.max(0, now - state.active.startAt) : 0,
    todayMs: durations[today] || 0,
    weekMs: week.reduce((sum, item) => sum + item.durationMs, 0),
    week
  }
}

function formatClock(milliseconds) {
  const seconds = Math.max(0, Math.floor(Number(milliseconds) / 1000))
  const hours = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')
  const rest = String(seconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${rest}`
}

function normalizeDailyValueRecords(value) {
  return (Array.isArray(value) ? value : []).map((item) => ({
    id: String(item && item.id || '').slice(0, 80),
    name: daily.cleanText(item && item.name, 30),
    price: Number(item && item.price),
    purchaseDate: daily.validDate(item && item.purchaseDate) ? item.purchaseDate : '',
    targetDaily: Number(item && item.targetDaily),
    createdAt: Number(item && item.createdAt) || 0
  })).filter((item) => item.id && item.name && item.price > 0 && item.price <= 99999999 && item.purchaseDate && item.targetDaily > 0).slice(0, MAX_VALUE_RECORDS)
}

function calculateDailyValue(name, price, purchaseDate, targetDaily = 3, today = localDateKey()) {
  const cleanName = daily.cleanText(name, 30)
  const amount = Number(price)
  const target = Number(targetDaily)
  const elapsed = daily.daysFrom(purchaseDate, today)
  if (!cleanName || !Number.isFinite(amount) || amount <= 0 || amount > 99999999 || !daily.validDate(purchaseDate) || elapsed === null || elapsed < 0 || !Number.isFinite(target) || target <= 0) return null
  const usedDays = elapsed + 1
  const targetDays = Math.max(1, Math.ceil(amount / target))
  const remainingDays = Math.max(0, targetDays - usedDays)
  return {
    name: cleanName,
    price: amount,
    purchaseDate,
    targetDaily: target,
    usedDays,
    dailyValue: amount / usedDays,
    remainingDays,
    targetDate: daily.addDays(purchaseDate, targetDays - 1)
  }
}

function saveDailyValueRecord(records, result, now = Date.now()) {
  if (!result) return normalizeDailyValueRecords(records)
  const item = Object.assign({}, result, { id: `value-${now}`, createdAt: now })
  return [item].concat(normalizeDailyValueRecords(records).filter((old) => old.name !== item.name)).slice(0, MAX_VALUE_RECORDS)
}

function normalizeFocusState(value, modeId = 'short') {
  const source = value && typeof value === 'object' ? value : {}
  const mode = FOCUS_MODES[source.modeId] || FOCUS_MODES[modeId] || FOCUS_MODES.short
  const status = ['idle', 'running', 'paused'].includes(source.status) ? source.status : 'idle'
  return {
    modeId: mode.id,
    status,
    startedAt: status === 'running' ? Number(source.startedAt) || 0 : 0,
    endAt: status === 'running' ? Number(source.endAt) || 0 : 0,
    remainingSeconds: status === 'paused' ? clampInteger(source.remainingSeconds, 1, mode.focusSeconds, mode.focusSeconds) : mode.focusSeconds
  }
}

function startFocus(value, modeId = 'short', now = Date.now()) {
  const state = normalizeFocusState(value, modeId)
  const mode = FOCUS_MODES[state.modeId]
  if (state.status === 'running') return state
  const remaining = state.status === 'paused' ? state.remainingSeconds : mode.focusSeconds
  return { modeId: state.modeId, status: 'running', startedAt: Number(now), endAt: Number(now) + remaining * 1000, remainingSeconds: remaining }
}

function pauseFocus(value, now = Date.now()) {
  const state = normalizeFocusState(value)
  if (state.status !== 'running') return state
  return { modeId: state.modeId, status: 'paused', startedAt: 0, endAt: 0, remainingSeconds: Math.max(1, Math.ceil((state.endAt - now) / 1000)) }
}

function resetFocus(modeId = 'short') {
  return normalizeFocusState({}, modeId)
}

function focusRemaining(value, now = Date.now()) {
  const state = normalizeFocusState(value)
  if (state.status === 'running') return Math.max(0, Math.ceil((state.endAt - now) / 1000))
  return state.remainingSeconds
}

function normalizeFocusHistory(value) {
  return (Array.isArray(value) ? value : []).map((item) => ({
    id: String(item && item.id || '').slice(0, 80),
    modeId: FOCUS_MODES[item && item.modeId] ? item.modeId : 'short',
    completedAt: Number(item && item.completedAt) || 0,
    minutes: clampInteger(item && item.minutes, 1, 180, 25)
  })).filter((item) => item.id && item.completedAt > 0).slice(0, MAX_FOCUS_RECORDS)
}

function addFocusCompletion(history, modeId = 'short', now = Date.now()) {
  const mode = FOCUS_MODES[modeId] || FOCUS_MODES.short
  const record = { id: `focus-${now}`, modeId: mode.id, completedAt: now, minutes: Math.round(mode.focusSeconds / 60) }
  return [record].concat(normalizeFocusHistory(history)).slice(0, MAX_FOCUS_RECORDS)
}

function focusWeekSummary(history, now = Date.now()) {
  const records = normalizeFocusHistory(history)
  const weekStart = mondayStart(now)
  const week = Array.from({ length: 7 }, (_, index) => {
    const dateKey = localDateKey(weekStart + index * 86400000)
    const items = records.filter((item) => localDateKey(item.completedAt) === dateKey)
    return { dateKey, label: '一二三四五六日'[index], count: items.length, minutes: items.reduce((sum, item) => sum + item.minutes, 0) }
  })
  const todayKey = localDateKey(now)
  const today = week.find((item) => item.dateKey === todayKey) || { count: 0, minutes: 0 }
  return { today, week }
}

function formatFocusClock(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0))
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

module.exports = {
  MOYU_SCENES,
  FOCUS_MODES,
  localDateKey,
  normalizeWoodfishStats,
  addWoodfishHit,
  clearWoodfishToday,
  normalizeMoyuState,
  startMoyu,
  finishMoyu,
  moyuSummary,
  formatClock,
  normalizeDailyValueRecords,
  calculateDailyValue,
  saveDailyValueRecord,
  normalizeFocusState,
  startFocus,
  pauseFocus,
  resetFocus,
  focusRemaining,
  normalizeFocusHistory,
  addFocusCompletion,
  focusWeekSummary,
  formatFocusClock
}
