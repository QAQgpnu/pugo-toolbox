const storage = require('../../utils/storage')
const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const daily = require('../../utils/daily-tools')

function decorate(notes, now) {
  return notes.map((item) => {
    const hours = Math.max(1, Math.ceil((item.expiresAt - now) / 3600000))
    return Object.assign({}, item, { remaining: hours < 24 ? `${hours} 小时后删除` : `${Math.ceil(hours / 24)} 天后删除` })
  })
}

Page({
  data: { title: '', detail: '', ttlHours: 24, notes: [], decorated: [], ttlOptions: [{ value: 8, label: '今晚前' }, { value: 24, label: '24 小时' }, { value: 72, label: '3 天' }, { value: 168, label: '7 天' }] },
  onLoad() { analytics.trackToolOpen('quick-note') },
  onShow() { tools.recordRecent('quick-note'); const now = Date.now(); const notes = daily.normalizeQuickNotes(storage.get(storage.KEYS.quickNotes, []), now); storage.set(storage.KEYS.quickNotes, notes); this.setData({ notes, decorated: decorate(notes, now) }) },
  onTitleInput(event) { this.setData({ title: event.detail.value }) },
  onDetailInput(event) { this.setData({ detail: event.detail.value }) },
  chooseTtl(event) { this.setData({ ttlHours: Number(event.currentTarget.dataset.hours) }) },
  fillExample() {
    this.setData({ title: '停车位置', detail: 'B2 层 C36，靠近 4 号电梯', ttlHours: 24 })
    analytics.trackToolAction('quick-note', 'fill_example', 'success')
    wx.showToast({ title: '示例已填入，可直接修改', icon: 'none' })
  },
  addNote() {
    if (!daily.cleanText(this.data.title) || !daily.cleanText(this.data.detail, 120)) { wx.showToast({ title: '请填写标题和要记住的内容', icon: 'none' }); return }
    const now = Date.now()
    const notes = daily.addQuickNote(this.data.notes, this.data.title, this.data.detail, this.data.ttlHours, now)
    storage.set(storage.KEYS.quickNotes, notes); analytics.trackToolAction('quick-note', 'save_note', 'success'); this.setData({ title: '', detail: '', notes, decorated: decorate(notes, now) }); wx.showToast({ title: '临时卡已保存', icon: 'success' })
  },
  removeNote(event) { const notes = this.data.notes.filter((item) => item.id !== event.currentTarget.dataset.id); storage.set(storage.KEYS.quickNotes, notes); this.setData({ notes, decorated: decorate(notes, Date.now()) }) },
  onShareAppMessage() { return { title: '临时记住｜过期自动清理', path: '/pages/quick-note/index' } }
})
