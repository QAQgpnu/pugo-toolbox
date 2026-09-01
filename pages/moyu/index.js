const storage = require('../../utils/storage')
const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const entertainment = require('../../utils/entertainment')

function shortDuration(milliseconds) {
  const minutes = Math.floor(milliseconds / 60000)
  if (minutes < 60) return `${minutes} 分`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} 小时 ${rest} 分` : `${hours} 小时`
}

Page({
  data: {
    scenes: entertainment.MOYU_SCENES,
    selectedScene: '上厕所',
    active: false,
    clock: '00:00:00',
    todayText: '0 分',
    weekText: '0 分',
    week: [],
    lastRecord: null
  },

  onLoad() { analytics.trackToolOpen('moyu') },

  onShow() {
    tools.recordRecent('moyu')
    this.state = entertainment.normalizeMoyuState(storage.get(storage.KEYS.moyuState, {}))
    if (this.state.active) this.setData({ selectedScene: this.state.active.scene })
    this.render()
    this.ensureTicker()
  },

  onHide() { this.stopTicker() },
  onUnload() { this.stopTicker() },

  chooseScene(event) {
    if (this.state.active) {
      wx.showToast({ title: '结束本次记录后再切换场景', icon: 'none' })
      return
    }
    this.setData({ selectedScene: event.currentTarget.dataset.scene })
  },

  toggleTimer() {
    if (this.state.active) {
      const finished = entertainment.finishMoyu(this.state)
      this.state = finished.state
      storage.set(storage.KEYS.moyuState, this.state)
      analytics.trackToolAction('moyu', 'finish', 'success')
      this.setData({ lastRecord: finished.record })
      this.stopTicker()
      if (typeof wx.vibrateShort === 'function') wx.vibrateShort({ type: 'light' })
    } else {
      this.state = entertainment.startMoyu(this.state, this.data.selectedScene)
      storage.set(storage.KEYS.moyuState, this.state)
      analytics.trackToolAction('moyu', 'start', 'success')
      this.setData({ lastRecord: null })
      this.ensureTicker()
    }
    this.render()
  },

  undoLast() {
    const record = this.data.lastRecord
    if (!record || !this.state.history[0] || this.state.history[0].id !== record.id) return
    this.state.history.shift()
    storage.set(storage.KEYS.moyuState, this.state)
    this.setData({ lastRecord: null })
    analytics.trackToolAction('moyu', 'undo_finish', 'success')
    this.render()
  },

  ensureTicker() {
    this.stopTicker()
    if (!this.state || !this.state.active) return
    this.ticker = setInterval(() => this.render(), 500)
  },

  stopTicker() {
    if (this.ticker) clearInterval(this.ticker)
    this.ticker = null
  },

  render() {
    const now = Date.now()
    const summary = entertainment.moyuSummary(this.state, now)
    const max = Math.max(60000, ...summary.week.map((item) => item.durationMs))
    const todayKey = entertainment.localDateKey(now)
    const week = summary.week.map((item) => Object.assign({}, item, {
      height: Math.max(12, Math.round(item.durationMs / max * 92)),
      isToday: item.dateKey === todayKey
    }))
    this.setData({
      active: Boolean(this.state.active),
      clock: entertainment.formatClock(summary.activeDurationMs),
      todayText: shortDuration(summary.todayMs),
      weekText: shortDuration(summary.weekMs),
      week
    })
  },

  clearHistory() {
    wx.showModal({
      title: '清空摸鱼记录？',
      content: '进行中的计时也会结束，清空后无法恢复。',
      confirmText: '清空',
      confirmColor: '#9b6d48',
      success: (result) => {
        if (!result.confirm) return
        this.state = entertainment.normalizeMoyuState({})
        storage.set(storage.KEYS.moyuState, this.state)
        this.stopTicker()
        this.setData({ lastRecord: null })
        this.render()
      }
    })
  },

  onShareAppMessage() {
    return { title: '今日摸鱼｜认真休息，也值得被记住', path: '/pages/moyu/index' }
  }
})
