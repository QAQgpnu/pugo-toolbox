const storage = require('../../utils/storage')
const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const entertainment = require('../../utils/entertainment')

Page({
  data: {
    today: 0,
    total: 0,
    sound: true,
    vibration: true,
    hitting: false,
    feedbackText: ''
  },

  onLoad() {
    analytics.trackToolOpen('woodfish')
    this.audioContext = null
    this.autoTimer = null
  },

  onShow() {
    tools.recordRecent('woodfish')
    this.refresh()
  },

  onHide() { this.stopAutoHit() },
  onUnload() { this.stopAutoHit() },

  refresh() {
    const stats = entertainment.normalizeWoodfishStats(storage.get(storage.KEYS.woodfishStats, {}))
    const settings = Object.assign({ sound: true, vibration: true }, storage.get(storage.KEYS.woodfishSettings, {}))
    const todayKey = entertainment.localDateKey()
    this.stats = stats
    this.setData({ today: stats.days[todayKey] || 0, total: stats.total, sound: settings.sound !== false, vibration: settings.vibration !== false })
  },

  tapWoodfish() {
    if (this.suppressNextTap) {
      this.suppressNextTap = false
      return
    }
    this.addHit()
  },

  addHit() {
    const todayKey = entertainment.localDateKey()
    this.stats = entertainment.addWoodfishHit(this.stats, todayKey)
    storage.set(storage.KEYS.woodfishStats, this.stats)
    this.setData({ today: this.stats.days[todayKey] || 0, total: this.stats.total, hitting: true, feedbackText: '功德 +1' })
    this.playFeedback()
    clearTimeout(this.hitResetTimer)
    this.hitResetTimer = setTimeout(() => this.setData({ hitting: false, feedbackText: '' }), 180)
  },

  startAutoHit() {
    this.suppressNextTap = true
    this.addHit()
    this.stopAutoHit()
    this.autoTimer = setInterval(() => this.addHit(), 260)
  },

  stopAutoHit() {
    if (this.autoTimer) clearInterval(this.autoTimer)
    this.autoTimer = null
  },

  playFeedback() {
    if (this.data.vibration && typeof wx.vibrateShort === 'function') wx.vibrateShort({ type: 'light' })
    if (!this.data.sound || typeof wx.createWebAudioContext !== 'function') return
    try {
      const context = this.audioContext || wx.createWebAudioContext()
      this.audioContext = context
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const now = context.currentTime
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(245, now)
      oscillator.frequency.exponentialRampToValueAtTime(105, now + 0.09)
      gain.gain.setValueAtTime(0.28, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(now)
      oscillator.stop(now + 0.13)
    } catch (error) {}
  },

  toggleSound(event) {
    this.persistSettings({ sound: event.detail.value })
  },

  toggleVibration(event) {
    this.persistSettings({ vibration: event.detail.value })
  },

  persistSettings(patch) {
    const next = Object.assign({ sound: true, vibration: true }, storage.get(storage.KEYS.woodfishSettings, {}), patch)
    storage.set(storage.KEYS.woodfishSettings, next)
    this.setData(next)
  },

  clearToday() {
    wx.showModal({
      title: '清空今天的记录？',
      content: '只会扣除今天的敲击次数，之前的记录不会受影响。',
      confirmText: '清空今天',
      confirmColor: '#9b6d48',
      success: (result) => {
        if (!result.confirm) return
        this.stats = entertainment.clearWoodfishToday(this.stats)
        storage.set(storage.KEYS.woodfishStats, this.stats)
        analytics.trackToolAction('woodfish', 'clear_today', 'success')
        this.refresh()
      }
    })
  },

  onShareAppMessage() {
    return { title: '功德木鱼｜敲一下，给自己一点轻松', path: '/pages/woodfish/index' }
  }
})
