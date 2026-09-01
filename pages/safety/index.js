const storage = require('../../utils/storage')
const toolService = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const safety = require('../../utils/safety')

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function readLists() {
  return safety.normalizeLists(storage.get(storage.KEYS.safetyLists, null))
}

function readHistory() {
  return safety.normalizeHistory(storage.get(storage.KEYS.safetyHistory, []))
}

function readDraft() {
  return safety.normalizeSession(storage.get(storage.KEYS.safetyDraft, null))
}

Page({
  data: {
    lists: [],
    history: [],
    recentHistory: [],
    weeklyCount: 0,
    draft: null,
    draftProgress: null,
    selectedList: null,
    showCreate: false,
    newListName: '',
    newListFirstItem: '',
    newItemLabel: '',
    newItemCritical: false
  },

  onLoad() {
    analytics.trackToolOpen('safety')
  },

  onShow() {
    toolService.recordRecent('safety')
    this.refreshData()
  },

  refreshData() {
    const lists = readLists()
    const history = readHistory()
    const draft = readDraft()
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000
    const decoratedLists = lists.map((list) => ({
      ...list,
      itemCount: list.items.length,
      criticalCount: list.items.filter((item) => item.critical).length
    }))
    const selectedList = this.data.selectedList
      ? decoratedLists.find((item) => item.id === this.data.selectedList.id) || null
      : null

    this.setData({
      lists: decoratedLists,
      history,
      recentHistory: history.slice(0, 6).map((item) => ({ ...item, displayTime: formatTime(item.completedAt) })),
      weeklyCount: history.filter((item) => item.completedAt >= since).length,
      draft,
      draftProgress: draft ? safety.sessionProgress(draft) : null,
      selectedList
    })
  },

  startList(event) {
    const list = this.data.lists.find((item) => item.id === event.currentTarget.dataset.id)
    if (!list) return
    const existingDraft = this.data.draft
    const begin = () => {
      const session = safety.createSession(list)
      if (!session || !storage.set(storage.KEYS.safetyDraft, session)) {
        wx.showToast({ title: '无法保存本次进度', icon: 'none' })
        return
      }
      analytics.trackToolAction('safety', 'start_check', 'success')
      wx.navigateTo({ url: '/pages/safety-run/index' })
    }

    if (!existingDraft) {
      begin()
      return
    }
    wx.showModal({
      title: '替换未完成的自查？',
      content: `“${existingDraft.listName}”还有未完成项目。开始新自查会替换当前进度。`,
      confirmText: '开始新的',
      confirmColor: '#C86F00',
      success: (result) => {
        if (result.confirm) begin()
      }
    })
  },

  resumeDraft() {
    if (!this.data.draft) return
    wx.navigateTo({ url: '/pages/safety-run/index' })
  },

  toggleCreate() {
    this.setData({ showCreate: !this.data.showCreate })
  },

  onNewListName(event) {
    this.setData({ newListName: event.detail.value })
  },

  onNewListFirstItem(event) {
    this.setData({ newListFirstItem: event.detail.value })
  },

  createList() {
    const list = safety.createCustomList(this.data.newListName, this.data.newListFirstItem)
    if (!list) {
      wx.showToast({ title: '请填写清单名称和第一个项目', icon: 'none' })
      return
    }
    const next = safety.addList(this.data.lists, list)
    if (next.length === this.data.lists.length) {
      wx.showToast({ title: `最多创建 ${safety.MAX_LISTS} 个清单`, icon: 'none' })
      return
    }
    storage.set(storage.KEYS.safetyLists, next)
    this.setData({ showCreate: false, newListName: '', newListFirstItem: '' })
    this.refreshData()
    this.openManageById(list.id)
    analytics.trackToolAction('safety', 'create_list', 'success')
  },

  openManage(event) {
    this.openManageById(event.currentTarget.dataset.id)
  },

  openManageById(listId) {
    const selectedList = this.data.lists.find((item) => item.id === listId) || null
    this.setData({ selectedList, newItemLabel: '', newItemCritical: false })
    if (selectedList) wx.pageScrollTo({ selector: '#safety-manage', duration: 220 })
  },

  closeManage() {
    this.setData({ selectedList: null, newItemLabel: '', newItemCritical: false })
  },

  onNewItemLabel(event) {
    this.setData({ newItemLabel: event.detail.value })
  },

  onNewItemCritical(event) {
    this.setData({ newItemCritical: event.detail.value })
  },

  addItem() {
    if (!this.data.selectedList) return
    const label = this.data.newItemLabel.trim()
    if (!label) {
      wx.showToast({ title: '请输入检查内容', icon: 'none' })
      return
    }
    const next = safety.addItem(
      this.data.lists,
      this.data.selectedList.id,
      label,
      this.data.newItemCritical
    )
    const before = this.data.selectedList.items.length
    const updated = next.find((item) => item.id === this.data.selectedList.id)
    if (!updated || updated.items.length === before) {
      wx.showToast({ title: `每个清单最多 ${safety.MAX_ITEMS_PER_LIST} 项`, icon: 'none' })
      return
    }
    storage.set(storage.KEYS.safetyLists, next)
    this.setData({ newItemLabel: '', newItemCritical: false })
    this.refreshData()
    analytics.trackToolAction('safety', 'add_item', 'success')
  },

  removeItem(event) {
    if (!this.data.selectedList) return
    const itemId = event.currentTarget.dataset.id
    if (this.data.selectedList.items.length <= 1) {
      wx.showToast({ title: '清单至少保留 1 项', icon: 'none' })
      return
    }
    wx.showModal({
      title: '删除这个检查项目？',
      content: '只会修改当前清单，不影响已经完成的登记记录。',
      confirmText: '删除',
      confirmColor: '#C86F00',
      success: (result) => {
        if (!result.confirm) return
        const next = safety.removeItem(this.data.lists, this.data.selectedList.id, itemId)
        storage.set(storage.KEYS.safetyLists, next)
        this.refreshData()
      }
    })
  },

  deleteSelectedList() {
    if (!this.data.selectedList || !this.data.selectedList.isCustom) return
    wx.showModal({
      title: '删除自定义清单？',
      content: '清单和项目会被删除，已经完成的登记记录仍保留。',
      confirmText: '删除',
      confirmColor: '#C86F00',
      success: (result) => {
        if (!result.confirm) return
        const next = safety.deleteCustomList(this.data.lists, this.data.selectedList.id)
        storage.set(storage.KEYS.safetyLists, next)
        this.setData({ selectedList: null })
        this.refreshData()
      }
    })
  },

  clearHistory() {
    if (!this.data.history.length) return
    wx.showModal({
      title: '清空自查记录？',
      content: '只会删除本机最近 30 次完成记录，不会删除清单模板。',
      confirmText: '确认清空',
      confirmColor: '#C86F00',
      success: (result) => {
        if (!result.confirm) return
        storage.remove(storage.KEYS.safetyHistory)
        this.refreshData()
      }
    })
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜安心自查',
      path: '/pages/safety/index'
    }
  }
})
