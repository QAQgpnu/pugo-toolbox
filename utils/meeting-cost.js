// 会议成本计时器核心算法：全部基于时间戳推导，
// 切后台、锁屏或重进页面都可以按真实时间恢复。

const MAX_RECORDS = 50

function toNumber(value, fallback) {
  const number = parseFloat(String(value === undefined || value === null ? '' : value))
  return Number.isFinite(number) ? number : fallback
}

// 按口径折算成“每人每小时成本”。
function hourlyRate(options) {
  const payType = options && options.payType === 'monthly' ? 'monthly' : 'hourly'
  const amount = toNumber(options && options.amount, NaN)
  if (!Number.isFinite(amount) || amount <= 0) return null

  if (payType === 'hourly') return amount

  const workDays = toNumber(options && options.workDaysPerMonth, NaN)
  const workHours = toNumber(options && options.workHoursPerDay, NaN)
  if (!Number.isFinite(workDays) || workDays <= 0 || workDays > 31) return null
  if (!Number.isFinite(workHours) || workHours <= 0 || workHours > 24) return null
  return amount / (workDays * workHours)
}

function costFor(rate, people, durationMs) {
  if (!Number.isFinite(rate) || rate <= 0) return 0
  const safePeople = Math.max(1, Math.round(toNumber(people, 1) || 1))
  const safeDuration = Math.max(0, toNumber(durationMs, 0) || 0)
  return rate * safePeople * (safeDuration / 3600000)
}

function normalizeSession(raw) {
  if (!raw || typeof raw !== 'object') return null
  const status = raw.status
  if (status !== 'running' && status !== 'paused') return null
  const startedAt = toNumber(raw.startedAt, NaN)
  const accumulatedMs = Math.max(0, toNumber(raw.accumulatedMs, 0) || 0)
  if (!Number.isFinite(startedAt) || startedAt <= 0) return null
  return { status, startedAt, accumulatedMs }
}

function startSession(now) {
  return { status: 'running', startedAt: now, accumulatedMs: 0 }
}

function pauseSession(session, now) {
  const safe = normalizeSession(session)
  if (!safe || safe.status !== 'running') return safe
  return {
    status: 'paused',
    startedAt: safe.startedAt,
    accumulatedMs: safe.accumulatedMs + Math.max(0, now - safe.startedAt)
  }
}

function resumeSession(session, now) {
  const safe = normalizeSession(session)
  if (!safe || safe.status !== 'paused') return safe
  return { status: 'running', startedAt: now, accumulatedMs: safe.accumulatedMs }
}

// 当前累计时长：进行中按“已积累 + 本轮流逝”计算，暂停中只取已积累。
function currentDurationMs(session, now) {
  const safe = normalizeSession(session)
  if (!safe) return 0
  if (safe.status === 'paused') return safe.accumulatedMs
  return safe.accumulatedMs + Math.max(0, now - safe.startedAt)
}

function finishSession(session, now) {
  const safe = normalizeSession(session)
  if (!safe) return null
  return currentDurationMs(safe, now)
}

function formatClock(totalMs) {
  const totalSeconds = Math.floor(Math.max(0, totalMs) / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value) => String(value).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

function formatCost(value) {
  const number = toNumber(value, 0) || 0
  if (number >= 10000) return `${(number / 10000).toFixed(2)} 万元`
  return `${number.toFixed(2)} 元`
}

function localDateKey(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// 周一作为一周的起点。
function weekStartKey(date) {
  const day = date.getDay() || 7
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - (day - 1))
  return localDateKey(monday)
}

function normalizeRecord(raw) {
  if (!raw || typeof raw !== 'object') return null
  const startedAt = toNumber(raw.startedAt, NaN)
  const endedAt = toNumber(raw.endedAt, NaN)
  const durationMs = Math.max(0, toNumber(raw.durationMs, endedAt - startedAt) || 0)
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt < startedAt) return null
  return {
    id: String(raw.id || `${startedAt}`),
    startedAt,
    endedAt,
    durationMs,
    people: Math.max(1, Math.round(toNumber(raw.people, 1) || 1)),
    rate: Math.max(0, toNumber(raw.rate, 0) || 0),
    cost: Math.max(0, toNumber(raw.cost, 0) || 0)
  }
}

function addRecord(records, record) {
  const safe = normalizeRecord(record)
  if (!safe) return Array.isArray(records) ? records.slice() : []
  const base = Array.isArray(records) ? records.filter((item) => item && item.id !== safe.id) : []
  return [safe].concat(base).slice(0, MAX_RECORDS)
}

function removeRecord(records, id) {
  return (Array.isArray(records) ? records : []).filter((item) => item && item.id !== id)
}

function recordDateKey(record) {
  return localDateKey(new Date(record.startedAt))
}

function weekSummary(records, now) {
  const startKey = weekStartKey(new Date(now))
  const weekRecords = []
  ;(Array.isArray(records) ? records : []).forEach((record) => {
    const safe = normalizeRecord(record)
    if (safe && recordDateKey(safe) >= startKey) weekRecords.push(safe)
  })
  let durationMs = 0
  let cost = 0
  weekRecords.forEach((record) => {
    durationMs += record.durationMs
    cost += record.cost
  })
  return {
    count: weekRecords.length,
    durationMs,
    cost,
    records: weekRecords
  }
}

module.exports = {
  MAX_RECORDS,
  hourlyRate,
  costFor,
  normalizeSession,
  startSession,
  pauseSession,
  resumeSession,
  currentDurationMs,
  finishSession,
  formatClock,
  formatCost,
  weekStartKey,
  normalizeRecord,
  addRecord,
  removeRecord,
  weekSummary
}
