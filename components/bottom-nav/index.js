const toolService = require('../../utils/tools')
const analytics = require('../../utils/analytics')

// 1.3.1 起底部导航精简为首页、工具（中央加号）、设置三栏。
// 收藏与最近使用页保留，从首页“查看全部”进入。
const TARGETS = {
  home: '/pages/home/index',
  settings: '/pages/settings/index'
}

function buildCategories() {
  const definitions = toolService.TOOL_DEFINITIONS
  return [{ id: 'all', name: '全部', count: definitions.length }]
    .concat(toolService.TOOL_CATEGORIES.map((category) => ({
      id: category.id,
      name: category.name,
      count: definitions.filter((tool) => tool.category === category.id).length
    })))
    .filter((category) => category.id === 'all' || category.count > 0)
}

Component({
  properties: {
    current: {
      type: String,
      value: 'home'
    }
  },

  data: {
    drawerOpen: false,
    query: '',
    activeCategoryId: 'all',
    categories: [],
    visibleTools: []
  },

  lifetimes: {
    attached() {
      this.refreshTools('', 'all')
    }
  },

  methods: {
    refreshTools(query, categoryId) {
      const categories = buildCategories()
      const safeCategoryId = categories.some((category) => category.id === categoryId) ? categoryId : 'all'
      const favoriteIds = toolService.getFavorites()
      const visibleTools = toolService.searchTools(query)
        .filter((tool) => safeCategoryId === 'all' || tool.category === safeCategoryId)
        .map((tool) => Object.assign({}, tool, { isFavorite: favoriteIds.includes(tool.id) }))

      this.setData({
        categories,
        activeCategoryId: safeCategoryId,
        visibleTools
      })
    },

    onNavigate(event) {
      const page = event.currentTarget.dataset.page
      if (!TARGETS[page] || page === this.data.current) return
      wx.reLaunch({ url: TARGETS[page] })
    },

    openDrawer() {
      this.refreshTools('', 'all')
      this.setData({ drawerOpen: true, query: '', activeCategoryId: 'all' })
    },

    closeDrawer() {
      this.setData({ drawerOpen: false })
    },

    onSearchInput(event) {
      const query = String(event.detail.value || '').trim()
      this.setData({ query })
      this.refreshTools(query, this.data.activeCategoryId)
    },

    clearSearch() {
      this.setData({ query: '' })
      this.refreshTools('', this.data.activeCategoryId)
    },

    selectCategory(event) {
      this.refreshTools(this.data.query, event.currentTarget.dataset.id)
    },

    toggleFavorite(event) {
      const id = event.currentTarget.dataset.id
      const favoriteIds = toolService.toggleFavorite(id)
      const added = favoriteIds.includes(id)
      analytics.trackFavorite(id, added)
      this.refreshTools(this.data.query, this.data.activeCategoryId)
      this.triggerEvent('favoriteschange', { favoriteIds })
      wx.showToast({ title: added ? '已加入常用' : '已取消收藏', icon: 'none' })
    },

    openTool(event) {
      const tool = toolService.getToolById(event.currentTarget.dataset.id)
      if (!tool) return
      this.setData({ drawerOpen: false }, () => {
        wx.navigateTo({ url: tool.path })
      })
    },

    stopPropagation() {},

    preventMove() {}
  }
})
