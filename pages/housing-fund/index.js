const finance = require('../../utils/finance-tools')
const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')

function moneyText(value) {
  const parts = Number(value).toFixed(2).split('.')
  const integer = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts[1] === '00' ? integer : `${integer}.${parts[1]}`
}

function presentResult(result) {
  return Object.assign({}, result, {
    personalMonthlyText: moneyText(result.personalMonthly),
    employerMonthlyText: moneyText(result.employerMonthly),
    totalMonthlyText: moneyText(result.totalMonthly),
    personalAnnualText: moneyText(result.personalAnnual),
    employerAnnualText: moneyText(result.employerAnnual),
    totalAnnualText: moneyText(result.totalAnnual),
    currentBalanceText: moneyText(result.currentBalance),
    projectedContributionText: moneyText(result.projectedContribution),
    projectedBalanceText: moneyText(result.projectedBalance)
  })
}

Page({
  data: {
    base: '',
    personalRate: '',
    employerRate: '',
    currentBalance: '',
    months: '',
    result: null
  },

  onLoad() {
    analytics.trackToolOpen('housing-fund')
  },

  onShow() {
    tools.recordRecent('housing-fund')
  },

  onFieldInput(event) {
    const field = event.currentTarget.dataset.field
    if (!['base', 'personalRate', 'employerRate', 'currentBalance', 'months'].includes(field)) return
    this.setData({ [field]: event.detail.value, result: null })
  },

  fillExample() {
    this.setData({
      base: '8000',
      personalRate: '5',
      employerRate: '5',
      currentBalance: '20000',
      months: '24',
      result: null
    })
    analytics.trackToolAction('housing-fund', 'fill_example', 'success')
  },

  calculate() {
    if (!this.data.base.trim() || !this.data.personalRate.trim() || !this.data.employerRate.trim()) {
      wx.showToast({ title: '请先填写基数和双方比例', icon: 'none' })
      analytics.trackToolAction('housing-fund', 'calculate', 'invalid')
      return
    }

    const result = finance.calculateHousingFund(
      this.data.base,
      this.data.personalRate,
      this.data.employerRate,
      this.data.currentBalance.trim() || 0,
      this.data.months.trim() || 12
    )
    if (!result) {
      wx.showToast({ title: '请检查金额、比例和月数', icon: 'none' })
      analytics.trackToolAction('housing-fund', 'calculate', 'invalid')
      return
    }
    this.setData({ result: presentResult(result) })
    analytics.trackToolAction('housing-fund', 'calculate', 'success')
  },

  clearAll() {
    this.setData({
      base: '',
      personalRate: '',
      employerRate: '',
      currentBalance: '',
      months: '',
      result: null
    })
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜公积金缴存试算',
      path: '/pages/housing-fund/index'
    }
  }
})
