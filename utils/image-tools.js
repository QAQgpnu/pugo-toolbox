const QUALITY_PRESETS = Object.freeze([
  { id: 'small', label: '更省空间', quality: 0.55 },
  { id: 'balanced', label: '清晰均衡', quality: 0.75 },
  { id: 'clear', label: '优先清晰', quality: 0.9 }
])

const LONG_EDGE_PRESETS = Object.freeze([1280, 1920, 2560])

const PHOTO_SIZE_PRESETS = Object.freeze([
  { id: 'one-inch', name: '一寸', use: '简历、证件常用', mm: '25 × 35 mm', width: 295, height: 413 },
  { id: 'small-one-inch', name: '小一寸', use: '部分证照常用', mm: '22 × 32 mm', width: 260, height: 378 },
  { id: 'large-one-inch', name: '大一寸', use: '部分证照常用', mm: '33 × 48 mm', width: 390, height: 567 },
  { id: 'two-inch', name: '二寸', use: '证件、档案常用', mm: '35 × 49 mm', width: 413, height: 579 },
  { id: 'small-two-inch', name: '小二寸', use: '考试、签证常用', mm: '35 × 45 mm', width: 413, height: 531 }
])

function positiveNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

function fitWithin(width, height, maxLongEdge) {
  const sourceWidth = positiveNumber(width)
  const sourceHeight = positiveNumber(height)
  const limit = positiveNumber(maxLongEdge)
  if (!sourceWidth || !sourceHeight || !limit) return null
  const longEdge = Math.max(sourceWidth, sourceHeight)
  const scale = Math.min(1, limit / longEdge)
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
    scale
  }
}

function formatBytes(value) {
  const bytes = Math.max(0, Number(value) || 0)
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function getPhotoSizePreset(id) {
  return PHOTO_SIZE_PRESETS.find((item) => item.id === id) || PHOTO_SIZE_PRESETS[0]
}

function calculateCoverPlacement(sourceWidth, sourceHeight, targetWidth, targetHeight, scale = 1, offsetY = 0) {
  const sw = positiveNumber(sourceWidth)
  const sh = positiveNumber(sourceHeight)
  const tw = positiveNumber(targetWidth)
  const th = positiveNumber(targetHeight)
  const safeScale = Math.max(0.8, Math.min(1.35, Number(scale) || 1))
  const safeOffset = Math.max(-0.25, Math.min(0.25, Number(offsetY) || 0))
  if (!sw || !sh || !tw || !th) return null
  const coverScale = Math.max(tw / sw, th / sh) * safeScale
  const drawWidth = sw * coverScale
  const drawHeight = sh * coverScale
  return {
    x: Math.round((tw - drawWidth) / 2),
    y: Math.round((th - drawHeight) / 2 + safeOffset * th),
    width: Math.round(drawWidth),
    height: Math.round(drawHeight)
  }
}

module.exports = {
  QUALITY_PRESETS,
  LONG_EDGE_PRESETS,
  PHOTO_SIZE_PRESETS,
  fitWithin,
  formatBytes,
  getPhotoSizePreset,
  calculateCoverPlacement
}
