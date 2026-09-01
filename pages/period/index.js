const storage = require('../../utils/storage')
const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const cycle = require('../../utils/cycle')

function todayKey() { return cycle.formatLocalDate(new Date()) }

function presentRecords(records) {
  return cycle.normalizeRecords(records).slice().reverse().map((item, index) => Object.assign({}, item, { latest: index === 0 }))
}

function buildRecordUpdate(records, date, duration) {
  const current = cycle.normalizeRecords(records)
  const existed = current.some((item) => item.date === date)
  const next = cycle.normalizeRecords(current.filter((item) => item.date !== date).concat({ date, duration }))
  const accepted = next.some((item) => item.date === date)
  return {
    accepted,
    records: accepted ? next : current,
    droppedOldest: accepted && !existed && current.length >= 12 && next.length === 12
  }
}

Page({
  data: {
    today: todayKey(),
    selectedDate: '',
    duration: '5',
    fallbackCycle: '28',
    records: [],
    result: null
  },

  onLoad() { analytics.trackToolOpen('period') },

  onShow() {
    tools.recordRecent('period')
    this.records = cycle.normalizeRecords(storage.get(storage.KEYS.periodRecords, []))
    this.refresh()
  },

  onDateChange(event) { this.setData({ selectedDate: event.detail.value }) },
  onDurationInput(event) { this.setData({ duration: event.detail.value }) },
  onFallbackInput(event) { this.setData({ fallbackCycle: event.detail.value }, () => this.refresh()) },

  addRecord() {
    const date = this.data.selectedDate
    const duration = Math.round(Number(this.data.duration))
    if (!cycle.parseLocalDate(date) || duration < 1 || duration > 10) {
      wx.showToast({ title: '请选择日期，并填写 1–10 天', icon: 'none' })
      return
    }
    const update = buildRecordUpdate(this.records, date, duration)
    if (!update.accepted) {
      wx.showToast({ title: '最多保留最近 12 次，这条较早记录未保存', icon: 'none' })
      return
    }
    if (!storage.set(storage.KEYS.periodRecords, update.records)) {
      wx.showToast({ title: '保存失败，请检查存储空间后重试', icon: 'none' })
      analytics.trackToolAction('period', 'add_record', 'failed')
      return
    }
    this.records = update.records
    this.setData({ selectedDate: '' })
    this.refresh()
    analytics.trackToolAction('period', 'add_record', 'success')
    if (update.droppedOldest) wx.showToast({ title: '已保存，并移出最早一条记录', icon: 'none' })
  },

  refresh() {
    const result = cycle.estimateCycle(this.records, this.data.fallbackCycle)
    this.setData({ records: presentRecords(this.records), result })
  },

  removeRecord(event) {
    const date = event.currentTarget.dataset.date
    wx.showModal({
      title: '删除这次记录？',
      content: '只会删除保存在这台手机上的这条日期。',
      confirmText: '删除',
      confirmColor: '#a65370',
      success: (answer) => {
        if (!answer.confirm) return
        const next = this.records.filter((item) => item.date !== date)
        if (!storage.set(storage.KEYS.periodRecords, next)) {
          wx.showToast({ title: '删除失败，请重试', icon: 'none' })
          return
        }
        this.records = next
        this.refresh()
      }
    })
  },

  clearRecords() {
    if (!this.records.length) return
    wx.showModal({
      title: '清空全部周期记录？',
      content: '清空后无法恢复，其他工具数据不会受影响。',
      confirmText: '全部清空',
      confirmColor: '#a65370',
      success: (answer) => {
        if (!answer.confirm) return
        if (!storage.remove(storage.KEYS.periodRecords)) {
          wx.showToast({ title: '清空失败，请重试', icon: 'none' })
          return
        }
        this.records = []
        this.refresh()
      }
    })
  },

  onShareAppMessage() {
    return { title: '周期记录｜本机保存，轻松看趋势', path: '/pages/period/index' }
  }
})

module.exports = {
  buildRecordUpdate,
  presentRecords
}
