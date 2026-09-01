const storage = require('../../utils/storage')
const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const entertainment = require('../../utils/entertainment')

function presentWeek(summary) {
  return summary.week.map((item) => Object.assign({}, item, {
    plant: item.count >= 4 ? '☘' : item.count >= 2 ? '♧' : item.count === 1 ? '⌁' : '·',
    level: Math.min(4, item.count)
  }))
}

Page({
  data: {
    modes: Object.values(entertainment.FOCUS_MODES),
    modeId: 'short',
    status: 'idle',
    clock: '25:00',
    statusText: '准备好就开始',
    primaryText: '开始专注',
    todayCount: 0,
    todayMinutes: 0,
    leafCount: 0,
    week: []
  },

  onLoad() { analytics.trackToolOpen('grow-focus') },

  onShow() {
    tools.recordRecent('grow-focus')
    this.state = entertainment.normalizeFocusState(storage.get(storage.KEYS.growFocusState, {}))
    this.history = entertainment.normalizeFocusHistory(storage.get(storage.KEYS.growFocusHistory, []))
    this.finishIfNeeded()
    this.render()
    this.ensureTicker()
  },

  onHide() { this.stopTicker() },
  onUnload() { this.stopTicker() },

  selectMode(event) {
    if (this.state.status !== 'idle') {
      wx.showToast({ title: '结束当前专注后再切换', icon: 'none' })
      return
    }
    this.state = entertainment.resetFocus(event.currentTarget.dataset.id)
    this.persistState()
    this.render()
  },

  toggleFocus() {
    if (this.state.status === 'running') {
      this.state = entertainment.pauseFocus(this.state)
      analytics.trackToolAction('grow-focus', 'pause', 'success')
      this.stopTicker()
    } else {
      const action = this.state.status === 'paused' ? 'resume' : 'start'
      this.state = entertainment.startFocus(this.state, this.state.modeId)
      analytics.trackToolAction('grow-focus', action, 'success')
      this.ensureTicker()
    }
    this.persistState()
    this.render()
  },

  cancelFocus() {
    wx.showModal({
      title: '放弃这次专注？',
      content: '未完成的时段不会长出叶子。',
      confirmText: '放弃',
      confirmColor: '#9b6d48',
      success: (answer) => {
        if (!answer.confirm) return
        this.state = entertainment.resetFocus(this.state.modeId)
        this.persistState()
        this.stopTicker()
        analytics.trackToolAction('grow-focus', 'cancel', 'success')
        this.render()
      }
    })
  },

  ensureTicker() {
    this.stopTicker()
    if (!this.state || this.state.status !== 'running') return
    this.ticker = setInterval(() => {
      this.finishIfNeeded()
      this.render()
    }, 500)
  },

  stopTicker() {
    if (this.ticker) clearInterval(this.ticker)
    this.ticker = null
  },

  finishIfNeeded() {
    if (!this.state || this.state.status !== 'running' || entertainment.focusRemaining(this.state) > 0) return false
    const modeId = this.state.modeId
    this.history = entertainment.addFocusCompletion(this.history, modeId)
    storage.set(storage.KEYS.growFocusHistory, this.history)
    this.state = entertainment.resetFocus(modeId)
    this.persistState()
    this.stopTicker()
    analytics.trackToolAction('grow-focus', 'complete', 'success')
    if (typeof wx.vibrateLong === 'function') wx.vibrateLong()
    wx.showToast({ title: '完成！今天长出一片叶', icon: 'none', duration: 2200 })
    return true
  },

  persistState() { storage.set(storage.KEYS.growFocusState, this.state) },

  render() {
    const remaining = entertainment.focusRemaining(this.state)
    const summary = entertainment.focusWeekSummary(this.history)
    const labels = {
      idle: ['准备好就开始', '开始专注'],
      running: ['正在专注 · 离开页面也会继续计时', '暂停一下'],
      paused: ['已暂停，回来再继续', '继续专注']
    }
    const copy = labels[this.state.status]
    this.setData({
      modeId: this.state.modeId,
      status: this.state.status,
      clock: entertainment.formatFocusClock(remaining),
      statusText: copy[0],
      primaryText: copy[1],
      todayCount: summary.today.count,
      todayMinutes: summary.today.minutes,
      leafCount: Math.min(4, summary.today.count),
      week: presentWeek(summary)
    })
  },

  onShareAppMessage() {
    return { title: '努力长出来｜专注一次，长出一片叶', path: '/pages/grow-focus/index' }
  }
})
