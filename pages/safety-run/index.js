const storage = require('../../utils/storage')
const analytics = require('../../utils/analytics')
const toolService = require('../../utils/tools')
const safety = require('../../utils/safety')

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatCompletedTime(timestamp) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

Page({
  data: {
    session: null,
    items: [],
    progress: { checked: 0, total: 0, percent: 0, complete: false },
    completed: false,
    completedTime: ''
  },

  onShow() {
    if (this.data.completed) return
    const session = safety.normalizeSession(storage.get(storage.KEYS.safetyDraft, null))
    if (!session) {
      wx.showModal({
        title: '没有进行中的自查',
        content: '请返回安心自查主页选择一个场景。',
        showCancel: false,
        success: () => wx.navigateBack()
      })
      return
    }
    this.updateSession(session)
  },

  updateSession(session) {
    const progress = safety.sessionProgress(session)
    this.setData({ session, items: session.items, progress })
  },

  toggleItem(event) {
    if (!this.data.session || this.data.completed) return
    const session = safety.toggleSessionItem(this.data.session, event.currentTarget.dataset.id)
    if (!session) return
    storage.set(storage.KEYS.safetyDraft, session)
    this.updateSession(session)
    if (toolService.getSettings().vibration && typeof wx.canIUse === 'function' && wx.canIUse('vibrateShort')) {
      try {
        wx.vibrateShort({ type: 'light' })
      } catch (error) {
        // 振动失败不影响自查进度。
      }
    }
  },

  completeCheck() {
    if (!this.data.session || !this.data.progress.complete) {
      wx.showToast({ title: '请逐项完成现场确认', icon: 'none' })
      return
    }
    const completedAt = Date.now()
    const record = safety.buildHistoryRecord(this.data.session, completedAt)
    if (!record) return
    const history = safety.appendHistory(storage.get(storage.KEYS.safetyHistory, []), record)
    if (!storage.set(storage.KEYS.safetyHistory, history)) {
      wx.showToast({ title: '无法保存本次登记', icon: 'none' })
      return
    }
    storage.remove(storage.KEYS.safetyDraft)
    this.setData({ completed: true, completedTime: formatCompletedTime(completedAt) })
    analytics.trackToolAction('safety', 'complete_check', 'success')
    if (toolService.getSettings().vibration && typeof wx.canIUse === 'function' && wx.canIUse('vibrateShort')) {
      try {
        wx.vibrateShort({ type: 'medium' })
      } catch (error) {
        // 完成反馈失败不影响登记结果。
      }
    }
  },

  backToLists() {
    wx.navigateBack()
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜安心自查',
      path: '/pages/safety/index'
    }
  }
})
