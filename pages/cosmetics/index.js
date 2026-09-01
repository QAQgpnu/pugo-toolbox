const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const cosmetics = require('../../utils/cosmetics')
const imageTools = require('../../utils/image-tools')
const ocrText = require('../../utils/ocr-text')

function isDevtoolsRuntime() {
  try {
    const info = typeof wx.getDeviceInfo === 'function'
      ? wx.getDeviceInfo()
      : wx.getSystemInfoSync()
    return info && info.platform === 'devtools'
  } catch (error) {
    return false
  }
}

Page({
  data: {
    leftText: '',
    rightText: '',
    result: null,
    activeTab: 'common',
    currentItems: [],
    expandedKey: '',
    // 微信开发者工具会暴露相关 API，但不支持 VisionKit v1。提前降级可避免
    // 模拟器制造原生错误日志；真机仍按实际 API 能力初始化。
    ocrSupported: !isDevtoolsRuntime() && typeof wx.createVKSession === 'function' && typeof wx.createOffscreenCanvas === 'function',
    ocrReady: false,
    ocrProcessing: false,
    ocrSide: ''
  },

  onLoad() {
    this.unloaded = false
    this.requestGeneration = 0
    this.activeOcrRequestId = 0
    this.ocrTimer = null
    this.ocrLoadingVisible = false
    this.ocrLoadingRequestId = 0
    this.ocrSession = null
    this.ocrCanvas = null
    analytics.trackToolOpen('cosmetics')
  },

  onReady() {
    if (this.unloaded || !this.data.ocrSupported) return
    wx.createSelectorQuery().in(this).select('#ocrCanvas').node().exec((result) => {
      if (this.unloaded) return
      const canvas = result && result[0] && result[0].node
      if (!canvas || typeof canvas.getContext !== 'function') {
        this.setData({ ocrSupported: false, ocrReady: false })
        return
      }
      try {
        canvas.width = 2
        canvas.height = 2
        const gl = canvas.getContext('webgl')
        const session = wx.createVKSession({ track: { OCR: { mode: 2 } }, version: 'v1', gl })
        if (this.unloaded) {
          if (session && typeof session.stop === 'function') {
            try { session.stop() } catch (error) {}
          }
          return
        }
        this.ocrCanvas = canvas
        this.ocrSession = session
        session.on('updateAnchors', (anchors) => {
          if (this.unloaded || this.ocrSession !== session) return
          this.handleOcrResult(anchors)
        })
        session.start((error) => {
          if (this.unloaded || this.ocrSession !== session) {
            if (typeof session.stop === 'function') {
              try { session.stop() } catch (stopError) {}
            }
            return
          }
          if (error) {
            if (typeof session.stop === 'function') {
              try { session.stop() } catch (stopError) {}
            }
            this.ocrSession = null
            this.ocrCanvas = null
            this.setData({ ocrSupported: false, ocrReady: false })
            return
          }
          this.setData({ ocrReady: true })
          const loop = () => {
            if (this.unloaded || this.ocrSession !== session || this.ocrCanvas !== canvas) return
            session.getVKFrame(canvas.width, canvas.height)
            session.requestAnimationFrame(loop)
          }
          session.requestAnimationFrame(loop)
        })
      } catch (error) {
        if (this.unloaded) return
        if (this.ocrSession && typeof this.ocrSession.stop === 'function') {
          try { this.ocrSession.stop() } catch (stopError) {}
        }
        this.ocrSession = null
        this.ocrCanvas = null
        this.setData({ ocrSupported: false, ocrReady: false })
      }
    })
  },

  onShow() { tools.recordRecent('cosmetics') },

  onUnload() {
    this.unloaded = true
    this.requestGeneration = (this.requestGeneration || 0) + 1
    this.activeOcrRequestId = 0
    if (this.ocrTimer) clearTimeout(this.ocrTimer)
    this.ocrTimer = null
    this.hideOcrLoading(null, true)
    if (this.ocrSession && typeof this.ocrSession.stop === 'function') {
      try { this.ocrSession.stop() } catch (error) {}
    }
    this.ocrSession = null
    this.ocrCanvas = null
  },

  nextRequestId() {
    this.requestGeneration = (this.requestGeneration || 0) + 1
    return this.requestGeneration
  },

  isCurrent(requestId) {
    return !this.unloaded && requestId === this.requestGeneration
  },

  isOcrRequestActive(requestId) {
    return this.isCurrent(requestId) && requestId === this.activeOcrRequestId
  },

  showOcrLoading(title, requestId) {
    if (!this.isOcrRequestActive(requestId)) return
    this.ocrLoadingVisible = true
    this.ocrLoadingRequestId = requestId
    wx.showLoading({ title, mask: true })
  },

  hideOcrLoading(requestId, force = false) {
    if (!this.ocrLoadingVisible) return
    if (!force && requestId !== this.ocrLoadingRequestId) return
    this.ocrLoadingVisible = false
    this.ocrLoadingRequestId = 0
    wx.hideLoading()
  },

  onLeftInput(event) {
    if (this.unloaded || this.data.ocrProcessing) return
    this.setData({ leftText: event.detail.value, result: null })
  },

  onRightInput(event) {
    if (this.unloaded || this.data.ocrProcessing) return
    this.setData({ rightText: event.detail.value, result: null })
  },

  chooseIngredientImage(event) {
    if (this.unloaded || this.data.ocrProcessing) return
    if (!this.data.ocrReady) {
      wx.showToast({ title: this.data.ocrSupported ? '文字识别正在准备，请稍后' : '当前设备不支持本机 OCR', icon: 'none' })
      return
    }
    const side = event.currentTarget.dataset.side === 'right' ? 'right' : 'left'
    const requestId = this.nextRequestId()
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (result) => {
        if (!this.isCurrent(requestId)) return
        const path = result.tempFiles && result.tempFiles[0] && result.tempFiles[0].tempFilePath
        if (path) this.runLocalOcr(path, side, requestId)
      }
    })
  },

  async runLocalOcr(path, side, existingRequestId) {
    const requestId = existingRequestId || this.nextRequestId()
    if (!this.isCurrent(requestId) || this.data.ocrProcessing) return
    this.activeOcrRequestId = requestId
    this.setData({ ocrProcessing: true, ocrSide: side })
    this.showOcrLoading('正在识别成分表', requestId)
    try {
      const info = await new Promise((resolve, reject) => wx.getImageInfo({ src: path, success: resolve, fail: reject }))
      if (!this.isOcrRequestActive(requestId)) return
      const fitted = imageTools.fitWithin(info.width, info.height, 1600)
      if (!fitted) throw new Error('INVALID_IMAGE')
      const canvas = wx.createOffscreenCanvas({ type: '2d', width: fitted.width, height: fitted.height })
      const context = canvas.getContext('2d')
      const image = canvas.createImage()
      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
        image.src = path
      })
      if (!this.isOcrRequestActive(requestId)) return
      context.drawImage(image, 0, 0, fitted.width, fitted.height)
      const data = context.getImageData(0, 0, fitted.width, fitted.height)
      if (!this.isOcrRequestActive(requestId) || !this.ocrSession) return
      this.ocrSession.runOCR({ frameBuffer: data.data.buffer, width: fitted.width, height: fitted.height })
      if (!this.isOcrRequestActive(requestId)) return
      this.ocrTimer = setTimeout(() => this.failOcr('识别超时，请裁剪成分区域后重试', requestId), 15000)
    } catch (error) {
      this.failOcr('图片读取失败，请换一张重试', requestId)
    }
  },

  handleOcrResult(anchors) {
    const requestId = this.activeOcrRequestId
    if (!this.isOcrRequestActive(requestId) || !this.data.ocrProcessing) return
    const text = ocrText.pickOcrText(anchors)
    if (!text) return
    if (this.ocrTimer) clearTimeout(this.ocrTimer)
    this.ocrTimer = null
    const side = this.data.ocrSide
    this.activeOcrRequestId = 0
    this.hideOcrLoading(requestId)
    if (this.unloaded) return
    const patch = { ocrProcessing: false, ocrSide: '', result: null, currentItems: [], expandedKey: '' }
    patch[side === 'right' ? 'rightText' : 'leftText'] = text
    this.setData(patch, () => {
      if (!this.unloaded) wx.showToast({ title: '已识别，请先校对' })
    })
  },

  failOcr(message, requestId = this.activeOcrRequestId) {
    if (!this.isOcrRequestActive(requestId) || !this.data.ocrProcessing) return
    if (this.ocrTimer) clearTimeout(this.ocrTimer)
    this.ocrTimer = null
    this.activeOcrRequestId = 0
    this.hideOcrLoading(requestId)
    if (this.unloaded) return
    this.setData({ ocrProcessing: false, ocrSide: '' }, () => {
      if (!this.unloaded) wx.showToast({ title: message, icon: 'none' })
    })
  },

  fillExample() {
    if (this.unloaded || this.data.ocrProcessing) return
    this.setData({
      leftText: '水、甘油、烟酰胺、透明质酸钠、泛醇、苯氧乙醇',
      rightText: 'Aqua, Glycerin, Squalane, Niacinamide, Ceramide NP, Phenoxyethanol',
      result: null
    })
  },

  compare() {
    if (this.unloaded || this.data.ocrProcessing) return
    if (!this.data.leftText.trim() || !this.data.rightText.trim()) {
      wx.showToast({ title: '请录入两份成分表', icon: 'none' })
      return
    }
    const result = cosmetics.compareIngredientLists(this.data.leftText, this.data.rightText)
    if (!result.left.length || !result.right.length) {
      wx.showToast({ title: '没有识别到有效成分', icon: 'none' })
      return
    }
    this.setData({ result, activeTab: 'common', currentItems: result.common, expandedKey: '' })
    analytics.trackToolAction('cosmetics', 'compare', 'success')
  },

  selectTab(event) {
    const tab = event.currentTarget.dataset.tab
    const map = { common: 'common', left: 'onlyLeft', right: 'onlyRight' }
    const key = map[tab] || 'common'
    this.setData({ activeTab: tab, currentItems: this.data.result[key], expandedKey: '' })
  },

  toggleIngredient(event) {
    const key = event.currentTarget.dataset.key
    this.setData({ expandedKey: this.data.expandedKey === key ? '' : key })
  },

  clearAll() {
    if (this.unloaded || this.data.ocrProcessing) return
    this.setData({ leftText: '', rightText: '', result: null, currentItems: [], expandedKey: '' })
  },

  onShareAppMessage() {
    return { title: '化妆品成分对比｜拍照识别后快速对比', path: '/pages/cosmetics/index' }
  }
})
