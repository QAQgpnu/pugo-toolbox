const appConfig = require('../../utils/app-config')

const OFFICIAL_ACCOUNT_SCENES = [1011, 1038, 1047, 1089, 1124]

function copyPromotionText(value, successTitle) {
  if (!value) return
  wx.setClipboardData({
    data: value,
    success() {
      wx.showToast({ title: successTitle, icon: 'success' })
    },
    fail() {
      wx.showToast({ title: '复制失败，请稍后重试', icon: 'none' })
    }
  })
}

Page({
  data: {
    version: appConfig.version,
    filingNumber: appConfig.filingNumber,
    githubUsername: appConfig.githubUsername,
    githubUrl: appConfig.githubUrl,
    officialAccountName: appConfig.officialAccountName,
    showOfficialAccountComponent: false,
    officialAccountHint: '复制名称后，可在微信内搜索关注'
  },

  onLoad() {
    const launchOptions = typeof wx.getLaunchOptionsSync === 'function'
      ? wx.getLaunchOptionsSync()
      : {}
    const scene = Number(launchOptions && launchOptions.scene)
    const showOfficialAccountComponent = OFFICIAL_ACCOUNT_SCENES.includes(scene)
    this.setData({
      showOfficialAccountComponent,
      officialAccountHint: showOfficialAccountComponent
        ? '当前入口支持微信官方关注组件；若未显示，可复制名称搜索'
        : '当前进入场景不支持一键关注，可复制名称后在微信内搜索'
    })
  },

  openPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/index' })
  },

  copyGithubUrl() {
    copyPromotionText(this.data.githubUrl, 'GitHub 链接已复制')
  },

  copyOfficialAccountName() {
    copyPromotionText(this.data.officialAccountName, '公众号名称已复制')
  },

  onOfficialAccountLoad() {
    this.setData({ officialAccountHint: '可通过上方微信官方组件直接关注，也可复制名称搜索' })
  },

  onOfficialAccountError(event) {
    const status = Number(event && event.detail && event.detail.status)
    const hints = {
      1: '公众号关注能力暂不可用，可复制名称搜索',
      2: '关联公众号暂不可用，可复制名称搜索',
      3: '小程序后台尚未关联公众号，可复制名称搜索',
      4: '小程序后台尚未开启公众号关注组件，可复制名称搜索',
      5: '当前进入场景不支持一键关注，可复制名称搜索'
    }
    this.setData({
      officialAccountHint: hints[status] || '一键关注暂不可用，可复制名称后在微信内搜索'
    })
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜把小事，三秒搞定',
      path: '/pages/home/index'
    }
  }
})
