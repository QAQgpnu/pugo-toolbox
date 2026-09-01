const KEYS = Object.freeze({
  favorites: 'pugo_favorites',
  recent: 'pugo_recent',
  randomHistory: 'pugo_random_history',
  safetyLists: 'pugo_safety_lists',
  safetyDraft: 'pugo_safety_draft',
  safetyHistory: 'pugo_safety_history',
  whereRecords: 'pugo_where_records',
  lifecycleRecords: 'pugo_lifecycle_records',
  quickNotes: 'pugo_quick_notes',
  foodRecords: 'pugo_food_records',
  rotationHistory: 'pugo_rotation_history',
  focusOneDraft: 'pugo_focus_one_draft',
  splitHistory: 'pugo_split_history',
  woodfishStats: 'pugo_woodfish_stats',
  woodfishSettings: 'pugo_woodfish_settings',
  moyuState: 'pugo_moyu_state',
  dailyValueRecords: 'pugo_daily_value_records',
  growFocusState: 'pugo_grow_focus_state',
  growFocusHistory: 'pugo_grow_focus_history',
  periodRecords: 'pugo_period_records',
  steamWatchRecords: 'pugo_steam_watch_records',
  excelFormulaFavorites: 'pugo_excel_formula_favorites',
  excelFormulaRecent: 'pugo_excel_formula_recent',
  meetingCostRecords: 'pugo_meeting_cost_records',
  settings: 'pugo_settings'
})

// 已下线功能留下的历史键也必须随“清空全部”一起移除。
const LEGACY_KEYS = Object.freeze([
  'pugo_ai_daily_usage'
])

function get(key, fallback) {
  try {
    const value = wx.getStorageSync(key)
    return value === '' || value === undefined || value === null ? fallback : value
  } catch (error) {
    return fallback
  }
}

function set(key, value) {
  try {
    wx.setStorageSync(key, value)
    return true
  } catch (error) {
    return false
  }
}

function remove(key) {
  try {
    wx.removeStorageSync(key)
    return true
  } catch (error) {
    return false
  }
}

function clearAppData() {
  let succeeded = true
  const keys = Array.from(new Set(Object.keys(KEYS).map((name) => KEYS[name]).concat(LEGACY_KEYS)))
  keys.forEach((key) => {
    if (!remove(key)) succeeded = false
  })
  return succeeded
}

module.exports = {
  KEYS,
  LEGACY_KEYS,
  get,
  set,
  remove,
  clearAppData
}
