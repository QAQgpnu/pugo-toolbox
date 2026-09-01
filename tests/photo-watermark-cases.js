const assert = require('assert/strict')
const watermark = require('../utils/photo-watermark')

function run() {
  const fixed = new Date(2026, 7, 27, 9, 5, 0, 0)
  assert.equal(watermark.currentDateText(fixed), '2026-08-27')
  assert.equal(watermark.currentTimeText(fixed), '09:05')
  assert.equal(watermark.formatWatermarkText('2024-02-29', '23:59'), '2024-02-29 23:59')
  assert.equal(watermark.formatWatermarkText('2025-02-29', '12:00'), '')
  assert.equal(watermark.formatWatermarkText('2026-08-27', '24:00'), '')

  assert.deepEqual(watermark.fitCanvasSize(4000, 3000, 2048), {
    width: 2048,
    height: 1536,
    scale: 0.512
  })
  assert.deepEqual(watermark.fitCanvasSize(800, 600, 2048), {
    width: 800,
    height: 600,
    scale: 1
  })
  assert.equal(watermark.fitCanvasSize(0, 600, 2048), null)

  const style = watermark.getWatermarkStyle(1080, 1920)
  const left = watermark.calculateWatermarkBox(1080, 1920, 360, 'bottom-left', style)
  const right = watermark.calculateWatermarkBox(1080, 1920, 360, 'bottom-right', style)
  assert.ok(left.x < right.x)
  assert.equal(left.y, right.y)
  assert.ok(left.textX > left.x)
  assert.ok(left.textY > left.y && left.textY < left.y + left.height)
  assert.equal(watermark.POSITION_OPTIONS.length, 2)
}

if (require.main === module) {
  run()
  console.log('时间水印核心算法测试通过')
}

module.exports = { run }
