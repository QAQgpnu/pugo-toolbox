const MAX_RECORDS = 50

function cleanText(value, maxLength = 40) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function uniqueId(prefix, now = Date.now(), random = Math.random()) {
  return `${prefix}-${now}-${String(random).slice(2, 8)}`
}

function validDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''))
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function dateToUtc(value) {
  if (!validDate(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(value, days) {
  const timestamp = dateToUtc(value)
  if (timestamp === null || !Number.isFinite(Number(days))) return ''
  const date = new Date(timestamp)
  date.setUTCDate(date.getUTCDate() + Math.floor(Number(days)))
  return date.toISOString().slice(0, 10)
}

function daysFrom(today, target) {
  const start = dateToUtc(today)
  const end = dateToUtc(target)
  return start === null || end === null ? null : Math.round((end - start) / 86400000)
}

function normalizeWhereRecords(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => ({
    id: cleanText(item && item.id, 80),
    name: cleanText(item && item.name),
    place: cleanText(item && item.place, 80),
    tag: cleanText(item && item.tag, 20),
    updatedAt: Number(item && item.updatedAt) || 0
  })).filter((item) => item.id && item.name && item.place).slice(0, MAX_RECORDS)
}

function addWhereRecord(records, name, place, tag, now = Date.now(), random = Math.random()) {
  const next = { id: uniqueId('where', now, random), name: cleanText(name), place: cleanText(place, 80), tag: cleanText(tag, 20), updatedAt: now }
  if (!next.name || !next.place) return normalizeWhereRecords(records)
  return [next].concat(normalizeWhereRecords(records)).slice(0, MAX_RECORDS)
}

function searchWhereRecords(records, query) {
  const term = cleanText(query, 80).toLowerCase()
  const list = normalizeWhereRecords(records)
  if (!term) return list
  return list.filter((item) => `${item.name} ${item.place} ${item.tag}`.toLowerCase().includes(term))
}

function normalizeLifecycleRecords(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => ({
    id: cleanText(item && item.id, 80),
    name: cleanText(item && item.name),
    intervalDays: Math.max(1, Math.min(3650, Math.floor(Number(item && item.intervalDays) || 0))),
    lastDate: validDate(item && item.lastDate) ? item.lastDate : '',
    nextDate: validDate(item && item.nextDate) ? item.nextDate : ''
  })).filter((item) => item.id && item.name && item.lastDate && item.nextDate).slice(0, MAX_RECORDS)
}

function addLifecycleRecord(records, name, lastDate, intervalDays, now = Date.now(), random = Math.random()) {
  const interval = Math.floor(Number(intervalDays))
  if (!cleanText(name) || !validDate(lastDate) || interval < 1 || interval > 3650) return normalizeLifecycleRecords(records)
  const next = { id: uniqueId('cycle', now, random), name: cleanText(name), intervalDays: interval, lastDate, nextDate: addDays(lastDate, interval) }
  return [next].concat(normalizeLifecycleRecords(records)).slice(0, MAX_RECORDS)
}

function markLifecycleDone(records, id, doneDate) {
  if (!validDate(doneDate)) return normalizeLifecycleRecords(records)
  return normalizeLifecycleRecords(records).map((item) => item.id === id
    ? Object.assign({}, item, { lastDate: doneDate, nextDate: addDays(doneDate, item.intervalDays) })
    : item)
}

function lifecycleStatus(nextDate, today) {
  const days = daysFrom(today, nextDate)
  if (days === null) return { tone: 'normal', text: '' }
  if (days < 0) return { tone: 'danger', text: `已超过 ${Math.abs(days)} 天` }
  if (days === 0) return { tone: 'warning', text: '今天该处理' }
  if (days <= 7) return { tone: 'warning', text: `还有 ${days} 天` }
  return { tone: 'normal', text: `${days} 天后` }
}

function normalizeQuickNotes(value, now = Date.now()) {
  if (!Array.isArray(value)) return []
  return value.map((item) => ({
    id: cleanText(item && item.id, 80),
    title: cleanText(item && item.title),
    detail: cleanText(item && item.detail, 120),
    createdAt: Number(item && item.createdAt) || 0,
    expiresAt: Number(item && item.expiresAt) || 0
  })).filter((item) => item.id && item.title && item.detail && item.expiresAt > now).sort((a, b) => a.expiresAt - b.expiresAt).slice(0, 30)
}

function addQuickNote(notes, title, detail, ttlHours, now = Date.now(), random = Math.random()) {
  const hours = Number(ttlHours)
  if (!cleanText(title) || !cleanText(detail, 120) || ![8, 24, 72, 168].includes(hours)) return normalizeQuickNotes(notes, now)
  const next = { id: uniqueId('note', now, random), title: cleanText(title), detail: cleanText(detail, 120), createdAt: now, expiresAt: now + hours * 3600000 }
  return [next].concat(normalizeQuickNotes(notes, now)).slice(0, 30)
}

function normalizeFoodRecords(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => ({ id: cleanText(item && item.id, 80), name: cleanText(item && item.name), expiryDate: validDate(item && item.expiryDate) ? item.expiryDate : '' }))
    .filter((item) => item.id && item.name && item.expiryDate).slice(0, MAX_RECORDS)
}

