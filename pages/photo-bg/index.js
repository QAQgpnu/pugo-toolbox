const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const imageTools = require('../../utils/image-tools')
const localBackground = require('../../utils/local-background')

const BACKGROUNDS = Object.freeze([
  { id: 'white', name: '白色', hex: '#FFFFFF' },
  { id: 'blue', name: '蓝色', hex: '#438EDB' },
  { id: 'red', name: '红色', hex: '#DC4949' },
  { id: 'gray', name: '浅灰', hex: '#E8ECEB' }
])

const PROCESS_ERROR_MESSAGES = Object.freeze({
  BACKGROUND_NOT_FOUND: '没有识别到足够的纯色背景，请换一张背景更简单、四周留有空白的照片',
  FOREGROUND_NOT_FOUND: '人物与背景颜色过于接近，请换一张人物轮廓更清楚的照片',
  INVALID_IMAGE_PIXELS: '这张照片暂时无法读取，请换一张后重试'
})

function getImageInfo(path) {
  return new Promise((resolve, reject) => wx.getImageInfo({ src: path, success: resolve, fail: reject }))
}

Page({
  data: {
    backgrounds: BACKGROUNDS,
    sizes: imageTools.PHOTO_SIZE_PRESETS,
    backgroundId: 'blue',
    sizeId: 'one-inch',
    sourcePath: '',
    foregroundPath: '',
    outputPath: '',
    canvasWidth: 295,
    canvasHeight: 413,
    sourceCanvasWidth: 1,
    sourceCanvasHeight: 1,
    portraitScale: 100,
    portraitOffsetY: 0,
    processing: false
  },

  onLoad() {
    this.requestGeneration = 0
    this.unloaded = false
    this.loadingVisible = false
    analytics.trackToolOpen('photo-bg')
  },

  onShow() { tools.recordRecent('photo-bg') },

  onUnload() {
    this.unloaded = true
    this.requestGeneration += 1
    this.hideProcessingLoading(true)
    this.removeLocalTempFile(this.data.foregroundPath)
    this.removeLocalTempFile(this.data.outputPath)
  },

  showProcessingLoading(title) {
    if (!this.loadingVisible) wx.showLoading({ title, mask: true })
    this.loadingVisible = true
  },

  hideProcessingLoading(force = false) {
    if (!this.loadingVisible && !force) return
    this.loadingVisible = false
    wx.hideLoading()
  },

  nextRequestId() {
    this.requestGeneration = (this.requestGeneration || 0) + 1
    return this.requestGeneration
  },

  isCurrent(requestId) {
    return !this.unloaded && requestId === this.requestGeneration
  },

  removeLocalTempFile(path) {
    if (!path) return Promise.resolve(false)
    return new Promise((resolve) => {
      wx.getFileSystemManager().unlink({
        filePath: path,
        success: () => resolve(true),
        fail: () => resolve(false)
      })
    })
  },

  chooseImage() {
    if (this.data.processing) return
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (result) => {
        if (this.unloaded) return
        const path = result.tempFiles && result.tempFiles[0] && result.tempFiles[0].tempFilePath
        if (path) this.processImage(path)
      }
    })
  },

  onStageTap() {
    if (this.data.processing) return
    if (this.data.outputPath) this.previewOutput()
    else this.chooseImage()
  },

  async processImage(path) {
    if (this.unloaded || !path) return
    const requestId = this.nextRequestId()
    const previousForegroundPath = this.data.foregroundPath
    const previousOutputPath = this.data.outputPath
    this.setData({ sourcePath: path, foregroundPath: '', outputPath: '', processing: true })
    this.removeLocalTempFile(previousForegroundPath)
    this.removeLocalTempFile(previousOutputPath)
    this.showProcessingLoading('正在识别纯色背景')
    try {
      const foregroundPath = await this.createLocalForeground(path, requestId)
      if (!foregroundPath) return
      if (!this.isCurrent(requestId)) {
        await this.removeLocalTempFile(foregroundPath)
        return
      }
      this.setData({ foregroundPath }, () => this.compose(requestId))
      analytics.trackToolAction('photo-bg', 'local-background', 'success')
    } catch (error) {
      if (!this.isCurrent(requestId)) return
      this.hideProcessingLoading()
      this.setData({ processing: false })
      wx.showModal({
        title: '没有识别好背景',
        content: PROCESS_ERROR_MESSAGES[error.code || error.message] || '背景处理没有完成。请使用纯色或较简单的背景，并让人物与四周留出空间。',
        showCancel: false
      })
      analytics.trackToolAction('photo-bg', 'local-background', 'failed')
    }
  },

  async createLocalForeground(path, requestId) {
    const info = await getImageInfo(path)
    const fitted = imageTools.fitWithin(info.width, info.height, localBackground.MAX_PROCESSING_LONG_EDGE)
    if (!fitted) throw new Error('INVALID_IMAGE')
    await new Promise((resolve) => this.setData({
      sourceCanvasWidth: fitted.width,
      sourceCanvasHeight: fitted.height
    }, resolve))
    if (!this.isCurrent(requestId)) return ''
    await new Promise((resolve) => wx.nextTick(resolve))
    await new Promise((resolve, reject) => {
      const context = wx.createCanvasContext('sourceCanvas', this)
      context.clearRect(0, 0, fitted.width, fitted.height)
      context.drawImage(path, 0, 0, fitted.width, fitted.height)
      context.draw(false, resolve)
    })
    if (!this.isCurrent(requestId)) return ''
    const pixels = await new Promise((resolve, reject) => {
      wx.canvasGetImageData({
        canvasId: 'sourceCanvas',
        x: 0,
        y: 0,
        width: fitted.width,
        height: fitted.height,
        success: resolve,
        fail: reject
      }, this)
    })
    if (!this.isCurrent(requestId)) return ''
    const result = localBackground.removeConnectedBackground(pixels.data, fitted.width, fitted.height)
    await new Promise((resolve, reject) => {
      wx.canvasPutImageData({
        canvasId: 'sourceCanvas',
        x: 0,
        y: 0,
        width: fitted.width,
        height: fitted.height,
        data: result.data,
        success: resolve,
        fail: reject
      }, this)
    })
    if (!this.isCurrent(requestId)) return ''
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvasId: 'sourceCanvas',
        width: fitted.width,
        height: fitted.height,
        destWidth: fitted.width,
        destHeight: fitted.height,
        fileType: 'png',
        success: (exported) => resolve(exported.tempFilePath),
        fail: reject
      }, this)
    })
  },

  selectBackground(event) {
    if (this.data.processing) return
    this.setData({ backgroundId: event.currentTarget.dataset.id }, () => this.compose())
  },

  selectSize(event) {
    if (this.data.processing) return
    const preset = imageTools.getPhotoSizePreset(event.currentTarget.dataset.id)
    this.setData({ sizeId: preset.id, canvasWidth: preset.width, canvasHeight: preset.height }, () => this.compose())
  },

  onScaleChange(event) {
    this.setData({ portraitScale: Number(event.detail.value) }, () => this.compose())
  },

  onOffsetChange(event) {
    this.setData({ portraitOffsetY: Number(event.detail.value) }, () => this.compose())
  },

  async compose(existingRequestId) {
    if (!this.data.foregroundPath) return
    const requestId = existingRequestId || this.nextRequestId()
    if (!existingRequestId) {
      const previousOutputPath = this.data.outputPath
      this.setData({ outputPath: '', processing: true })
      this.removeLocalTempFile(previousOutputPath)
      this.showProcessingLoading('正在生成证件照')
    }
    try {
      const info = await getImageInfo(this.data.foregroundPath)
      if (!this.isCurrent(requestId)) return
      const background = BACKGROUNDS.find((item) => item.id === this.data.backgroundId) || BACKGROUNDS[0]
      const placement = imageTools.calculateCoverPlacement(
        info.width,
        info.height,
        this.data.canvasWidth,
        this.data.canvasHeight,
        this.data.portraitScale / 100,
        this.data.portraitOffsetY / 100
      )
      if (!placement) throw new Error('COMPOSE_FAILED')
      const context = wx.createCanvasContext('photoCanvas', this)
      context.setFillStyle(background.hex)
      context.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight)
      context.drawImage(this.data.foregroundPath, placement.x, placement.y, placement.width, placement.height)
      context.draw(false, () => this.exportOutput(requestId))
    } catch (error) {
      this.failCompose(requestId)
    }
  },

  exportOutput(requestId) {
    wx.canvasToTempFilePath({
      canvasId: 'photoCanvas',
      width: this.data.canvasWidth,
      height: this.data.canvasHeight,
      destWidth: this.data.canvasWidth,
      destHeight: this.data.canvasHeight,
      fileType: 'jpg',
      quality: 0.96,
      success: (result) => {
        if (!this.isCurrent(requestId)) {
          this.removeLocalTempFile(result.tempFilePath)
          return
        }
        const previousOutputPath = this.data.outputPath
        this.hideProcessingLoading()
        this.setData({ outputPath: result.tempFilePath, processing: false })
        if (previousOutputPath && previousOutputPath !== result.tempFilePath) {
          this.removeLocalTempFile(previousOutputPath)
        }
      },
      fail: () => this.failCompose(requestId)
    }, this)
  },

  failCompose(requestId) {
    if (!this.isCurrent(requestId)) return
    this.hideProcessingLoading()
    this.setData({ processing: false })
    wx.showToast({ title: '证件照生成失败，请重试', icon: 'none' })
  },

  compareOriginal() {
    if (!this.data.processing && this.data.sourcePath) wx.previewImage({ urls: [this.data.sourcePath] })
  },

  previewOutput() {
    if (!this.data.processing && this.data.outputPath) wx.previewImage({ urls: [this.data.outputPath] })
  },

  saveOutput() {
    if (this.data.processing || !this.data.outputPath) return
    wx.saveImageToPhotosAlbum({
      filePath: this.data.outputPath,
      success: () => {
        wx.showToast({ title: '已保存到相册' })
        analytics.trackToolAction('photo-bg', 'save', 'success')
      },
      fail: () => wx.showModal({ title: '没有保存成功', content: '请允许保存到相册后再试。', showCancel: false })
    })
  },

  onShareAppMessage() {
    return { title: '证件照制作｜本机换底并选择常见尺寸', path: '/pages/photo-bg/index' }
  }
})
