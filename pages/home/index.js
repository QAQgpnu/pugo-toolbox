const toolService = require('../../utils/tools')
const storage = require('../../utils/storage')
const safety = require('../../utils/safety')
const daily = require('../../utils/daily-tools')
const homeDashboard = require('../../utils/home-dashboard')

function todayLabel(date = new Date()) {
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

Page({
  data: {
    recentTools: [],
    favoriteTools: [],
    todayLabel: '',
    todayDashboard: { totalCount: 0, pendingItemCount: 0, hiddenCount: 0, items: [] }
  },

  onShow() {
    const favoriteIds = toolService.getFavorites()
    const draft = safety.normalizeSession(storage.get(storage.KEYS.safetyDraft, null))
    const progress = draft ? safety.sessionProgress(draft) : null
    const now = new Date()
    const todayDashboard = homeDashboard.buildTodayDashboard({
      safetyDraft: draft,
      safetyProgress: progress,
      lifecycleRecords: storage.get(storage.KEYS.lifecycleRecords, []),
      quickNotes: storage.get(storage.KEYS.quickNotes, []),
      foodRecords: storage.get(storage.KEYS.foodRecords, []),
      focusDraft: storage.get(storage.KEYS.focusOneDraft, {}),
      steamWatchRecords: storage.get(storage.KEYS.steamWatchRecords, [])
    }, daily.formatDate(now), now.getTime())

    this.setData({
      recentTools: toolService.getRecentTools().slice(0, 4),
      favoriteTools: this.buildFavoriteTools(favoriteIds),
      todayLabel: todayLabel(now),
      todayDashboard
    })
  },

  buildFavoriteTools(favoriteIds) {
    return favoriteIds.slice(0, 4).map((id) => toolService.getToolById(id)).filter(Boolean)
  },

  onFavoritesChange(event) {
    const favoriteIds = event.detail && Array.isArray(event.detail.favoriteIds)
      ? event.detail.favoriteIds
      : toolService.getFavorites()
    this.setData({ favoriteTools: this.buildFavoriteTools(favoriteIds) })
  },

  openTool(event) {
    const tool = toolService.getToolById(event.currentTarget.dataset.id)
    if (tool) wx.navigateTo({ url: tool.path })
  },

  openTodayItem(event) {
    const path = event.currentTarget.dataset.path
    if (path) wx.navigateTo({ url: path })
  },

  startSafetyCheck() {
    wx.navigateTo({ url: '/pages/safety/index' })
  },

  openToolDrawer() {
    const bottomNav = this.selectComponent('#bottomNav')
    if (bottomNav) bottomNav.openDrawer()
  },

  goFavorites() {
    wx.reLaunch({ url: '/pages/favorites/index' })
  },

  goRecent() {
    wx.reLaunch({ url: '/pages/recent/index' })
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜把小事，三秒搞定',
      path: '/pages/home/index'
    }
  }
})
