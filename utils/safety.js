const MAX_LISTS = 12
const MAX_ITEMS_PER_LIST = 20
const MAX_HISTORY = 30

const DEFAULT_TEMPLATES = Object.freeze([
  Object.freeze({
    id: 'leaving-home',
    name: '出门前检查',
    description: '门窗、水电、随身物品',
    symbol: '出',
    isCustom: false,
    items: Object.freeze([
      Object.freeze({ id: 'door', label: '入户门已锁好', critical: true }),
      Object.freeze({ id: 'windows', label: '窗户已关闭', critical: true }),
      Object.freeze({ id: 'gas', label: '燃气和灶具已关闭', critical: true }),
      Object.freeze({ id: 'water', label: '水龙头已关闭', critical: true }),
      Object.freeze({ id: 'power', label: '非必要电器已断电', critical: false }),
      Object.freeze({ id: 'essentials', label: '手机、钥匙和证件已带', critical: false }),
      Object.freeze({ id: 'pets', label: '宠物已妥善安置', critical: false })
    ])
  }),
  Object.freeze({
    id: 'before-sleep',
    name: '睡前检查',
    description: '门锁、热源、次日准备',
    symbol: '睡',
    isCustom: false,
    items: Object.freeze([
      Object.freeze({ id: 'door', label: '入户门已锁好', critical: true }),
      Object.freeze({ id: 'gas', label: '燃气和灶具已关闭', critical: true }),
      Object.freeze({ id: 'heat', label: '明火和高温热源已关闭', critical: true }),
      Object.freeze({ id: 'charging', label: '充电设备放置安全', critical: false }),
      Object.freeze({ id: 'water', label: '水龙头已关闭', critical: false }),
      Object.freeze({ id: 'alarm', label: '闹钟和次日事项已确认', critical: false }),
      Object.freeze({ id: 'medicine', label: '所需药物已准备', critical: false })
    ])
  }),
  Object.freeze({
    id: 'long-away',
    name: '长期离家检查',
    description: '总阀、电源、生活安排',
    symbol: '久',
    isCustom: false,
    items: Object.freeze([
      Object.freeze({ id: 'doors-windows', label: '门窗已全部锁闭', critical: true }),
      Object.freeze({ id: 'gas-valve', label: '燃气总阀已关闭', critical: true }),
      Object.freeze({ id: 'water-valve', label: '总水阀或关键水阀已确认', critical: true }),
      Object.freeze({ id: 'power', label: '非必要电源已断开', critical: true }),
      Object.freeze({ id: 'fridge', label: '冰箱和易腐食品已处理', critical: false }),
      Object.freeze({ id: 'trash', label: '垃圾已清理', critical: false }),
      Object.freeze({ id: 'deliveries', label: '快递和邮件已安排', critical: false }),
      Object.freeze({ id: 'care', label: '宠物和植物已妥善安置', critical: false })
    ])
  })
])

function cleanText(value, maxLength) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

function cloneItem(item) {
  return { id: item.id, label: item.label, critical: Boolean(item.critical) }
}

function cloneList(list) {
  return {
    id: list.id,
    name: list.name,
    description: list.description || '',
    symbol: list.symbol || '查',
    isCustom: Boolean(list.isCustom),
    items: list.items.map(cloneItem)
  }
}

function defaultLists() {
  return DEFAULT_TEMPLATES.map(cloneList)
}

function normalizeLists(value) {
  if (!Array.isArray(value) || !value.length) return defaultLists()
  const seenLists = new Set()
  const lists = []

  value.slice(0, MAX_LISTS).forEach((source) => {
    if (!source || typeof source !== 'object') return
    const id = cleanText(source.id, 64)
    const name = cleanText(source.name, 16)
    if (!id || !name || seenLists.has(id)) return
    const seenItems = new Set()
    const items = []
    ;(Array.isArray(source.items) ? source.items : []).slice(0, MAX_ITEMS_PER_LIST).forEach((item) => {
      if (!item || typeof item !== 'object') return
      const itemId = cleanText(item.id, 64)
      const label = cleanText(item.label, 32)
      if (!itemId || !label || seenItems.has(itemId)) return
      seenItems.add(itemId)
      items.push({ id: itemId, label, critical: Boolean(item.critical) })
    })
    if (!items.length) return
    seenLists.add(id)
    lists.push({
      id,
      name,
      description: cleanText(source.description, 30),
      symbol: cleanText(source.symbol, 2) || '查',
      isCustom: Boolean(source.isCustom),
      items
    })
  })
  return lists.length ? lists : defaultLists()
}

function makeId(prefix, now, randomValue) {
  return `${prefix}-${Number(now).toString(36)}-${Math.floor(Number(randomValue) * 1000000).toString(36)}`
}

