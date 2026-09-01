const storage = require('../../utils/storage')
const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const cycle = require('../../utils/cycle')
const steamRadar = require('../../utils/steam-radar')

function todayKey() { return cycle.formatLocalDate(new Date()) }

Page({
  data: {
    types: steamRadar.PROMOTION_TYPES,
    typeIndex: 0,
    name: '',
    endDate: '',
    today: todayKey(),
    records: [],
    activeCount: 0
  },

  onLoad() { analytics.trackToolOpen('steam-radar') },

  onShow() {
    tools.recordRecent('steam-radar')
    this.records = steamRadar.normalizeRecords(storage.get(storage.KEYS.steamWatchRecords, []), todayKey())
    this.refresh()
  },

  onNameInput(event) { this.setData({ name: event.detail.value }) },
  onTypeChange(event) { this.setData({ typeIndex: Number(event.detail.value) }) },
  onEndDateChange(event) { this.setData({ endDate: event.detail.value }) },

  addRecord() {
    const type = steamRadar.PROMOTION_TYPES[this.data.typeIndex]
    const record = steamRadar.normalizeRecord({
      name: this.data.name,
      endDate: this.data.endDate,
      type: type && type.id
    })
    if (!record) {
      wx.showToast({ title: '请填写游戏名和截止日期', icon: 'none' })
      return
    }
    const wasFull = this.records.length >= steamRadar.MAX_RECORDS
    const next = steamRadar.addRecord(this.records, record, todayKey())
    if (!next.some((item) => item.id === record.id)) {
      wx.showToast({ title: '清单已满，这条记录未保存', icon: 'none' })
      analytics.trackToolAction('steam-radar', 'add', 'failed')
      return
    }
    if (!storage.set(storage.KEYS.steamWatchRecords, next)) {
      wx.showToast({ title: '保存失败，请检查存储空间后重试', icon: 'none' })
      analytics.trackToolAction('steam-radar', 'add', 'failed')
      return
    }
    this.records = next
    this.setData({ name: '', endDate: '' })
    this.refresh()
    analytics.trackToolAction('steam-radar', 'add', 'success')
    if (wasFull) wx.showToast({ title: '已保存，并整理一条低优先级记录', icon: 'none' })
  },

  refresh() {
    const today = todayKey()
    const records = this.records.map((item) => steamRadar.presentRecord(item, today)).filter(Boolean)
    this.setData({ records, activeCount: records.filter((item) => item.days >= 0 && !item.claimed).length, today })
  },

  toggleClaimed(event) {
    const id = event.currentTarget.dataset.id
    const next = this.records.map((item) => item.id === id ? Object.assign({}, item, { claimed: !item.claimed }) : item)
    if (!storage.set(storage.KEYS.steamWatchRecords, next)) {
      wx.showToast({ title: '状态保存失败，请重试', icon: 'none' })
      return
    }
    this.records = next
    this.refresh()
  },

  copyName(event) {
    const item = this.records.find((record) => record.id === event.currentTarget.dataset.id)
    if (!item) return
    wx.setClipboardData({ data: item.name, success: () => analytics.trackCopy('steam-radar') })
  },

  removeRecord(event) {
    const id = event.currentTarget.dataset.id
    wx.showModal({
      title: '删除这条限免记录？',
      content: '只会删除保存在本机的这条清单。',
      confirmText: '删除',
      confirmColor: '#2c6eaa',
      success: (answer) => {
        if (!answer.confirm) return
        const next = this.records.filter((item) => item.id !== id)
        if (!storage.set(storage.KEYS.steamWatchRecords, next)) {
          wx.showToast({ title: '删除失败，请重试', icon: 'none' })
          return
        }
        this.records = next
        this.refresh()
      }
    })
  },

  onShareAppMessage() {
    return { title: 'Steam 限免雷达｜先记下，别错过截止日', path: '/pages/steam-radar/index' }
  }
})
