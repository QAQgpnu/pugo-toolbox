const cycle = require('./cycle')

const PROMOTION_TYPES = Object.freeze([
  { id: 'keep', name: '限时免费入库', short: '喜加一' },
  { id: 'weekend', name: '免费周末试玩', short: '试玩' },
  { id: 'other', name: '其他限时活动', short: '活动' }
])

const MAX_RECORDS = 30

function normalizeRecord(record) {
  if (!record || typeof record !== 'object') return null
  const name = String(record.name || '').trim().slice(0, 60)
  const endDate = String(record.endDate || '')
  const type = PROMOTION_TYPES.some((item) => item.id === record.type) ? record.type : 'keep'
  if (!name || !cycle.parseLocalDate(endDate)) return null
  return {
    id: String(record.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    name,
    endDate,
    type,
    claimed: Boolean(record.claimed),
    createdAt: Number(record.createdAt) || Date.now()
  }
}

function normalizeCandidates(records) {
  const seen = {}
  return (Array.isArray(records) ? records : [])
    .map(normalizeRecord)
    .filter((item) => item && !seen[item.id] && (seen[item.id] = true))
}

function daysUntil(endDate, today) {
  const base = today || cycle.formatLocalDate(new Date())
  return cycle.daysBetween(base, endDate)
}

function retentionRank(record, today, pinnedId) {
  if (pinnedId && record.id === pinnedId) return 0
  const active = daysUntil(record.endDate, today) >= 0
  if (active && !record.claimed) return 1
  if (active && record.claimed) return 2
  if (!record.claimed) return 3
  return 4
}

function selectRecords(records, today, pinnedId) {
  const normalized = normalizeCandidates(records)
  normalized.sort((left, right) => {
    const priority = retentionRank(left, today, pinnedId) - retentionRank(right, today, pinnedId)
    if (priority) return priority
    const created = right.createdAt - left.createdAt
    if (created) return created
    return left.endDate.localeCompare(right.endDate)
  })
  return normalized
    .slice(0, MAX_RECORDS)
    .sort((left, right) => left.endDate.localeCompare(right.endDate) || right.createdAt - left.createdAt)
}

function normalizeRecords(records, today) {
  return selectRecords(records, today, '')
}

function addRecord(records, record, today) {
  const item = normalizeRecord(record)
  if (!item) return normalizeRecords(records, today)
  return selectRecords([item].concat(Array.isArray(records) ? records : []), today, item.id)
}

function presentRecord(record, today) {
  const item = normalizeRecord(record)
  if (!item) return null
  const days = daysUntil(item.endDate, today)
  const type = PROMOTION_TYPES.find((entry) => entry.id === item.type)
  let countdown = '今天截止'
  let state = 'urgent'
  if (days < 0) { countdown = `已过期 ${Math.abs(days)} 天`; state = 'expired' }
  else if (days > 0) { countdown = `还剩 ${days} 天`; state = days <= 2 ? 'urgent' : 'active' }
  return Object.assign({}, item, {
    days,
    typeName: type.name,
    typeShort: type.short,
    countdown,
    state
  })
}

function activeRecords(records, today) {
  return normalizeRecords(records, today).map((item) => presentRecord(item, today)).filter((item) => item.days >= 0)
}

module.exports = {
  PROMOTION_TYPES,
  MAX_RECORDS,
  normalizeRecord,
  normalizeCandidates,
  retentionRank,
  selectRecords,
  normalizeRecords,
  addRecord,
  daysUntil,
  presentRecord,
  activeRecords
}