function createCustomList(name, firstItemLabel, now = Date.now(), randomValue = Math.random()) {
  const cleanName = cleanText(name, 16)
  const cleanItemLabel = cleanText(firstItemLabel, 32)
  if (!cleanName || !cleanItemLabel) return null
  return {
    id: makeId('custom', now, randomValue),
    name: cleanName,
    description: '我的自定义检查清单',
    symbol: cleanName.slice(0, 1),
    isCustom: true,
    items: [{ id: makeId('item', now + 1, randomValue), label: cleanItemLabel, critical: false }]
  }
}

function addList(lists, list) {
  const normalized = normalizeLists(lists)
  if (!list || normalized.length >= MAX_LISTS || normalized.some((item) => item.id === list.id)) return normalized
  return normalized.concat([cloneList(list)])
}

function addItem(lists, listId, label, critical, now = Date.now(), randomValue = Math.random()) {
  const cleanLabel = cleanText(label, 32)
  if (!cleanLabel) return normalizeLists(lists)
  return normalizeLists(lists).map((list) => {
    if (list.id !== listId || list.items.length >= MAX_ITEMS_PER_LIST) return list
    return Object.assign({}, list, {
      items: list.items.concat([{ id: makeId('item', now, randomValue), label: cleanLabel, critical: Boolean(critical) }])
    })
  })
}

function removeItem(lists, listId, itemId) {
  return normalizeLists(lists).map((list) => {
    if (list.id !== listId || list.items.length <= 1) return list
    return Object.assign({}, list, { items: list.items.filter((item) => item.id !== itemId) })
  })
}

function deleteCustomList(lists, listId) {
  const normalized = normalizeLists(lists)
  const target = normalized.find((list) => list.id === listId)
  return target && target.isCustom ? normalized.filter((list) => list.id !== listId) : normalized
}

function createSession(list, now = Date.now(), randomValue = Math.random()) {
  if (!list || !Array.isArray(list.items) || !list.items.length) return null
  return {
    id: makeId('session', now, randomValue),
    listId: list.id,
    listName: list.name,
    startedAt: now,
    items: list.items.map((item) => ({
      id: item.id,
      label: item.label,
      critical: Boolean(item.critical),
      checked: false
    }))
  }
}

function normalizeSession(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.items)) return null
  const items = value.items
    .filter((item) => item && cleanText(item.id, 64) && cleanText(item.label, 32))
    .slice(0, MAX_ITEMS_PER_LIST)
    .map((item) => ({
      id: cleanText(item.id, 64),
      label: cleanText(item.label, 32),
      critical: Boolean(item.critical),
      checked: Boolean(item.checked)
    }))
  if (!items.length) return null
  return {
    id: cleanText(value.id, 64),
    listId: cleanText(value.listId, 64),
    listName: cleanText(value.listName, 16) || '安全自查',
    startedAt: Number(value.startedAt) || Date.now(),
    items
  }
}

function toggleSessionItem(session, itemId) {
  const normalized = normalizeSession(session)
  if (!normalized) return null
  normalized.items = normalized.items.map((item) => item.id === itemId
    ? Object.assign({}, item, { checked: !item.checked })
    : item)
  return normalized
}

function sessionProgress(session) {
  const normalized = normalizeSession(session)
  if (!normalized) return { checked: 0, total: 0, percent: 0, complete: false }
  const checked = normalized.items.filter((item) => item.checked).length
  const total = normalized.items.length
  return { checked, total, percent: Math.round(checked / total * 100), complete: checked === total }
}

function buildHistoryRecord(session, completedAt = Date.now()) {
  const normalized = normalizeSession(session)
  const progress = sessionProgress(normalized)
  if (!normalized || !progress.complete) return null
  return {
    id: normalized.id,
    listId: normalized.listId,
    listName: normalized.listName,
    completedAt,
    itemCount: progress.total,
    durationSeconds: Math.max(0, Math.round((completedAt - normalized.startedAt) / 1000))
  }
}

function normalizeHistory(value) {
  if (!Array.isArray(value)) return []
  return value.filter((item) => item && typeof item === 'object' && cleanText(item.id, 64))
    .map((item) => ({
      id: cleanText(item.id, 64),
      listId: cleanText(item.listId, 64),
      listName: cleanText(item.listName, 16) || '安全自查',
      completedAt: Number(item.completedAt) || 0,
      itemCount: Math.max(0, Number(item.itemCount) || 0),
      durationSeconds: Math.max(0, Number(item.durationSeconds) || 0)
    }))
    .filter((item) => item.completedAt > 0)
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, MAX_HISTORY)
}

function appendHistory(history, record) {
  if (!record) return normalizeHistory(history)
  return normalizeHistory([record].concat(normalizeHistory(history)))
}

module.exports = {
  MAX_LISTS,
  MAX_ITEMS_PER_LIST,
  MAX_HISTORY,
  DEFAULT_TEMPLATES,
  cleanText,
  defaultLists,
  normalizeLists,
  createCustomList,
  addList,
  addItem,
  removeItem,
  deleteCustomList,
  createSession,
  normalizeSession,
  toggleSessionItem,
  sessionProgress,
  buildHistoryRecord,
  normalizeHistory,
  appendHistory
}
