const excelData = require('../../utils/excel-data')
const storage = require('../../utils/storage')
const toolService = require('../../utils/tools')
const analytics = require('../../utils/analytics')

const MAX_RECENT = 8

const WIZARD_EXAMPLES = {
  sumif: { range: 'A2:A100', condition: '华东', sumRange: 'C2:C100' },
  countifs: { range1: 'A2:A100', condition1: '华东', range2: 'C2:C100', condition2: '>100' },
  'keyword-if': { cell: 'A2', keyword: '发票', yesText: '是', noText: '否' },
  vlookup: { lookupCell: 'A2', tableRange: 'D2:F100', columnIndex: '2' },
  mid: { cell: 'A2', start: '7', length: '8' },
  datedif: { startCell: 'A2', endCell: 'B2' }
}

function buildCategories() {
  return [{ id: 'all', name: '全部', count: excelData.FORMULA_LIBRARY.length }]
    .concat(excelData.FORMULA_CATEGORIES.map((category) => ({
      id: category.id,
      name: category.name,
      count: excelData.FORMULA_LIBRARY.filter((formula) => formula.category === category.id).length
    })))
}

function normalizeNameList(value) {
  const stored = Array.isArray(value) ? value : []
  return stored.filter((name, index) => Boolean(excelData.getFormulaByName(name)) && stored.indexOf(name) === index)
}

Page({
  data: {
    query: '',
    activeCategoryId: 'all',
    categories: [],
    list: [],
    expandedName: '',
    favoriteNames: [],
    recentList: [],
    scenarios: [],
    wizardScenarioId: '',
    wizardFields: [],
    wizardInputs: {},
    wizardResult: null
  },

  onLoad() {
    analytics.trackToolOpen('excel-formulas')
    const favoriteNames = normalizeNameList(storage.get(storage.KEYS.excelFormulaFavorites, []))
    const recentNames = normalizeNameList(storage.get(storage.KEYS.excelFormulaRecent, []))
    this.setData({
      categories: buildCategories(),
      scenarios: excelData.WIZARD_SCENARIOS.map((scenario) => ({
        id: scenario.id,
        name: scenario.name,
        description: scenario.description
      })),
      favoriteNames,
      recentList: recentNames.map(excelData.getFormulaByName).filter(Boolean)
    })
    this.refreshList()
  },

  onShow() {
    toolService.recordRecent('excel-formulas')
  },

  refreshList() {
    const favoriteNames = this.data.favoriteNames
    const list = excelData.searchFormulas(this.data.query, this.data.activeCategoryId)
      .map((formula) => Object.assign({}, formula, { isFavorite: favoriteNames.includes(formula.name) }))
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
    const name = event.currentTarget.dataset.name
    const next = this.data.expandedName === name ? '' : name
    this.setData({ expandedName: next })
    if (next) this.rememberFormula(name)
  },

  rememberFormula(name) {
    const current = normalizeNameList(storage.get(storage.KEYS.excelFormulaRecent, []))
    const next = [name].concat(current.filter((item) => item !== name)).slice(0, MAX_RECENT)
    if (!storage.set(storage.KEYS.excelFormulaRecent, next)) {
      wx.showToast({ title: '最近查看保存失败', icon: 'none' })
      return
    }
    this.setData({ recentList: next.map(excelData.getFormulaByName).filter(Boolean) })
  },

  openRecent(event) {
    const name = event.currentTarget.dataset.name
    if (!excelData.getFormulaByName(name)) return
    this.setData({ query: '', activeCategoryId: 'all', expandedName: name })
    this.refreshList()
  },

  toggleFormulaFavorite(event) {
    const name = event.currentTarget.dataset.name
    if (!excelData.getFormulaByName(name)) return
    const current = normalizeNameList(storage.get(storage.KEYS.excelFormulaFavorites, []))
    const added = !current.includes(name)
    const next = added ? [name].concat(current) : current.filter((item) => item !== name)
    if (!storage.set(storage.KEYS.excelFormulaFavorites, next)) {
      wx.showToast({ title: '收藏保存失败', icon: 'none' })
      return
    }
    this.setData({ favoriteNames: next })
    this.refreshList()
    analytics.trackToolAction('excel-formulas', added ? 'favorite_formula' : 'unfavorite_formula', 'success')
    wx.showToast({ title: added ? '已收藏该函数' : '已取消收藏', icon: 'none' })
  },

  copyText(event) {
    const text = event.currentTarget.dataset.text
    if (!text) return
    wx.setClipboardData({
      data: String(text),
      success: () => {
        analytics.trackToolAction('excel-formulas', 'copy_formula', 'success')
        analytics.trackCopy('excel-formulas')
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  selectScenario(event) {
    const scenario = excelData.WIZARD_SCENARIOS.find((item) => item.id === event.currentTarget.dataset.id)
    if (!scenario) return
    this.setData({
      wizardScenarioId: scenario.id,
      wizardFields: scenario.fields.map((field) => ({ key: field.key, label: field.label, placeholder: field.placeholder })),
      wizardInputs: {},
      wizardResult: null
    })
  },

  onWizardInput(event) {
    const key = event.currentTarget.dataset.key
    if (!key) return
    const patch = {}
    patch[`wizardInputs.${key}`] = String(event.detail.value || '')
    this.setData(patch)
  },

  fillWizardExample() {
    const example = WIZARD_EXAMPLES[this.data.wizardScenarioId]
    if (!example) return
    const patch = {}
    Object.keys(example).forEach((key) => {
      patch[`wizardInputs.${key}`] = example[key]
    })
    this.setData(patch)
    analytics.trackToolAction('excel-formulas', 'wizard_example', 'success')
  },

  generateWizard() {
    const result = excelData.generateWizardFormula(this.data.wizardScenarioId, this.data.wizardInputs)
    if (!result) {
      wx.showToast({ title: '请把每个空都填上，数字项要填正整数', icon: 'none' })
      return
    }
    this.setData({ wizardResult: result })
    analytics.trackToolAction('excel-formulas', 'wizard_generate', 'success')
  },

  clearWizard() {
    this.setData({ wizardScenarioId: '', wizardFields: [], wizardInputs: {}, wizardResult: null })
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜Excel公式助手',
      path: '/pages/excel-formulas/index'
    }
  }
})
