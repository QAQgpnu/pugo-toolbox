const tableCleaner = require('../../utils/table-cleaner')
const toolService = require('../../utils/tools')
const analytics = require('../../utils/analytics')

const MAX_HISTORY = 20

function buildGroups() {
  const groups = []
  tableCleaner.OPERATIONS.forEach((operation) => {
    const found = groups.find((group) => group.name === operation.group)
    if (found) {
      found.operations.push(operation)
    } else {
      groups.push({ name: operation.group, operations: [operation] })
    }
  })
  return groups
}

function toast(title) {
  wx.showToast({ title, icon: 'none' })
}

Page({
  data: {
    input: '',
    output: '',
    inputLines: 0,
    inputChars: 0,
    outputLines: 0,
    outputChars: 0,
    maxLength: tableCleaner.MAX_INPUT_LENGTH,
    tooLong: false,
    groups: [],
    columns: '3',
    lastOperationName: '',
    canUndo: false,
    hasResult: false
  },

  onLoad() {
    analytics.trackToolOpen('table-cleaner')
    this.history = []
    this.setData({ groups: buildGroups() })
  },

  onShow() {
    toolService.recordRecent('table-cleaner')
  },

  onInput(event) {
    const value = String(event.detail.value || '')
    this.setData({
      input: value,
      inputLines: tableCleaner.lineCount(value),
      inputChars: value.length,
      tooLong: value.length > tableCleaner.MAX_INPUT_LENGTH
    })
  },

  onColumnsInput(event) {
    this.setData({ columns: String(event.detail.value || '') })
  },

  applyOperation(event) {
    const operationId = event.currentTarget.dataset.id
    const text = this.data.input
    if (!text.trim()) {
      toast('先粘贴需要整理的文本')
      return
    }
    if (this.data.tooLong) {
      toast(`文本超过 ${tableCleaner.MAX_INPUT_LENGTH} 字，请先精简`)
      return
    }

    const options = {}
    if (operationId === 'single-to-multi') {
      const columns = parseInt(this.data.columns, 10)
      if (!Number.isFinite(columns) || columns < 1 || columns > tableCleaner.MAX_COLUMNS) {
        toast(`请输入 1-${tableCleaner.MAX_COLUMNS} 之间的列数`)
        return
      }
      options.columns = columns
    }

    const result = tableCleaner.runOperation(text, operationId, options)
    if (!result) {
      toast('这段文本暂时无法处理，换个操作试试')
      return
    }

    this.history.push(text)
    if (this.history.length > MAX_HISTORY) this.history.shift()

    const operation = tableCleaner.OPERATIONS.find((item) => item.id === operationId)
    this.setData({
      output: result.output,
      inputLines: result.inputLines,
      inputChars: result.inputChars,
      outputLines: result.outputLines,
      outputChars: result.outputChars,
      lastOperationName: operation ? operation.name : '',
      canUndo: true,
      hasResult: true
    })
    analytics.trackToolAction('table-cleaner', 'run_operation', 'success')
  },

  undoLast() {
    if (!this.history.length) {
      toast('没有可撤销的操作')
      return
    }
    const previous = this.history.pop()
    this.setData({
      input: previous,
      inputLines: tableCleaner.lineCount(previous),
      inputChars: previous.length,
      output: '',
      outputLines: 0,
      outputChars: 0,
      lastOperationName: '',
      canUndo: this.history.length > 0,
      hasResult: false,
      tooLong: previous.length > tableCleaner.MAX_INPUT_LENGTH
    })
    analytics.trackToolAction('table-cleaner', 'undo', 'success')
  },

  clearAll() {
    this.history = []
    this.setData({
      input: '',
      output: '',
      inputLines: 0,
      inputChars: 0,
      outputLines: 0,
      outputChars: 0,
      lastOperationName: '',
      canUndo: false,
      hasResult: false,
      tooLong: false
    })
  },

  copyResult() {
    if (!this.data.output) {
      toast('还没有结果可以复制')
      return
    }
    wx.setClipboardData({
      data: this.data.output,
      success: () => {
        toast('已复制结果')
        analytics.trackToolAction('table-cleaner', 'copy_result', 'success')
        analytics.trackCopy('table-cleaner')
      },
      fail: () => toast('复制失败，请长按文本手动复制')
    })
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜表格文本整理',
      path: '/pages/table-cleaner/index'
    }
  }
})
