const dateUtils = require('../../utils/date')
const toolService = require('../../utils/tools')
const analytics = require('../../utils/analytics')

const initialToday = dateUtils.todayString()
const initialShiftedDate = dateUtils.addCalendarDays(initialToday, 30)

function betweenResult(startDate, endDate) {
  const gapDays = dateUtils.daysBetween(startDate, endDate)
  return {
    gapDays,
    inclusiveDays: gapDays === null ? null : gapDays + 1
  }
}

function countdownResult(targetDate, baseDate) {
  const result = dateUtils.countdownFrom(targetDate, baseDate)
  if (result) return result

  return {
    status: 'today',
    prefix: '就是今天',
    days: 0,
    signedDays: 0,
    text: '就是今天'
  }
}

Page({
  data: {
    mode: 'between',
    today: initialToday,
    startDate: initialToday,
    endDate: initialToday,
    targetDate: initialToday,
    offsetBaseDate: initialToday,
    offsetDays: '30',
    shiftedDate: initialShiftedDate,
    gapDays: 0,
    inclusiveDays: 1,
    countdownStatus: 'today',
    countdownPrefix: '就是今天',
    countdownDays: 0,
    countdownText: '就是今天'
  },

  onLoad() {
    analytics.trackToolOpen('date')
  },

  onShow() {
    toolService.recordRecent('date')

    const today = dateUtils.todayString()
    const countdown = countdownResult(this.data.targetDate, today)
    this.setData({
      today,
      countdownStatus: countdown.status,
      countdownPrefix: countdown.prefix,
      countdownDays: countdown.days,
      countdownText: countdown.text
    })
  },

  switchMode(event) {
    const mode = event.currentTarget.dataset.mode
    if (!['between', 'countdown', 'offset'].includes(mode)) return
    this.setData({ mode })
  },

  onStartDateChange(event) {
    const startDate = event.detail.value
    const result = betweenResult(startDate, this.data.endDate)
    this.setData(Object.assign({ startDate }, result))
    analytics.trackToolAction('date', 'between', 'success')
  },

  onEndDateChange(event) {
    const endDate = event.detail.value
    const result = betweenResult(this.data.startDate, endDate)
    this.setData(Object.assign({ endDate }, result))
    analytics.trackToolAction('date', 'between', 'success')
  },

  onTargetDateChange(event) {
    const targetDate = event.detail.value
    this.applyCountdown(targetDate)
    analytics.trackToolAction('date', 'countdown', 'success')
  },

  onOffsetBaseDateChange(event) {
    this.updateOffset({ offsetBaseDate: event.detail.value })
  },

  onOffsetDaysInput(event) {
    this.updateOffset({ offsetDays: event.detail.value })
  },

  applyOffsetPreset(event) {
    this.updateOffset({ offsetDays: String(event.currentTarget.dataset.days) })
  },

  updateOffset(patch) {
    const state = Object.assign({}, this.data, patch)
    const shiftedDate = dateUtils.addCalendarDays(state.offsetBaseDate, state.offsetDays)
    this.setData(Object.assign({}, patch, { shiftedDate: shiftedDate || '' }))
    if (shiftedDate) analytics.trackToolAction('date', 'offset', 'success')
  },

  setToToday(event) {
    const field = event.currentTarget.dataset.field
    if (!['startDate', 'endDate', 'targetDate', 'offsetBaseDate'].includes(field)) return

    const today = dateUtils.todayString()

    if (field === 'targetDate') {
      this.applyCountdown(today)
      return
    }

    if (field === 'offsetBaseDate') {
      this.updateOffset({ offsetBaseDate: today })
      return
    }

    const startDate = field === 'startDate' ? today : this.data.startDate
    const endDate = field === 'endDate' ? today : this.data.endDate
    const result = betweenResult(startDate, endDate)
    this.setData(Object.assign({ today, [field]: today }, result))
  },

  applyCountdown(targetDate) {
    const today = dateUtils.todayString()
    const result = countdownResult(targetDate, today)
    this.setData({
      today,
      targetDate,
      countdownStatus: result.status,
      countdownPrefix: result.prefix,
      countdownDays: result.days,
      countdownText: result.text
    })
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜日期计算不掰手指',
      path: '/pages/date/index'
    }
  }
})
