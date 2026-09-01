const storage = require('../../utils/storage')
const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const daily = require('../../utils/daily-tools')

function normalizeHistory(value) { return Array.isArray(value) ? value.filter((item) => item && Number.isFinite(Number(item.total)) && Number.isFinite(Number(item.people))).slice(0, 5) : [] }

Page({
  data: { total: '', discount: '', extra: '', people: 2, result: null, history: [] },
  onLoad() { analytics.trackToolOpen('split') },
  onShow() { tools.recordRecent('split'); this.setData({ history: normalizeHistory(storage.get(storage.KEYS.splitHistory, [])) }) },
  onTotalInput(event) { this.setData({ total: event.detail.value, result: null }) },
  onDiscountInput(event) { this.setData({ discount: event.detail.value, result: null }) },
  onExtraInput(event) { this.setData({ extra: event.detail.value, result: null }) },
  onPeopleInput(event) { this.setData({ people: event.detail.value, result: null }) },
  calculate() {
    const result = daily.calculateSplit(this.data.total, this.data.discount, this.data.extra, Number(this.data.people))
    if (!result) { wx.showToast({ title: '请检查金额和人数', icon: 'none' }); return }
    const decorated = Object.assign({}, result, { totalText: result.total.toFixed(2), baseText: result.base.toFixed(2), firstText: result.first.toFixed(2), at: Date.now() })
    const history = [decorated].concat(this.data.history).slice(0, 5)
    storage.set(storage.KEYS.splitHistory, history); analytics.trackToolAction('split', 'equal_split', 'success'); this.setData({ result: decorated, history })
  },
  fillExample() { this.setData({ total: '368', discount: '50', extra: '12', people: 4, result: null }); analytics.trackToolAction('split', 'fill_example', 'success'); wx.showToast({ title: '示例账单已填入', icon: 'none' }) },
  clearHistory() { storage.remove(storage.KEYS.splitHistory); this.setData({ history: [] }) },
  copyResult() { if (!this.data.result) return; const result = this.data.result; const text = result.remainder ? `实付 ¥${result.totalText}，${result.people} 人分摊：${result.remainder} 人各 ¥${result.firstText}，其余各 ¥${result.baseText}` : `实付 ¥${result.totalText}，${result.people} 人各 ¥${result.baseText}`; wx.setClipboardData({ data: text, success: () => analytics.trackCopy('split') }) },
  onShareAppMessage() { return { title: '一起算清｜AA、优惠和运费分摊', path: '/pages/split/index' } }
})