function addFoodRecord(records, name, expiryDate, now = Date.now(), random = Math.random()) {
  if (!cleanText(name) || !validDate(expiryDate)) return normalizeFoodRecords(records)
  return [{ id: uniqueId('food', now, random), name: cleanText(name), expiryDate }].concat(normalizeFoodRecords(records)).slice(0, MAX_RECORDS)
}

function foodStatus(expiryDate, today) {
  const days = daysFrom(today, expiryDate)
  if (days === null) return { tone: 'normal', text: '' }
  if (days < 0) return { tone: 'danger', text: `日期已过 ${Math.abs(days)} 天` }
  if (days === 0) return { tone: 'danger', text: '今天优先处理' }
  if (days <= 3) return { tone: 'warning', text: `${days} 天内优先处理` }
  return { tone: 'normal', text: `还有 ${days} 天` }
}

function sortFoodRecords(records, today) {
  return normalizeFoodRecords(records).map((item) => Object.assign({}, item, foodStatus(item.expiryDate, today)))
    .sort((a, b) => dateToUtc(a.expiryDate) - dateToUtc(b.expiryDate))
}

function parseLines(value) {
  const seen = new Set()
  return String(value || '').split(/\r?\n/).map((item) => cleanText(item)).filter((item) => item && !seen.has(item) && seen.add(item)).slice(0, 30)
}

function chooseFair(participants, history, random = Math.random()) {
  const names = Array.isArray(participants) ? participants.map((item) => cleanText(item)).filter(Boolean) : []
  if (names.length < 2) return null
  const list = Array.isArray(history) ? history.filter((item) => item && names.includes(item.name)).slice(0, 50) : []
  const counts = {}
  names.forEach((name) => { counts[name] = 0 })
  list.forEach((item) => { counts[item.name] += 1 })
  const minCount = Math.min(...Object.values(counts))
  let candidates = names.filter((name) => counts[name] === minCount)
  const lastName = list[0] && list[0].name
  if (candidates.length > 1 && lastName) candidates = candidates.filter((name) => name !== lastName)
  const index = Math.min(candidates.length - 1, Math.floor(Math.max(0, Number(random) || 0) * candidates.length))
  return { name: candidates[index], counts }
}

function pickTopTask(tasks) {
  const list = Array.isArray(tasks) ? tasks.filter((item) => item && cleanText(item.text)) : []
  if (!list.length) return null
  return list.slice().sort((a, b) => {
    const scoreA = (a.urgent ? 2 : 0) + (a.important ? 1 : 0)
    const scoreB = (b.urgent ? 2 : 0) + (b.important ? 1 : 0)
    return scoreB - scoreA || a.index - b.index
  })[0]
}

function calculateSplit(total, discount, extra, people) {
  if (String(total).trim() === '' || String(people).trim() === '') return null
  const values = [total, discount || 0, extra || 0, people].map(Number)
  if (!values.every(Number.isFinite) || values[0] < 0 || values[1] < 0 || values[2] < 0 || values[3] < 1 || !Number.isInteger(values[3])) return null
  const payable = Math.max(0, Math.round((values[0] - values[1] + values[2]) * 100))
  const base = Math.floor(payable / values[3])
  const remainder = payable - base * values[3]
  return { total: payable / 100, people: values[3], base: base / 100, remainder, first: (base + (remainder ? 1 : 0)) / 100 }
}

module.exports = {
  cleanText,
  validDate,
  formatDate,
  addDays,
  daysFrom,
  normalizeWhereRecords,
  addWhereRecord,
  searchWhereRecords,
  normalizeLifecycleRecords,
  addLifecycleRecord,
  markLifecycleDone,
  lifecycleStatus,
  normalizeQuickNotes,
  addQuickNote,
  normalizeFoodRecords,
  addFoodRecord,
  foodStatus,
  sortFoodRecords,
  parseLines,
  chooseFair,
  pickTopTask,
  calculateSplit
}
