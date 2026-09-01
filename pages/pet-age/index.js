const petAge = require('../../utils/pet-age')
const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')

function sizeHint(sizeId) {
  const item = petAge.DOG_SIZES.find((size) => size.id === sizeId)
  return item ? item.hint : ''
}

Page({
  data: {
    type: 'cat',
    dogSize: 'medium',
    dogSizes: petAge.DOG_SIZES,
    dogSizeHint: sizeHint('medium'),
    years: '',
    months: '',
    result: null
  },

  onLoad() {
    analytics.trackToolOpen('pet-age')
  },

  onShow() {
    tools.recordRecent('pet-age')
  },

  selectType(event) {
    const type = event.currentTarget.dataset.type
    if (!['cat', 'dog'].includes(type)) return
    this.setData({ type, result: null })
  },

  selectDogSize(event) {
    const dogSize = event.currentTarget.dataset.size
    if (!petAge.DOG_SIZES.some((size) => size.id === dogSize)) return
    this.setData({ dogSize, dogSizeHint: sizeHint(dogSize), result: null })
  },

  onAgeInput(event) {
    const field = event.currentTarget.dataset.field
    if (!['years', 'months'].includes(field)) return
    this.setData({ [field]: event.detail.value, result: null })
  },

  fillExample() {
    this.setData({
      type: 'dog',
      dogSize: 'medium',
      dogSizeHint: sizeHint('medium'),
      years: '4',
      months: '6',
      result: null
    })
    analytics.trackToolAction('pet-age', 'fill_example', 'success')
  },

  calculate() {
    const years = this.data.years.trim() || 0
    const months = this.data.months.trim() || 0
    const result = petAge.calculatePetAge(this.data.type, years, months, this.data.dogSize)
    if (!result) {
      wx.showToast({ title: '请填写 1 个月至 30 岁的年龄', icon: 'none' })
      analytics.trackToolAction('pet-age', 'calculate', 'invalid')
      return
    }
    this.setData({ result })
    analytics.trackToolAction('pet-age', 'calculate', 'success')
  },

  clearAll() {
    this.setData({ years: '', months: '', result: null })
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜宠物年龄换算',
      path: '/pages/pet-age/index'
    }
  }
})
