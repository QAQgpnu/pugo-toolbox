const excelData = require('../../utils/excel-data')
const toolService = require('../../utils/tools')
const analytics = require('../../utils/analytics')

function buildCategories() {
  return [{ id: 'all', name: '全部', count: excelData.ERROR_GUIDES.length }]
    .concat(excelData.ERROR_CATEGORIES.map((category) => ({
      id: category.id,
      name: category.name,
      count: excelData.ERROR_GUIDES.filter((guide) => guide.category === category.id).length
    })))
}

Page({
  data: {
    query: '',
    activeCategoryId: 'all',
    categories: [],
    list: [],
    expandedId: ''
  },

  onLoad() {
    analytics.trackToolOpen('excel-errors')
    this.setData({ categories: buildCategories() })
    this.refreshList()
  },

  onShow() {
    toolService.recordRecent('excel-errors')
  },

  refreshList() {
    const list = excelData.searchErrors(this.data.query, this.data.activeCategoryId)
      .map((guide) => Object.assign({}, guide, { isCode: guide.category === 'code' }))
    this.setData({ list })
  },

  onSearchInput(event) {
    this.setData({ query: String(event.detail.value || '').trim() })
    this.refreshList()
  },

  clearSearch() {
    this.setData({ query: '' })
    this.refreshList()
  },

  selectCategory(event) {
    this.setData({ activeCategoryId: event.currentTarget.dataset.id })
    this.refreshList()
  },

  toggleExpand(event) {
    const id = event.currentTarget.dataset.id
    const next = this.data.expandedId === id ? '' : id
    this.setData({ expandedId: next })
    if (next) analytics.trackToolAction('excel-errors', 'open_guide', 'success')
  },

  fillSample(event) {
    const id = event.currentTarget.dataset.id
    const guide = excelData.getErrorGuide(id)
    if (!guide) return
    this.setData({ query: '', activeCategoryId: 'all', expandedId: id })
    this.refreshList()
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜Excel报错诊断',
      path: '/pages/excel-errors/index'
    }
  }
})
