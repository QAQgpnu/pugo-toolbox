const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const imageTools = require('../../utils/image-tools')

function fileSize(path) {
  return new Promise((resolve) => {
    const manager = wx.getFileSystemManager()
    manager.stat({
      path,
      success: (result) => resolve(result.stats && result.stats.size ? result.stats.size : 0),
      fail: () => resolve(0)
    })
  })
}

function imageInfo(path) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({ src: path, success: resolve, fail: reject })
  })
}

Page({
  data: {
    qualityPresets: imageTools.QUALITY_PRESETS,
    edgePresets: imageTools.LONG_EDGE_PRESETS,
    qualityId: 'balanced',
    longEdge: 1920,
    sourcePath: '',
    sourceBytes: 0,
    sourceSizeText: '',
    sourceDimensions: '',
    outputPath: '',
    outputSizeText: '',
    outputDimensions: '',
    savedPercent: 0,
    canvasWidth: 1,
    canvasHeight: 1,
    processing: false
  },

  onLoad() {
    this.requestGeneration = 0
    this.unloaded = false
    this.loadingVisible = false
    this.loadingRequestId = 0
    analytics.trackToolOpen('image-compress')
  },

  onShow() { tools.recordRecent('image-compress') },

  onUnload() {
    this.unloaded = true
    this.requestGeneration = (this.requestGeneration || 0) + 1
    this.sourceInfo = null
    this.hideProcessingLoading(null, true)
  },

  nextRequestId() {
    this.requestGeneration = (this.requestGeneration || 0) + 1
    return this.requestGeneration
  },

  isRequestCurrent(requestId) {
    return !this.unloaded && requestId === this.requestGeneration
  },

  showProcessingLoading(title, requestId) {
    if (this.loadingVisible) {
      this.loadingRequestId = requestId
      return
    }
    this.loadingVisible = true
    this.loadingRequestId = requestId
    wx.showLoading({ title, mask: true })
  },

  hideProcessingLoading(requestId, force = false) {
    if (!this.loadingVisible) return
    if (!force && requestId !== this.loadingRequestId) return
    this.loadingVisible = false
    this.loadingRequestId = 0
    wx.hideLoading()
  },

  chooseImage() {
    if (this.data.processing) return
    const requestId = this.nextRequestId()
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      sizeType: ['original'],
      success: async (result) => {
        const item = result.tempFiles && result.tempFiles[0]
        if (!item || !item.tempFilePath || !this.isRequestCurrent(requestId)) return
        const sourcePath = item.tempFilePath
        try {
          const info = await imageInfo(sourcePath)
          if (!this.isRequestCurrent(requestId)) return
          const sourceBytes = item.size || await fileSize(sourcePath)
          if (!this.isRequestCurrent(requestId)) return
          this.sourceInfo = { width: info.width, height: info.height }
          this.setData({
            sourcePath,
            sourceSizeText: imageTools.formatBytes(sourceBytes),
            sourceDimensions: `${info.width} × ${info.height}`,
            sourceBytes,
            outputPath: '',
            outputSizeText: '',
            outputDimensions: '',
            savedPercent: 0
          })
          analytics.trackToolAction('image-compress', 'choose', 'success')
        } catch (error) {
          if (!this.isRequestCurrent(requestId)) return
          wx.showToast({ title: '这张图片暂时无法读取', icon: 'none' })
          analytics.trackToolAction('image-compress', 'choose', 'failed')
        }
      }
    })
  },

  selectQuality(event) {
    if (this.data.processing) return
    this.setData({ qualityId: event.currentTarget.dataset.id, outputPath: '' })
  },

  selectEdge(event) {
    if (this.data.processing) return
    this.setData({ longEdge: Number(event.currentTarget.dataset.value), outputPath: '' })
  },

  compress() {
    if (!this.data.sourcePath || !this.sourceInfo || this.data.processing) return
    const sourcePath = this.data.sourcePath
    const sourceBytes = Number(this.data.sourceBytes) || 0
    const sourceWidth = Number(this.sourceInfo.width)
    const sourceHeight = Number(this.sourceInfo.height)
    const longEdge = Number(this.data.longEdge)
    const qualityId = this.data.qualityId
    const target = imageTools.fitWithin(sourceWidth, sourceHeight, longEdge)
    const preset = imageTools.QUALITY_PRESETS.find((item) => item.id === qualityId)
    if (!target || !preset) return

    const requestId = this.nextRequestId()
    const request = {
      requestId,
      sourcePath,
      sourceBytes,
      targetWidth: target.width,
      targetHeight: target.height,
      quality: preset.quality
    }

    this.showProcessingLoading('正在压缩', requestId)
    this.setData({
      processing: true,
      canvasWidth: request.targetWidth,
      canvasHeight: request.targetHeight,
      outputPath: '',
      outputSizeText: '',
      outputDimensions: '',
      savedPercent: 0
    }, () => {
      wx.nextTick(() => this.drawCompression(request))
    })
  },

  drawCompression(request) {
    if (!this.isRequestCurrent(request.requestId)) return
    try {
      const context = wx.createCanvasContext('compressCanvas', this)
      context.clearRect(0, 0, request.targetWidth, request.targetHeight)
      context.setFillStyle('#FFFFFF')
      context.fillRect(0, 0, request.targetWidth, request.targetHeight)
      context.drawImage(request.sourcePath, 0, 0, request.targetWidth, request.targetHeight)
      context.draw(false, () => {
        if (!this.isRequestCurrent(request.requestId)) return
        try {
          wx.canvasToTempFilePath({
            canvasId: 'compressCanvas',
            width: request.targetWidth,
            height: request.targetHeight,
            destWidth: request.targetWidth,
            destHeight: request.targetHeight,
            fileType: 'jpg',
            quality: request.quality,
            success: async (result) => {
              const bytes = await fileSize(result.tempFilePath)
              if (!this.isRequestCurrent(request.requestId)) return
              const savedPercent = request.sourceBytes && bytes < request.sourceBytes
                ? Math.round((1 - bytes / request.sourceBytes) * 100)
                : 0
              this.setData({
                outputPath: result.tempFilePath,
                outputSizeText: imageTools.formatBytes(bytes),
                outputDimensions: `${request.targetWidth} × ${request.targetHeight}`,
                savedPercent,
                processing: false
              }, () => this.hideProcessingLoading(request.requestId))
              analytics.trackToolAction('image-compress', 'compress', 'success')
            },
            fail: () => this.failProcessing(request.requestId, '压缩失败，请换一张图片重试')
          }, this)
        } catch (error) {
          this.failProcessing(request.requestId, '压缩失败，请换一张图片重试')
        }
      })
    } catch (error) {
      this.failProcessing(request.requestId, '压缩失败，请换一张图片重试')
    }
  },

  failProcessing(requestId, message) {
    if (!this.isRequestCurrent(requestId)) return
    this.setData({ processing: false }, () => {
      this.hideProcessingLoading(requestId)
      wx.showToast({ title: message, icon: 'none' })
      analytics.trackToolAction('image-compress', 'compress', 'failed')
    })
  },

  previewOutput() {
    if (!this.data.processing && this.data.outputPath) wx.previewImage({ urls: [this.data.outputPath] })
  },

  saveOutput() {
    if (this.data.processing || !this.data.outputPath) return
    const outputPath = this.data.outputPath
    wx.saveImageToPhotosAlbum({
      filePath: outputPath,
      success: () => {
        wx.showToast({ title: '已保存到相册' })
        analytics.trackToolAction('image-compress', 'save', 'success')
      },
      fail: () => {
        wx.showModal({
          title: '没有保存成功',
          content: '请在系统设置中允许保存到相册，再回来重试。压缩结果仍可预览。',
          showCancel: false
        })
        analytics.trackToolAction('image-compress', 'save', 'failed')
      }
    })
  },

  onShareAppMessage() {
    return { title: '图片压缩｜本机处理，不上传图片', path: '/pages/image-compress/index' }
  }
})
