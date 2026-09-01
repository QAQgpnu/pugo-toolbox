const calculator = require('../../utils/calculate')
const { formatNumber } = require('../../utils/converter')
const toolService = require('../../utils/tools')
const analytics = require('../../utils/analytics')

const MODES = Object.freeze([
  Object.freeze({ id: 'percentage', label: '占比', firstLabel: '部分数值', secondLabel: '总数值', firstPlaceholder: '例如 25', secondPlaceholder: '例如 200' }),
  Object.freeze({ id: 'discount', label: '折扣', firstLabel: '原价', secondLabel: '折扣（几折）', firstPlaceholder: '例如 299', secondPlaceholder: '例如 8.5' }),
  Object.freeze({ id: 'change', label: '涨跌幅', firstLabel: '原数值', secondLabel: '新数值', firstPlaceholder: '例如 80', secondPlaceholder: '例如 100' })
])

function getMode(modeId) {
  return MODES.find((item) => item.id === modeId) || MODES[0]
}

Page({
  data: {
    modes: MODES,
    currentMode: MODES[0].id,
    modeInfo: MODES[0],
    firstValue: '',
    secondValue: '',
    result: '',
    detail: ''
  },

  onLoad() {
    analytics.trackToolOpen('calculate')
  },

  onShow() {
    toolService.recordRecent('calculate')
  },

  switchMode(event) {
    const currentMode = event.currentTarget.dataset.id
    if (!MODES.some((item) => item.id === currentMode)) return
    this.setData({
      currentMode,
      modeInfo: getMode(currentMode),
      firstValue: '',
      secondValue: '',
      result: '',
      detail: ''
    })
  },

  onFirstInput(event) {
    this.recalculate({ firstValue: event.detail.value })
  },

  onSecondInput(event) {
    this.recalculate({ secondValue: event.detail.value })
  },

  recalculate(patch) {
    const state = Object.assign({}, this.data, patch)
    let result = ''
    let detail = ''

    if (state.currentMode === 'percentage') {
      const percentage = calculator.percentageOf(state.firstValue, state.secondValue)
      if (percentage !== null) {
        result = `${formatNumber(percentage)}%`
        detail = '部分数值 ÷ 总数值 × 100%'
      }
    } else if (state.currentMode === 'discount') {
      const discount = calculator.discountPrice(state.firstValue, state.secondValue)
      if (discount) {
        result = `¥${formatNumber(discount.finalPrice)}`
        detail = `节省 ¥${formatNumber(discount.saved)}`
      }
    } else {
      const change = calculator.percentageChange(state.firstValue, state.secondValue)
      if (change !== null) {
        const formatted = formatNumber(Math.abs(change))
        result = `${change >= 0 ? '+' : '-'}${formatted}%`
        detail = change > 0 ? '相比原数值上涨' : change < 0 ? '相比原数值下降' : '与原数值持平'
      }
    }

    this.setData(Object.assign({}, patch, { result, detail }))
  },

  copyResult() {
    if (!this.data.result) return
    wx.setClipboardData({
      data: `${this.data.result}${this.data.detail ? `（${this.data.detail}）` : ''}`,
      success: () => {
        analytics.trackToolAction('calculate', this.data.currentMode, 'success')
        analytics.trackCopy('calculate')
        wx.showToast({ title: '结果已复制', icon: 'success' })
      }
    })
  },

  clearAll() {
    this.setData({ firstValue: '', secondValue: '', result: '', detail: '' })
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜百分比与折扣计算',
      path: '/pages/calculate/index'
    }
  }
})
