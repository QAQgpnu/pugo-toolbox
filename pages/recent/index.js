const toolService = require('../../utils/tools')

Page({
  data: {
    tools: []
  },

  onShow() {
    this.setData({ tools: toolService.getRecentTools() })
  },

  openTool(event) {
    const tool = toolService.getToolById(event.currentTarget.dataset.id)
    if (tool) wx.navigateTo({ url: tool.path })
  },

  clearRecent() {
    if (!this.data.tools.length) return
    wx.showModal({
      title: '清空最近使用？',
      content: '只会清除工具访问记录，不影响收藏和工具数据。',
      confirmText: '清空',
      confirmColor: '#B46500',
      success: (result) => {
        if (!result.confirm) return
        toolService.clearRecent()
        this.setData({ tools: [] })
        wx.showToast({ title: '已清空', icon: 'none' })
      }
    })
  },

  openToolDrawer() {
    const bottomNav = this.selectComponent('#bottomNav')
    if (bottomNav) bottomNav.openDrawer()
  }
})
