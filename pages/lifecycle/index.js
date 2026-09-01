const storage = require('../../utils/storage')
const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const daily = require('../../utils/daily-tools')

function todayText() { return daily.formatDate(new Date()) }

Page({
  data: { name: '', lastDate: '', intervalDays: 90, records: [], decorated: [], presets: [30, 60, 90, 180, 365] },
  onLoad() { analytics.trackToolOpen('lifecycle') },
  onShow() {
    tools.recordRecent('lifecycle')
    const records = daily.normalizeLifecycleRecords(storage.get(storage.KEYS.lifecycleRecords, []))
    this.setData({ lastDate: this.data.lastDate || todayText(), records, decorated: this.decorate(records) })
  },
  decorate(records) { const today = todayText(); return records.map((item) => Object.assign({}, item, daily.lifecycleStatus(item.nextDate, today))) },
  onNameInput(event) { this.setData({ name: event.detail.value }) },
  onDateChange(event) { this.setData({ lastDate: event.detail.value }) },
  onIntervalInput(event) { this.setData({ intervalDays: event.detail.value }) },
  choosePreset(event) { this.setData({ intervalDays: Number(event.currentTarget.dataset.days) }) },
  fillExample() {
    this.setData({ name: '净水器滤芯', lastDate: todayText(), intervalDays: 180 })
    analytics.trackToolAction('lifecycle', 'fill_example', 'success')
    wx.showToast({ title: '示例已填入，可直接修改', icon: 'none' })
  },
  addRecord() {
    const interval = Math.floor(Number(this.data.intervalDays))
    if (!daily.cleanText(this.data.name) || !daily.validDate(this.data.lastDate) || interval < 1 || interval > 3650) {
      wx.showToast({ title: '请完整填写名称、日期和周期', icon: 'none' })
      return
    }
    const records = daily.addLifecycleRecord(this.data.records, this.data.name, this.data.lastDate, this.data.intervalDays)
    storage.set(storage.KEYS.lifecycleRecords, records)
    analytics.trackToolAction('lifecycle', 'add_cycle', 'success')
    this.setData({ name: '', records, decorated: this.decorate(records) })
    wx.showToast({ title: '周期已建立', icon: 'success' })
  },
  markDone(event) {
    const records = daily.markLifecycleDone(this.data.records, event.currentTarget.dataset.id, todayText())
    storage.set(storage.KEYS.lifecycleRecords, records)
    analytics.trackToolAction('lifecycle', 'mark_done', 'success')
    this.setData({ records, decorated: this.decorate(records) })
    wx.showToast({ title: '已计算下次日期', icon: 'none' })
  },
  removeRecord(event) {
    const id = event.currentTarget.dataset.id
    wx.showModal({ title: '删除这个周期？', content: '删除后无法恢复。', success: (result) => { if (!result.confirm) return; const records = this.data.records.filter((item) => item.id !== id); storage.set(storage.KEYS.lifecycleRecords, records); this.setData({ records, decorated: this.decorate(records) }) } })
  },
  onShareAppMessage() { return { title: '该换了｜生活用品周期提醒', path: '/pages/lifecycle/index' } }
})
