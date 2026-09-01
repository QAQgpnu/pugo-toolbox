const tools = require('../../utils/tools')
const analytics = require('../../utils/analytics')
const watermark = require('../../utils/photo-watermark')

const MAX_LONG_EDGE = 2048

function getImageInfo(path) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({ src: path, success: resolve, fail: reject })
  })
}

function removeTempFile(path) {
  if (!path || typeof wx.getFileSystemManager !== 'function') return
  try {
    wx.getFileSystemManager().unlink({ filePath: path, fail: () => {} })
  } catch (error) {}
}

Page({
  data: {
    positions: watermark.POSITION_OPTIONS,
    positionId: 'bottom-right',
    watermarkDate: '',
    watermarkTime: '',
    watermarkText: '',
    sourcePath: '',
    outputPath: '',
    sourceDimensions: '',
    outputDimensions: '',
    canvasWidth: 1,
    canvasHeight: 1,
    processing: false
  },

  onLoad() {
    const now = new Date()
    this.requestGeneration = 0
    this.unloaded = false
    this.timeEdited = false
    this.loadingVisible = false
    this.sourceInfo = null
    this.setWatermarkTime(now)
    analytics.trackToolOpen('photo-watermark')
  },

  onShow() { tools.recordRecent('photo-watermark') },

  onUnload() {
    this.unloaded = true
    this.requestGeneration = (this.requestGeneration || 0) + 1
    this.hideLoading(true)
    removeTempFile(this.data.outputPath)
    this.sourceInfo = null
  },

  nextRequestId() {
    this.requestGeneration = (this.requestGeneration || 0) + 1
    return this.requestGeneration
  },

  isCurrent(requestId) {
    return !this.unloaded && requestId === this.requestGeneration
  },

  showLoading(title) {
    if (!this.loadingVisible) wx.showLoading({ title, mask: true })
    this.loadingVisible = true
  },

  hideLoading(force = false) {
    if (!this.loadingVisible && !force) return
    this.loadingVisible = false
    wx.hideLoading()
  },

  setWatermarkTime(date) {
    const watermarkDate = watermark.currentDateText(date)
    const watermarkTime = watermark.currentTimeText(date)
    this.setData({
      watermarkDate,
      watermarkTime,
      watermarkText: watermark.formatWatermarkText(watermarkDate, watermarkTime)
    })
  },

  invalidateOutput() {
    const outputPath = this.data.outputPath
    if (outputPath) removeTempFile(outputPath)
    if (outputPath || this.data.outputDimensions) this.setData({ outputPath: '', outputDimensions: '' })
  },

  chooseImage() {
    if (this.data.processing) return
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      sizeType: ['original'],
      success: async (result) => {
        if (this.unloaded) return
        const item = result.tempFiles && result.tempFiles[0]
        if (!item || !item.tempFilePath) return
        const requestId = this.nextRequestId()
        this.showLoading('正在读取照片')
        this.setData({ processing: true })
        try {
          const info = await getImageInfo(item.tempFilePath)
          if (!this.isCurrent(requestId)) return
          const target = watermark.fitCanvasSize(info.width, info.height, MAX_LONG_EDGE)
          if (!target) throw new Error('INVALID_IMAGE')
          this.invalidateOutput()
          this.sourceInfo = {
            path: item.tempFilePath,
            width: info.width,
            height: info.height,
            targetWidth: target.width,
            targetHeight: target.height
          }
          const patch = {
            sourcePath: item.tempFilePath,
            sourceDimensions: `${info.width} × ${info.height}`,
            processing: false
          }
          if (!this.timeEdited) {
            const now = new Date()
            patch.watermarkDate = watermark.currentDateText(now)
            patch.watermarkTime = watermark.currentTimeText(now)
            patch.watermarkText = watermark.formatWatermarkText(patch.watermarkDate, patch.watermarkTime)
          }
          this.setData(patch, () => this.hideLoading())
          analytics.trackToolAction('photo-watermark', 'choose', 'success')
        } catch (error) {
          if (!this.isCurrent(requestId)) return
          this.setData({ processing: false }, () => this.hideLoading())
          wx.showToast({ title: '这张照片暂时无法读取', icon: 'none' })
          analytics.trackToolAction('photo-watermark', 'choose', 'failed')
        }
      }
    })
  },

  onStageTap() {
    if (this.data.processing) return
    if (this.data.outputPath) this.previewOutput()
    else this.chooseImage()
  },

  onDateChange(event) {
    this.timeEdited = true
    const watermarkDate = event.detail.value
    const watermarkText = watermark.formatWatermarkText(watermarkDate, this.data.watermarkTime)
    this.invalidateOutput()
    this.setData({ watermarkDate, watermarkText })
  },

  onTimeChange(event) {
    this.timeEdited = true
    const watermarkTime = event.detail.value
    const watermarkText = watermark.formatWatermarkText(this.data.watermarkDate, watermarkTime)
    this.invalidateOutput()
    this.setData({ watermarkTime, watermarkText })
  },

  useCurrentTime() {
    if (this.data.processing) return
    this.timeEdited = false
    this.invalidateOutput()
    this.setWatermarkTime(new Date())
  },

  selectPosition(event) {
    if (this.data.processing) return
    const positionId = event.currentTarget.dataset.id === 'bottom-left' ? 'bottom-left' : 'bottom-right'
    if (positionId === this.data.positionId) return
    this.invalidateOutput()
    this.setData({ positionId })
  },

  generateWatermark() {
    if (!this.sourceInfo || !this.data.sourcePath || this.data.processing) return
    const watermarkText = watermark.formatWatermarkText(this.data.watermarkDate, this.data.watermarkTime)
    if (!watermarkText) {
      wx.showToast({ title: '请选择有效的日期和时间', icon: 'none' })
      return
    }

    const requestId = this.nextRequestId()
    const request = {
      requestId,
      sourcePath: this.sourceInfo.path,
      width: this.sourceInfo.targetWidth,
      height: this.sourceInfo.targetHeight,
      positionId: this.data.positionId,
      watermarkText
    }
    this.invalidateOutput()
    this.showLoading('正在添加水印')
    this.setData({
      processing: true,
      canvasWidth: request.width,
      canvasHeight: request.height,
      watermarkText
    }, () => wx.nextTick(() => this.drawWatermark(request)))
  },

  drawWatermark(request) {
    if (!this.isCurrent(request.requestId)) return
    try {
      const context = wx.createCanvasContext('watermarkCanvas', this)
      context.setFillStyle('#FFFFFF')
      context.fillRect(0, 0, request.width, request.height)
      context.drawImage(request.sourcePath, 0, 0, request.width, request.height)

      const style = watermark.getWatermarkStyle(request.width, request.height)
      context.setFontSize(style.fontSize)
      const measured = context.measureText(request.watermarkText)
      const box = watermark.calculateWatermarkBox(
        request.width,
        request.height,
        measured && measured.width,
        request.positionId,
        style
      )
      if (!box) throw new Error('INVALID_WATERMARK_BOX')

      context.setGlobalAlpha(0.7)
      context.setFillStyle('#101918')
      context.fillRect(box.x, box.y, box.width, box.height)
      context.setGlobalAlpha(1)
      context.setFillStyle('#FFFFFF')
      context.setTextAlign('left')
      context.setTextBaseline('middle')
      context.fillText(request.watermarkText, box.textX, box.textY)
      context.draw(false, () => this.exportOutput(request))
    } catch (error) {
      this.failProcessing(request.requestId)
    }
  },

  exportOutput(request) {
    if (!this.isCurrent(request.requestId)) return
    try {
      wx.canvasToTempFilePath({
        canvasId: 'watermarkCanvas',
        width: request.width,
        height: request.height,
        destWidth: request.width,
        destHeight: request.height,
        fileType: 'jpg',
        quality: 0.96,
        success: (result) => {
          if (!this.isCurrent(request.requestId)) {
            removeTempFile(result.tempFilePath)
            return
          }
          this.setData({
            outputPath: result.tempFilePath,
            outputDimensions: `${request.width} × ${request.height}`,
            processing: false
          }, () => this.hideLoading())
          analytics.trackToolAction('photo-watermark', 'generate', 'success')
        },
        fail: () => this.failProcessing(request.requestId)
      }, this)
    } catch (error) {
      this.failProcessing(request.requestId)
    }
  },

  failProcessing(requestId) {
    if (!this.isCurrent(requestId)) return
    this.setData({ processing: false }, () => this.hideLoading())
    wx.showToast({ title: '水印生成失败，请换一张照片重试', icon: 'none' })
    analytics.trackToolAction('photo-watermark', 'generate', 'failed')
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
        analytics.trackToolAction('photo-watermark', 'save', 'success')
      },
      fail: () => {
        wx.showModal({
          title: '需要相册保存权限',
          content: '请在系统设置中允许保存到相册，再回来点击“保存到相册”。当前水印照片仍可预览。',
          showCancel: false
        })
        analytics.trackToolAction('photo-watermark', 'save', 'failed')
      }
    })
  },

  onShareAppMessage() {
    return { title: '时间水印相机｜本机添加拍摄时间', path: '/pages/photo-watermark/index' }
  }
})
