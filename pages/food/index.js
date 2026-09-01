const storage = require('../../utils/storage')
const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const daily = require('../../utils/daily-tools')

function todayText() { return daily.formatDate(new Date()) }

Page({
  data: { name: '', expiryDate: '', records: [], sorted: [] },
  onLoad() { analytics.trackToolOpen('food') },
  onShow() { tools.recordRecent('food'); const records = daily.normalizeFoodRecords(storage.get(storage.KEYS.foodRecords, [])); this.setData({ expiryDate: this.data.expiryDate || todayText(), records, sorted: daily.sortFoodRecords(records, todayText()) }) },
  onNameInput(event) { this.setData({ name: event.detail.value }) },
  onDateChange(event) { this.setData({ expiryDate: event.detail.value }) },
  fillExample() { this.setData({ name: '开封牛奶', expiryDate: daily.addDays(todayText(), 1) }); analytics.trackToolAction('food', 'fill_example', 'success'); wx.showToast({ title: '示例已填入，可直接修改', icon: 'none' }) },
  addRecord() { if (!daily.cleanText(this.data.name) || !daily.validDate(this.data.expiryDate)) { wx.showToast({ title: '请填写食物和日期', icon: 'none' }); return } const records = daily.addFoodRecord(this.data.records, this.data.name, this.data.expiryDate); storage.set(storage.KEYS.foodRecords, records); analytics.trackToolAction('food', 'add_food', 'success'); this.setData({ name: '', records, sorted: daily.sortFoodRecords(records, todayText()) }); wx.showToast({ title: '已加入排序', icon: 'success' }) },
  removeRecord(event) { const records = this.data.records.filter((item) => item.id !== event.currentTarget.dataset.id); storage.set(storage.KEYS.foodRecords, records); this.setData({ records, sorted: daily.sortFoodRecords(records, todayText()) }) },
  onShareAppMessage() { return { title: '冰箱先吃谁｜临期日期排序', path: '/pages/food/index' } }
})
