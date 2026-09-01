const finance = require('../../utils/finance-tools')
const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')

function ageOptions() {
  const values = []
  for (let age = 40; age <= 70; age += 1) values.push(String(age))
  return values
}

function moneyText(value) {
  const parts = Number(value).toFixed(2).split('.')
  const integer = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${integer}.${parts[1]}`
}

function presentResult(result) {
  return Object.assign({}, result, {
    indexedMonthlySalaryText: moneyText(result.indexedMonthlySalary),
    basicPensionText: moneyText(result.basicPension),
    accountPensionText: moneyText(result.accountPension),
    estimatedMonthlyText: moneyText(result.estimatedMonthly),
    estimatedAnnualText: moneyText(result.estimatedAnnual),
    accountBalanceText: moneyText(result.accountBalance),
    calculationBaseText: moneyText(result.calculationBase)
  })
}

const AGES = ageOptions()

Page({
  data: {
    calculationBase: '',
    averageIndex: '',
    contributionYears: '',
    accountBalance: '',
    ageOptions: AGES,
    ageIndex: 20,
    retirementAge: '60',
    result: null
  },

  onLoad() {
    analytics.trackToolOpen('retirement')
  },

  onShow() {
    tools.recordRecent('retirement')
  },

  onFieldInput(event) {
    const field = event.currentTarget.dataset.field
    if (!['calculationBase', 'averageIndex', 'contributionYears', 'accountBalance'].includes(field)) return
    this.setData({ [field]: event.detail.value, result: null })
  },

  onAgeChange(event) {
    const ageIndex = Number(event.detail.value)
    this.setData({ ageIndex, retirementAge: this.data.ageOptions[ageIndex], result: null })
  },

  fillExample() {
    this.setData({
      calculationBase: '9000',
      averageIndex: '1',
      contributionYears: '30',
      accountBalance: '120000',
      ageIndex: 20,
      retirementAge: '60',
      result: null
    })
    analytics.trackToolAction('retirement', 'fill_example', 'success')
  },

  calculate() {
    const required = ['calculationBase', 'averageIndex', 'contributionYears', 'accountBalance']
    if (required.some((field) => !this.data[field].trim())) {
      wx.showToast({ title: '请先填写全部估算参数', icon: 'none' })
      analytics.trackToolAction('retirement', 'calculate', 'invalid')
      return
    }
    const result = finance.calculatePensionEstimate(
      this.data.calculationBase,
      this.data.averageIndex,
      this.data.contributionYears,
      this.data.accountBalance,
      this.data.retirementAge
    )
    if (!result) {
      wx.showToast({ title: '参数超出试算范围，请检查', icon: 'none' })
      analytics.trackToolAction('retirement', 'calculate', 'invalid')
      return
    }
    this.setData({ result: presentResult(result) })
    analytics.trackToolAction('retirement', 'calculate', 'success')
  },

  clearAll() {
    this.setData({
      calculationBase: '',
      averageIndex: '',
      contributionYears: '',
      accountBalance: '',
      ageIndex: 20,
      retirementAge: '60',
      result: null
    })
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜职工基本养老金试算',
      path: '/pages/retirement/index'
    }
  }
})
