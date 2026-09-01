const money = require('../../utils/money')
const toolService = require('../../utils/tools')
const analytics = require('../../utils/analytics')

Page({
  data: {
    amount: '',
    result: '',
    error: ''
  },

  onLoad() {
    analytics.trackToolOpen('money')
  },

  onShow() {
    toolService.recordRecent('money')
  },

  onInput(event) {
    const amount = event.detail.value
    if (!amount.trim()) {
      this.setData({ amount, result: '', error: '' })
      return
    }
    const result = money.toChineseUppercase(amount)
    this.setData({
      amount,
      result: result || '',
      error: result ? '' : '请输入不超过 12 位整数、最多 2 位小数的非负金额'
    })
  },

  fillExample() {
    const amount = '1001.05'
    this.setData({ amount, result: money.toChineseUppercase(amount), error: '' })
    analytics.trackToolAction('money', 'fill_example', 'success')
  },

  copyResult() {
    if (!this.data.result) return
    wx.setClipboardData({
      data: this.data.result,
      success: () => {
        analytics.trackToolAction('money', 'convert', 'success')
        analytics.trackCopy('money')
        wx.showToast({ title: '大写金额已复制', icon: 'success' })
      }
    })
  },

  clearAll() {
    this.setData({ amount: '', result: '', error: '' })
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜金额大写',
      path: '/pages/money/index'
    }
  }
})
