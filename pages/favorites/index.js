const toolService = require('../../utils/tools')
const analytics = require('../../utils/analytics')

Page({
  data: {
    tools: []
  },

  onShow() {
    this.setData({ tools: toolService.getFavoriteTools() })
  },

  onFavoritesChange() {
    this.setData({ tools: toolService.getFavoriteTools() })
  },

  openTool(event) {
    const tool = toolService.getToolById(event.currentTarget.dataset.id)
    if (!tool) return
    wx.navigateTo({ url: tool.path })
  },

  removeFavorite(event) {
    const id = event.currentTarget.dataset.id
    toolService.toggleFavorite(id)
    analytics.trackFavorite(id, false)
    this.setData({ tools: toolService.getFavoriteTools() })
    wx.showToast({ title: '已取消收藏', icon: 'none' })
  },

  goHome() {
    wx.reLaunch({ url: '/pages/home/index' })
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜把小事，三秒搞定',
      path: '/pages/home/index'
    }
  }
})
