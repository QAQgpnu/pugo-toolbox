const storage = require('../../utils/storage')
const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const daily = require('../../utils/daily-tools')

Page({
  data: { name: '', place: '', tag: '', query: '', records: [], visibleRecords: [] },

  onLoad() { analytics.trackToolOpen('where') },

  onShow() {
    tools.recordRecent('where')
    const records = daily.normalizeWhereRecords(storage.get(storage.KEYS.whereRecords, []))
    this.setData({ records, visibleRecords: daily.searchWhereRecords(records, this.data.query) })
  },

  onNameInput(event) { this.setData({ name: event.detail.value }) },
  onPlaceInput(event) { this.setData({ place: event.detail.value }) },
  onTagInput(event) { this.setData({ tag: event.detail.value }) },
  fillExample() {
    this.setData({ name: '备用钥匙', place: '玄关鞋柜上层收纳盒', tag: '重要物品' })
    analytics.trackToolAction('where', 'fill_example', 'success')
    wx.showToast({ title: '示例已填入，可直接修改', icon: 'none' })
  },
  onSearchInput(event) {
    const query = event.detail.value
    this.setData({ query, visibleRecords: daily.searchWhereRecords(this.data.records, query) })
  },

  saveRecord() {
    if (!daily.cleanText(this.data.name) || !daily.cleanText(this.data.place)) {
      wx.showToast({ title: '请填写东西和位置', icon: 'none' })
      return
    }
    const records = daily.addWhereRecord(this.data.records, this.data.name, this.data.place, this.data.tag)
    storage.set(storage.KEYS.whereRecords, records)
    analytics.trackToolAction('where', 'save_place', 'success')
    this.setData({ name: '', place: '', tag: '', query: '', records, visibleRecords: records })
    wx.showToast({ title: '位置已记住', icon: 'success' })
  },

  removeRecord(event) {
    const id = event.currentTarget.dataset.id
    wx.showModal({ title: '删除这条位置？', content: '删除后无法恢复。', success: (result) => {
      if (!result.confirm) return
      const records = this.data.records.filter((item) => item.id !== id)
      storage.set(storage.KEYS.whereRecords, records)
      this.setData({ records, visibleRecords: daily.searchWhereRecords(records, this.data.query) })
    } })
  },

  onShareAppMessage() { return { title: '东西放哪了｜浦哥工具箱', path: '/pages/where/index' } }
})
