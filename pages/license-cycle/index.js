const licenseCycle = require('../../utils/license-cycle')
const cycle = require('../../utils/cycle')
const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')

function todayString() {
  return cycle.formatLocalDate(new Date())
}

function presentResult(result) {
  let level = 'safe'
  if (result.deductedPoints >= 12) level = 'danger'
  else if (result.deductedPoints >= 9) level = 'warning'
  return Object.assign({}, result, { level })
}

Page({
  data: {
    today: todayString(),
    initialDate: '',
    deductedPoints: '',
    result: null
  },

  onLoad() {
    analytics.trackToolOpen('license-cycle')
  },

  onShow() {
    tools.recordRecent('license-cycle')
    this.setData({ today: todayString() })
  },

  onDateChange(event) {
    this.setData({ initialDate: event.detail.value, result: null })
  },

  onPointsInput(event) {
    this.setData({ deductedPoints: event.detail.value, result: null })
  },

  fillExample() {
    this.setData({ initialDate: '2020-06-15', deductedPoints: '3', result: null })
    analytics.trackToolAction('license-cycle', 'fill_example', 'success')
  },

  calculate() {
    if (!this.data.initialDate || !this.data.deductedPoints.trim()) {
      wx.showToast({ title: '请选择初领日期并填写已扣分', icon: 'none' })
      analytics.trackToolAction('license-cycle', 'calculate', 'invalid')
      return
    }
    const result = licenseCycle.calculateLicenseCycle(
      this.data.initialDate,
      this.data.deductedPoints,
      this.data.today
    )
    if (!result) {
      wx.showToast({ title: '请检查初领日期和扣分数', icon: 'none' })
      analytics.trackToolAction('license-cycle', 'calculate', 'invalid')
      return
    }
    this.setData({ result: presentResult(result) })
    analytics.trackToolAction('license-cycle', 'calculate', 'success')
  },

  showOfficialGuide() {
    wx.showModal({
      title: '请用官方渠道核验',
      content: '打开“交管12123”App，在驾驶证页面查看累计记分、清分日期和未处理违法。这里不会连接交管系统。',
      showCancel: false,
      confirmText: '知道了'
    })
    analytics.trackToolAction('license-cycle', 'official_guide', 'success')
  },

  clearAll() {
    this.setData({ initialDate: '', deductedPoints: '', result: null })
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜驾驶证记分周期助手',
      path: '/pages/license-cycle/index'
    }
  }
})
