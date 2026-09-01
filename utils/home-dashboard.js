const daily = require('./daily-tools')
const steamRadar = require('./steam-radar')

const MAX_VISIBLE_ITEMS = 3

function normalizeFocusDraft(value) {
  if (!value || typeof value !== 'object') return { tasks: [] }
  return {
    tasks: Array.isArray(value.tasks)
      ? value.tasks.filter((item) => item && daily.cleanText(item.text)).map((item, index) => ({
          text: daily.cleanText(item.text),
          index: Number.isInteger(item.index) ? item.index : index,
          important: Boolean(item.important),
          urgent: Boolean(item.urgent)
        }))
      : []
  }
}

function buildTodayDashboard(source, today, now = Date.now()) {
  const input = source && typeof source === 'object' ? source : {}
  const items = []

  const safetyDraft = input.safetyDraft
  const safetyProgress = input.safetyProgress
  if (safetyDraft && safetyProgress && safetyProgress.total > safetyProgress.checked) {
    const remaining = safetyProgress.total - safetyProgress.checked
    items.push({
      id: 'safety',
      title: '继续安全自查',
      description: `${daily.cleanText(safetyDraft.listName) || '当前清单'} · 还有 ${remaining} 项未确认`,
      badge: String(remaining),
      symbol: '安',
      tone: 'warning',
      priority: 0,
      path: '/pages/safety-run/index'
    })
  }

  const lifecycle = daily.normalizeLifecycleRecords(input.lifecycleRecords)
    .map((item) => Object.assign({}, item, daily.lifecycleStatus(item.nextDate, today)))
    .filter((item) => item.tone === 'danger' || item.tone === 'warning')
    .sort((a, b) => daily.daysFrom(today, a.nextDate) - daily.daysFrom(today, b.nextDate))
  if (lifecycle.length) {
    items.push({
      id: 'lifecycle',
      title: '用品周期到了',
      description: `${lifecycle[0].name} · ${lifecycle[0].text}`,
      badge: String(lifecycle.length),
      symbol: '换',
      tone: lifecycle[0].tone,
      priority: lifecycle[0].tone === 'danger' ? 1 : 3,
      path: '/pages/lifecycle/index'
    })
  }

  const foods = daily.sortFoodRecords(input.foodRecords, today)
    .filter((item) => item.tone === 'danger' || item.tone === 'warning')
  if (foods.length) {
    items.push({
      id: 'food',
      title: '有食物要优先处理',
      description: `${foods[0].name} · ${foods[0].text}`,
      badge: String(foods.length),
      symbol: '鲜',
      tone: foods[0].tone,
      priority: foods[0].tone === 'danger' ? 2 : 4,
      path: '/pages/food/index'
    })
  }

  const steamItems = steamRadar.activeRecords(input.steamWatchRecords, today)
    .filter((item) => !item.claimed && item.days <= 2)
  if (steamItems.length) {
    items.push({
      id: 'steam-radar',
      title: 'Steam 限免快截止',
      description: `${steamItems[0].name} · ${steamItems[0].countdown}`,
      badge: String(steamItems.length),
      symbol: 'S',
      tone: 'warning',
      priority: 4,
      path: '/pages/steam-radar/index'
    })
  }

  const notes = daily.normalizeQuickNotes(input.quickNotes, now)
  if (notes.length) {
    const hours = Math.max(1, Math.ceil((notes[0].expiresAt - now) / 3600000))
    items.push({
      id: 'quick-note',
      title: '临时小事还记着',
      description: `${notes[0].title} · ${hours < 24 ? `${hours} 小时后删除` : `${Math.ceil(hours / 24)} 天后删除`}`,
      badge: String(notes.length),
      symbol: '记',
      tone: hours <= 24 ? 'warning' : 'normal',
      priority: hours <= 24 ? 5 : 8,
      path: '/pages/quick-note/index'
    })
  }

  const focus = normalizeFocusDraft(input.focusDraft)
  const topTask = daily.pickTopTask(focus.tasks)
  if (topTask) {
    items.push({
      id: 'focus-one',
      title: '今天只做一件',
      description: topTask.text,
      badge: String(focus.tasks.length),
      symbol: '一',
      tone: topTask.urgent ? 'warning' : 'normal',
      priority: topTask.urgent ? 6 : 9,
      path: '/pages/focus-one/index'
    })
  }

  items.sort((a, b) => a.priority - b.priority)
  return {
    totalCount: items.length,
    pendingItemCount: items.reduce((total, item) => total + (Number(item.badge) || 0), 0),
    hiddenCount: Math.max(0, items.length - MAX_VISIBLE_ITEMS),
    items: items.slice(0, MAX_VISIBLE_ITEMS)
  }
}

module.exports = {
  MAX_VISIBLE_ITEMS,
  normalizeFocusDraft,
  buildTodayDashboard
}
