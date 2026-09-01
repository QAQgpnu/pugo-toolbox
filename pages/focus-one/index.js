const storage = require('../../utils/storage')
const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const daily = require('../../utils/daily-tools')

function buildTasks(text, previous) {
  const old = {}
  ;(Array.isArray(previous) ? previous : []).forEach((item) => { old[item.text] = item })
  return daily.parseLines(text).map((item, index) => ({ text: item, index, important: Boolean(old[item] && old[item].important), urgent: Boolean(old[item] && old[item].urgent) }))
}

Page({
  data: { inputValue: '', inputPlaceholder: '每行一件事\n例如：\n提交报销单\n回复客户消息\n整理桌面', tasks: [], result: null },
  onLoad() { analytics.trackToolOpen('focus-one') },
  onShow() { tools.recordRecent('focus-one'); const draft = storage.get(storage.KEYS.focusOneDraft, {}); const inputValue = draft && typeof draft.inputValue === 'string' ? draft.inputValue : ''; const tasks = buildTasks(inputValue, draft.tasks); this.setData({ inputValue, tasks }) },
  persist(inputValue, tasks) { storage.set(storage.KEYS.focusOneDraft, { inputValue, tasks }) },
  fillExample() {
    const inputValue = '提交报销单\n回复紧急消息\n整理桌面'
    const tasks = buildTasks(inputValue, []).map((item) => Object.assign({}, item, {
      important: item.text === '提交报销单',
      urgent: item.text === '回复紧急消息'
    }))
    this.persist(inputValue, tasks)
    this.setData({ inputValue, tasks, result: null })
    analytics.trackToolAction('focus-one', 'fill_example', 'success')
    wx.showToast({ title: '示例任务已填入', icon: 'none' })
  },
  onInput(event) { const inputValue = event.detail.value; const tasks = buildTasks(inputValue, this.data.tasks); this.persist(inputValue, tasks); this.setData({ inputValue, tasks, result: null }) },
  toggleFlag(event) { const index = Number(event.currentTarget.dataset.index); const flag = event.currentTarget.dataset.flag; const tasks = this.data.tasks.map((item, itemIndex) => itemIndex === index ? Object.assign({}, item, { [flag]: !item[flag] }) : item); this.persist(this.data.inputValue, tasks); this.setData({ tasks, result: null }) },
  decide() { const result = daily.pickTopTask(this.data.tasks); if (!result) { wx.showToast({ title: '先写下至少一件事', icon: 'none' }); return } analytics.trackToolAction('focus-one', 'choose_first', 'success'); this.setData({ result }) },
  markDone() { if (!this.data.result) return; const remaining = this.data.tasks.filter((item) => item.text !== this.data.result.text); const inputValue = remaining.map((item) => item.text).join('\n'); this.persist(inputValue, remaining); this.setData({ inputValue, tasks: remaining, result: null }); wx.showToast({ title: '完成一件，很不错', icon: 'none' }) },
  clearAll() { storage.remove(storage.KEYS.focusOneDraft); this.setData({ inputValue: '', tasks: [], result: null }) },
  onShareAppMessage() { return { title: '今天只做一件｜帮你选出第一步', path: '/pages/focus-one/index' } }
})
