const storage = require('../../utils/storage')
const toolService = require('../../utils/tools')
const appConfig = require('../../utils/app-config')

function removeAll(keys) {
  return keys.map((key) => storage.remove(key)).every(Boolean)
}

Page({
  data: {
    settings: toolService.getSettings(),
    version: appConfig.version
  },

  onShow() {
    this.setData({ settings: toolService.getSettings() })
  },

  onVibrationChange(event) {
    const settings = toolService.updateSettings({ vibration: event.detail.value })
    this.setData({ settings })
  },

  openPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/index' })
  },

  openAbout() {
    wx.navigateTo({ url: '/pages/about/index' })
  },

  clearRecent() {
    this.confirmAction('清空最近使用？', '只会清除最近打开过的工具记录。', () => {
      return toolService.clearRecent()
    })
  },

  clearRandomHistory() {
    this.confirmAction('清空随机记录？', '会删除随机选择页保存的历史结果。', () => {
      return storage.remove(storage.KEYS.randomHistory)
    })
  },

  clearSafetyRecords() {
    this.confirmAction('清空安心自查记录？', '会删除未完成进度和最近 30 次完成记录，自定义清单会保留。', () => {
      return removeAll([storage.KEYS.safetyDraft, storage.KEYS.safetyHistory])
    })
  },

  clearDailyToolRecords() {
    this.confirmAction('清空新增生活工具记录？', '会删除物品位置、更换周期、临时卡、食物、轮值、今日任务和分摊历史。', () => {
      const keys = [
        storage.KEYS.whereRecords,
        storage.KEYS.lifecycleRecords,
        storage.KEYS.quickNotes,
        storage.KEYS.foodRecords,
        storage.KEYS.rotationHistory,
        storage.KEYS.focusOneDraft,
        storage.KEYS.splitHistory
      ]
      return removeAll(keys)
    })
  },

  clearPrivateRecords() {
    this.confirmAction('清空周期与游戏提醒记录？', '会删除姨妈周期日期和手工添加的 Steam 限免清单，其他工具数据不会受影响。', () => {
      return removeAll([storage.KEYS.periodRecords, storage.KEYS.steamWatchRecords])
    })
  },

  clearAll() {
    this.confirmAction('清空全部本地数据？', '收藏、最近使用、各工具记录、安心自查清单与登记和设置都会被删除，无法恢复。', () => {
      const succeeded = storage.clearAppData()
      this.setData({ settings: toolService.getSettings() })
      return succeeded
    })
  },

  confirmAction(title, content, action) {
    wx.showModal({
      title,
      content,
      confirmText: '确认清空',
      confirmColor: '#C86F00',
      success: (result) => {
        if (!result.confirm) return
        let succeeded = false
        try {
          succeeded = action() !== false
        } catch (error) {
          succeeded = false
        }
        wx.showToast(succeeded
          ? { title: '已清空', icon: 'success' }
          : { title: '清理未完成，请重试', icon: 'none' })
      }
    })
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜把小事，三秒搞定',
      path: '/pages/home/index'
    }
  }
})

module.exports = {
  removeAll
}
