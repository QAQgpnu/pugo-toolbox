const toolService = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const { CATEGORY_CONFIG, convertValue, formatNumber } = require('../../utils/converter')

const CATEGORY_TABS = Object.keys(CATEGORY_CONFIG).map((id) => ({
  id,
  label: CATEGORY_CONFIG[id].label
}))

const DEFAULT_UNITS = Object.freeze({
  length: Object.freeze(['meter', 'centimeter']),
  weight: Object.freeze(['kilogram', 'gram']),
  area: Object.freeze(['squareMeter', 'mu']),
  volume: Object.freeze(['liter', 'milliliter']),
  speed: Object.freeze(['kilometerPerHour', 'meterPerSecond']),
  time: Object.freeze(['hour', 'minute']),
  data: Object.freeze(['gigabyte', 'megabyte']),
  temperature: Object.freeze(['celsius', 'fahrenheit'])
})

function unitIndex(units, id) {
  const index = units.findIndex((unit) => unit.id === id)
  return index < 0 ? 0 : index
}

Page({
  data: {
    categoryTabs: CATEGORY_TABS,
    currentCategory: 'length',
    units: CATEGORY_CONFIG.length.units,
    fromIndex: unitIndex(CATEGORY_CONFIG.length.units, DEFAULT_UNITS.length[0]),
    toIndex: unitIndex(CATEGORY_CONFIG.length.units, DEFAULT_UNITS.length[1]),
    inputValue: '',
    result: ''
  },

  onLoad() {
    analytics.trackToolOpen('convert')
  },

  onShow() {
    toolService.recordRecent('convert')
  },

  onCategoryTap(event) {
    const categoryId = event.currentTarget.dataset.id
    const category = CATEGORY_CONFIG[categoryId]
    if (!category || categoryId === this.data.currentCategory) return

    const defaults = DEFAULT_UNITS[categoryId]
    this.updateConversion({
      currentCategory: categoryId,
      units: category.units,
      fromIndex: unitIndex(category.units, defaults[0]),
      toIndex: unitIndex(category.units, defaults[1])
    })
  },

  onValueInput(event) {
    this.updateConversion({ inputValue: event.detail.value })
  },

  onFromChange(event) {
    this.updateConversion({ fromIndex: Number(event.detail.value) })
  },

  onToChange(event) {
    this.updateConversion({ toIndex: Number(event.detail.value) })
  },

  swapUnits() {
    this.updateConversion({
      fromIndex: this.data.toIndex,
      toIndex: this.data.fromIndex
    })
    analytics.trackToolAction('convert', 'swap_units', 'success')
  },

  updateConversion(patch) {
    const state = Object.assign({}, this.data, patch)
    const rawValue = String(state.inputValue).trim()
    let result = ''

    if (rawValue !== '') {
      const fromUnit = state.units[state.fromIndex]
      const toUnit = state.units[state.toIndex]
      result = formatNumber(convertValue(
        rawValue,
        state.currentCategory,
        fromUnit && fromUnit.id,
        toUnit && toUnit.id
      ))
    }

    this.setData(Object.assign({}, patch, { result }))
  },

  copyResult() {
    if (!this.data.result) {
      wx.showToast({ title: '请先输入要换算的数值', icon: 'none' })
      return
    }

    const unit = this.data.units[this.data.toIndex]
    wx.setClipboardData({
      data: `${this.data.result} ${unit.symbol}`,
      success: () => {
        analytics.trackToolAction('convert', this.data.currentCategory, 'success')
        analytics.trackCopy('convert')
        wx.showToast({ title: '结果已复制', icon: 'success' })
      }
    })
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜常用单位快速换算',
      path: '/pages/convert/index'
    }
  }
})
