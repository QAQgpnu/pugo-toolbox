function pad(value) { return String(value).padStart(2, '0') }

function parseLocalDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''))
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3])) return null
  return date
}

function formatLocalDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(value, days) {
  const date = value instanceof Date ? new Date(value.getTime()) : parseLocalDate(value)
  if (!date || !Number.isFinite(Number(days))) return ''
  date.setDate(date.getDate() + Number(days))
  return formatLocalDate(date)
}

function daysBetween(left, right) {
  const start = parseLocalDate(left)
  const end = parseLocalDate(right)
  if (!start || !end) return NaN
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.round((utcEnd - utcStart) / 86400000)
}

function normalizeRecords(records) {
  const seen = {}
  return (Array.isArray(records) ? records : [])
    .map((record) => ({
      date: String(record && record.date || ''),
      duration: Math.max(1, Math.min(10, Math.round(Number(record && record.duration) || 5)))
    }))
    .filter((record) => parseLocalDate(record.date) && !seen[record.date] && (seen[record.date] = true))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12)
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function estimateCycle(records, fallbackCycle = 28) {
  const normalized = normalizeRecords(records)
  if (!normalized.length) return null
  const intervals = []
  for (let index = 1; index < normalized.length; index += 1) {
    const interval = daysBetween(normalized[index - 1].date, normalized[index].date)
    if (interval >= 15 && interval <= 60) intervals.push(interval)
  }
  const defaultCycle = Math.max(15, Math.min(60, Math.round(Number(fallbackCycle) || 28)))
  const averageCycle = intervals.length ? Math.round(average(intervals)) : defaultCycle
  const averageDuration = Math.round(average(normalized.map((item) => item.duration)))
  const variation = intervals.length > 1 ? Math.max.apply(null, intervals) - Math.min.apply(null, intervals) : 0
  const margin = intervals.length > 1 ? Math.max(2, Math.min(7, Math.ceil(variation / 2))) : 3
  const lastDate = normalized[normalized.length - 1].date
  const nextDate = addDays(lastDate, averageCycle)
  return {
    records: normalized,
    intervals,
    averageCycle,
    averageDuration,
    variation,
    margin,
    lastDate,
    nextDate,
    windowStart: addDays(nextDate, -margin),
    windowEnd: addDays(nextDate, margin),
    expectedEnd: addDays(nextDate, averageDuration - 1),
    confidence: intervals.length >= 3 && variation <= 7 ? '较稳定' : intervals.length >= 1 ? '继续记录会更准' : '暂按手动周期估算'
  }
}

module.exports = {
  parseLocalDate,
  formatLocalDate,
  addDays,
  daysBetween,
  normalizeRecords,
  estimateCycle
}
