const storage = require('../../utils/storage')
const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const daily = require('../../utils/daily-tools')
const entertainment = require('../../utils/entertainment')

function present(result) {
  if (!result) return null
  const totalTargetDays = result.usedDays + result.remainingDays
  return Object.assign({}, result, {
    dailyText: result.dailyValue < 0.01 ? '< 0.01' : result.dailyValue.toFixed(2),
    targetText: result.targetDaily.toFixed(result.targetDaily < 10 ? 2 : 0).replace(/\.00$/, ''),
    progress: Math.max(4, Math.min(100, Math.round(result.usedDays / totalTargetDays * 100)))
  })
}

function presentRecords(records) {
  const today = entertainment.localDateKey()
  return entertainment.normalizeDailyValueRecords(records).map((item) => {
    const result = entertainment.calculateDailyValue(item.name, item.price, item.purchaseDate, item.targetDaily, today)
    return Object.assign({}, item, { dailyText: result ? present(result).dailyText : '--' })
  })
}

Page({
  data: {
    name: '',
    price: '',
    purchaseDate: '',
    targetDaily: '3',
    today: entertainment.localDateKey(),
    result: null,
    records: []
  },

  onLoad() { analytics.trackToolOpen('daily-value') },

  onShow() {
    tools.recordRecent('daily-value')
    this.records = entertainment.normalizeDailyValueRecords(storage.get(storage.KEYS.dailyValueRecords, []))
    this.setData({ records: presentRecords(this.records), today: entertainment.localDateKey() })
  },

  onNameInput(event) { this.setData({ name: event.detail.value }) },
  onPriceInput(event) { this.setData({ price: event.detail.value }) },
  onTargetInput(event) { this.setData({ targetDaily: event.detail.value }) },
  onDateChange(event) { this.setData({ purchaseDate: event.detail.value }) },

  fillExample() {
    const today = new Date()
    today.setFullYear(today.getFullYear() - 2)
    this.setData({ name: '我的手机', price: '3000', purchaseDate: daily.formatDate(today), targetDaily: '3', result: null })
  },

  calculate() {
    const result = entertainment.calculateDailyValue(this.data.name, this.data.price, this.data.purchaseDate, this.data.targetDaily)
    if (!result) {
      wx.showToast({ title: '请填写有效名称、价格和购买日期', icon: 'none' })
      analytics.trackToolAction('daily-value', 'calculate', 'failed')
      return
    }
    this.records = entertainment.saveDailyValueRecord(this.records, result)
    storage.set(storage.KEYS.dailyValueRecords, this.records)
    this.setData({ result: present(result), records: presentRecords(this.records) })
    analytics.trackToolAction('daily-value', 'calculate', 'success')
    if (typeof wx.vibrateShort === 'function') wx.vibrateShort({ type: 'light' })
  },

  useRecord(event) {
    const item = this.records.find((record) => record.id === event.currentTarget.dataset.id)
    if (!item) return
    const result = entertainment.calculateDailyValue(item.name, item.price, item.purchaseDate, item.targetDaily)
    this.setData({ name: item.name, price: String(item.price), purchaseDate: item.purchaseDate, targetDaily: String(item.targetDaily), result: present(result) })
  },

  removeRecord(event) {
    const id = event.currentTarget.dataset.id
    const item = this.records.find((record) => record.id === id)
    if (!item) return
    wx.showModal({
      title: `删除“${item.name}”？`,
      content: '只删除这条本机记录。',
      confirmText: '删除',
      confirmColor: '#9b6d48',
      success: (answer) => {
        if (!answer.confirm) return
        this.records = this.records.filter((record) => record.id !== id)
        storage.set(storage.KEYS.dailyValueRecords, this.records)
        this.setData({ records: presentRecords(this.records) })
      }
    })
  },

  onShareAppMessage() {
    return { title: '每天值多少｜喜欢的东西，越用越划算', path: '/pages/daily-value/index' }
  }
})
