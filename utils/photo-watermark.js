const POSITION_OPTIONS = Object.freeze([
  { id: 'bottom-right', name: '右下角' },
  { id: 'bottom-left', name: '左下角' }
])

function pad2(value) {
  return String(value).padStart(2, '0')
}

function currentDateText(value) {
  const date = value instanceof Date && !Number.isNaN(value.getTime()) ? value : new Date()
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function currentTimeText(value) {
  const date = value instanceof Date && !Number.isNaN(value.getTime()) ? value : new Date()
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function parseLocalDateTime(dateText, timeText) {
  const dateMatch = String(dateText || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const timeMatch = String(timeText || '').match(/^(\d{2}):(\d{2})$/)
  if (!dateMatch || !timeMatch) return null

  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  const hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  if (year < 2000 || year > 2099 || hour > 23 || minute > 59) return null

  const date = new Date(year, month - 1, day, hour, minute, 0, 0)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) return null
  return date
}

function formatWatermarkText(dateText, timeText) {
  const date = parseLocalDateTime(dateText, timeText)
  if (!date) return ''
  return `${currentDateText(date)} ${currentTimeText(date)}`
}

function fitCanvasSize(width, height, maxLongEdge = 2048) {
  const sourceWidth = Number(width)
  const sourceHeight = Number(height)
  const limit = Number(maxLongEdge)
  if (!Number.isFinite(sourceWidth) || sourceWidth <= 0 || !Number.isFinite(sourceHeight) || sourceHeight <= 0 || !Number.isFinite(limit) || limit <= 0) return null
  const scale = Math.min(1, limit / Math.max(sourceWidth, sourceHeight))
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
    scale
  }
}

function getWatermarkStyle(width, height) {
  const shortEdge = Math.max(1, Math.min(Number(width) || 1, Number(height) || 1))
  const fontSize = Math.max(24, Math.min(64, Math.round(shortEdge * 0.045)))
  return {
    fontSize,
    paddingX: Math.max(14, Math.round(fontSize * 0.58)),
    paddingY: Math.max(9, Math.round(fontSize * 0.38)),
    margin: Math.max(18, Math.round(fontSize * 0.72))
  }
}

function calculateWatermarkBox(canvasWidth, canvasHeight, textWidth, position, style) {
  const width = Number(canvasWidth)
  const height = Number(canvasHeight)
  const measuredTextWidth = Math.max(0, Number(textWidth) || 0)
  if (!width || !height || !style) return null

  const boxWidth = Math.min(width, Math.round(measuredTextWidth + style.paddingX * 2))
  const boxHeight = Math.round(style.fontSize + style.paddingY * 2)
  const margin = Math.min(style.margin, Math.max(0, Math.floor((width - boxWidth) / 2)), Math.max(0, Math.floor((height - boxHeight) / 2)))
  const isLeft = position === 'bottom-left'
  const x = isLeft ? margin : Math.max(0, width - boxWidth - margin)
  const y = Math.max(0, height - boxHeight - margin)

  return {
    x,
    y,
    width: boxWidth,
    height: boxHeight,
    textX: x + style.paddingX,
    textY: y + boxHeight / 2
  }
}

module.exports = {
  POSITION_OPTIONS,
  currentDateText,
  currentTimeText,
  parseLocalDateTime,
  formatWatermarkText,
  fitCanvasSize,
  getWatermarkStyle,
  calculateWatermarkBox
}
