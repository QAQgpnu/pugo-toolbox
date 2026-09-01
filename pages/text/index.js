const toolService = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const { OPERATION_IDS, countText, processText } = require('../../utils/text')

const OPERATIONS = Object.freeze([
  {
    id: OPERATION_IDS.REMOVE_EMPTY_LINES,
    symbol: '空',
    name: '去除空行',
    description: '删除没有内容的行',
    selected: false
  },
  {
    id: OPERATION_IDS.DEDUPE_LINES,
    symbol: '重',
    name: '每行去重',
    description: '重复行只保留第一次出现',
    selected: false
  },
  {
    id: OPERATION_IDS.MERGE_SPACES,
    symbol: '并',
    name: '合并空格',
    description: '连续空格合并为一个',
    selected: false
  },
  {
    id: OPERATION_IDS.TRIM_LINES,
    symbol: '齐',
    name: '清理首尾空格',
    description: '删除每行开头和结尾的空格',
    selected: false
  },
  {
    id: OPERATION_IDS.SORT_LINES,
    symbol: '序',
    name: '逐行排序',
    description: '按数字和中文顺序排列每一行',
    selected: false
  },
  {
    id: OPERATION_IDS.NUMBER_LINES,
    symbol: '号',
    name: '添加序号',
    description: '为每个非空行添加 1、2、3 序号',
    selected: false
  },
  {
    id: OPERATION_IDS.EXTRACT_LINKS,
    symbol: '链',
    name: '提取网页链接',
    description: '只保留 http 或 https 链接并去重',
    selected: false
  }
])

Page({
  data: {
    text: '',
    characterCount: 0,
    lineCount: 0,
    operations: OPERATIONS,
    selectedOperations: []
  },

  onLoad() {
    analytics.trackToolOpen('text')
  },

  onShow() {
    toolService.recordRecent('text')
  },

  onTextInput(event) {
    this.updateText(event.detail.value)
  },

  updateText(text) {
    const stats = countText(text)
    this.setData({
      text,
      characterCount: stats.characterCount,
      lineCount: stats.lineCount
    })
  },

  toggleOperation(event) {
    const id = event.currentTarget.dataset.id
    if (!id) return

    const operations = this.data.operations.map((item) => {
      return item.id === id ? Object.assign({}, item, { selected: !item.selected }) : item
    })
    const selectedOperations = operations.filter((item) => item.selected).map((item) => item.id)

    this.setData({ operations, selectedOperations })
  },

  runProcessing() {
    if (!this.data.text) {
      wx.showToast({ title: '请先输入文本', icon: 'none' })
      return
    }

    if (!this.data.selectedOperations.length) {
      wx.showToast({ title: '请至少选择一项操作', icon: 'none' })
      return
    }

    const result = processText(this.data.text, this.data.selectedOperations)
    if (this.data.selectedOperations.includes(OPERATION_IDS.EXTRACT_LINKS) && !result) {
      analytics.trackToolAction('text', 'extract-links', 'failed')
      wx.showToast({ title: '没有找到网页链接', icon: 'none' })
      return
    }
    this.updateText(result)
    analytics.trackToolAction('text', this.data.selectedOperations.join('_'), 'success')
    wx.showToast({ title: '处理完成', icon: 'success' })
  },

  copyResult() {
    if (!this.data.text) {
      wx.showToast({ title: '暂无可复制内容', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: this.data.text,
      success() {
        analytics.trackCopy('text')
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  clearText() {
    if (!this.data.text) return
    this.updateText('')
    wx.showToast({ title: '已清空', icon: 'none' })
  },

  fillExample() {
    if (this.data.text) {
      wx.showToast({ title: '请先清空当前文本', icon: 'none' })
      return
    }
    this.updateText('  购买 2 个收纳盒  \n\n购买 10 个文件夹\n购买 2 个收纳盒\n资料：https://example.com/guide')
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜文本处理',
      path: '/pages/text/index'
    }
  }
})
