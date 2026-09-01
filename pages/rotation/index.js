const storage = require('../../utils/storage')
const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const daily = require('../../utils/daily-tools')

function readState() {
  const value = storage.get(storage.KEYS.rotationHistory, {})
  const participantsText = value && typeof value.participantsText === 'string' ? value.participantsText : ''
  const history = value && Array.isArray(value.history)
    ? value.history.filter((item) => item && daily.cleanText(item.name)).map((item) => ({ name: daily.cleanText(item.name), at: Number(item.at) || 0 })).slice(0, 50)
    : []
  return { participantsText, history }
}

Page({
  data: { participantsText: '', participantsPlaceholder: '每行一个名字\n例如：\n小浦\n阿明\n小林', count: 0, canDraw: false, history: [], result: '', stats: [] },
  onLoad() { analytics.trackToolOpen('rotation') },
  onShow() { tools.recordRecent('rotation'); const state = readState(); const names = daily.parseLines(state.participantsText); this.setData({ participantsText: state.participantsText, count: names.length, canDraw: names.length >= 2, history: state.history, stats: this.buildStats(names, state.history) }) },
  buildStats(names, history) { const counts = {}; names.forEach((name) => { counts[name] = 0 }); history.forEach((item) => { if (counts[item.name] !== undefined) counts[item.name] += 1 }); return names.map((name) => ({ name, count: counts[name] })) },
  fillExample() {
    const participantsText = '小浦\n阿明\n小林\n小周'
    const names = daily.parseLines(participantsText)
    storage.set(storage.KEYS.rotationHistory, { participantsText, history: this.data.history })
    this.setData({ participantsText, count: names.length, canDraw: true, result: '', stats: this.buildStats(names, this.data.history) })
    analytics.trackToolAction('rotation', 'fill_example', 'success')
    wx.showToast({ title: '示例名单已填入', icon: 'none' })
  },
  onParticipantsInput(event) { const participantsText = event.detail.value; const names = daily.parseLines(participantsText); storage.set(storage.KEYS.rotationHistory, { participantsText, history: this.data.history }); this.setData({ participantsText, count: names.length, canDraw: names.length >= 2, result: '', stats: this.buildStats(names, this.data.history) }) },
  draw() {
    const names = daily.parseLines(this.data.participantsText)
    const selected = daily.chooseFair(names, this.data.history)
    if (!selected) { wx.showToast({ title: '请至少输入 2 个人', icon: 'none' }); return }
    const history = [{ name: selected.name, at: Date.now() }].concat(this.data.history).slice(0, 50)
    storage.set(storage.KEYS.rotationHistory, { participantsText: this.data.participantsText, history })
    analytics.trackToolAction('rotation', 'fair_draw', 'success')
    this.setData({ history, result: selected.name, stats: this.buildStats(names, history) })
    const settings = tools.getSettings(); if (settings.vibration && wx.vibrateShort) wx.vibrateShort({ type: 'light' })
  },
  clearHistory() { wx.showModal({ title: '清空轮值历史？', content: '名单会保留，所有人的轮值次数重新归零。', success: (result) => { if (!result.confirm) return; storage.set(storage.KEYS.rotationHistory, { participantsText: this.data.participantsText, history: [] }); this.setData({ history: [], result: '', stats: this.buildStats(daily.parseLines(this.data.participantsText), []) }) } }) },
  onShareAppMessage() { return { title: '公平轮值｜尽量不连续选中同一人', path: '/pages/rotation/index' } }
})
