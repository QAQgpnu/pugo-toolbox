const storage = require('../../utils/storage')
const toolService = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const randomUtils = require('../../utils/random')

function readHistory() {
  const value = storage.get(storage.KEYS.randomHistory, [])
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string' && item.trim()).slice(0, 5)
    : []
}

Page({
  data: {
    inputValue: '',
    mode: 'single',
    inputPlaceholder: '每行一个选项\n例如：吃火锅、吃烧烤、吃家常菜',
    optionCount: 0,
    canDraw: false,
    groupCount: 2,
    groupResults: [],
    result: '',
    history: []
  },

  onLoad() {
    analytics.trackToolOpen('random')
  },

  onShow() {
    toolService.recordRecent('random')
    this.setData({ history: readHistory() })
  },

  onOptionsInput(event) {
    const inputValue = event.detail.value
    const optionCount = randomUtils.parseOptions(inputValue).length
    this.setData({
      inputValue,
      optionCount,
      canDraw: this.canRun(optionCount, this.data.groupCount, this.data.mode),
      groupResults: []
    })
  },

  switchMode(event) {
    const mode = event.currentTarget.dataset.mode
    if (!['single', 'group'].includes(mode)) return
    this.setData({
      mode,
      canDraw: this.canRun(this.data.optionCount, this.data.groupCount, mode),
      result: '',
      groupResults: []
    })
  },

  onGroupCountInput(event) {
    const value = Number(event.detail.value)
    const groupCount = Number.isFinite(value) ? Math.floor(value) : 0
    this.setData({
      groupCount,
      canDraw: this.canRun(this.data.optionCount, groupCount, this.data.mode),
      groupResults: []
    })
  },

  canRun(optionCount, groupCount, mode) {
    if (mode === 'single') return optionCount >= 2
    return optionCount >= 2 && groupCount >= 2 && groupCount <= optionCount
  },

  chooseRandom() {
    const options = randomUtils.parseOptions(this.data.inputValue)
    if (options.length < 2) {
      wx.showToast({ title: '请至少输入 2 个不同选项', icon: 'none' })
      return
    }

    if (this.data.mode === 'group') {
      const groups = randomUtils.groupOptions(options, this.data.groupCount)
      if (!groups.length) {
        wx.showToast({ title: '组数需为 2 到选项总数', icon: 'none' })
        return
      }
      const groupResults = groups.map((items, index) => ({
        name: `第 ${index + 1} 组`,
        items
      }))
      this.setData({ groupResults, result: '' })
      analytics.trackToolAction('random', 'group', 'success')
      this.vibrateIfEnabled()
      return
    }

    const result = options[Math.floor(Math.random() * options.length)]
    const history = [result].concat(this.data.history).slice(0, 5)
    storage.set(storage.KEYS.randomHistory, history)
    this.setData({ result, history })
    analytics.trackToolAction('random', 'draw', 'success')
    this.vibrateIfEnabled()
  },

  fillExample() {
    if (this.data.inputValue) {
      wx.showToast({ title: '请先清空候选清单', icon: 'none' })
      return
    }
    const inputValue = '小浦\n阿明\n小林\n小周\n小陈\n小李'
    const optionCount = randomUtils.parseOptions(inputValue).length
    this.setData({
      inputValue,
      optionCount,
      canDraw: this.canRun(optionCount, this.data.groupCount, this.data.mode)
    })
  },

  vibrateIfEnabled() {
    const settings = toolService.getSettings()
    if (!settings.vibration || typeof wx.canIUse !== 'function' || !wx.canIUse('vibrateShort')) return

    try {
      wx.vibrateShort({ type: 'light' })
    } catch (error) {
      // 部分旧基础库会声明接口但调用失败，不影响抽取结果。
    }
  },

  clearHistory() {
    wx.showModal({
      title: '清空抽取历史？',
      content: '只会删除最近 5 条抽取结果。',
      confirmText: '确认清空',
      confirmColor: '#C86F00',
      success: (modalResult) => {
        if (!modalResult.confirm) return
        storage.remove(storage.KEYS.randomHistory)
        this.setData({ history: [] })
        wx.showToast({ title: '已清空', icon: 'success' })
      }
    })
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜纠结时，交给运气',
      path: '/pages/random/index'
    }
  }
})
