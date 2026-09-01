const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const root = path.resolve(__dirname, '..')
let passed = 0
let failed = 0
const asyncTests = []

function test(name, run) {
  try {
    run()
    passed += 1
    console.log(`✓ ${name}`)
  } catch (error) {
    failed += 1
    console.error(`✗ ${name}`)
    console.error(error.stack || error.message)
  }
}

function testAsync(name, run) {
  asyncTests.push({ name, run })
}

function walk(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') return []
      return walk(target, extension)
    }
    return !extension || target.endsWith(extension) ? [target] : []
  })
}

function loadPageModule(modulePath) {
  const resolved = require.resolve(modulePath)
  const previousPage = global.Page
  let definition
  global.Page = (value) => { definition = value }
  delete require.cache[resolved]
  try {
    const exported = require(modulePath)
    return { definition, exported }
  } finally {
    delete require.cache[resolved]
    if (previousPage === undefined) delete global.Page
    else global.Page = previousPage
  }
}

function makePageInstance(definition) {
  const instance = Object.assign({}, definition)
  instance.data = JSON.parse(JSON.stringify(definition.data || {}))
  instance.setData = function setData(patch, callback) {
    Object.assign(this.data, patch)
    if (typeof callback === 'function') callback()
  }
  return instance
}

const textUtils = require('../utils/text')
const dateUtils = require('../utils/date')
const converter = require('../utils/converter')
const calculator = require('../utils/calculate')
const money = require('../utils/money')
const safety = require('../utils/safety')
const dailyTools = require('../utils/daily-tools')
const entertainment = require('../utils/entertainment')
const homeDashboard = require('../utils/home-dashboard')
const randomUtils = require('../utils/random')
const analytics = require('../utils/analytics')
const financeTools = require('../utils/finance-tools')
const petAge = require('../utils/pet-age')
const licenseCycle = require('../utils/license-cycle')
const imageTools = require('../utils/image-tools')
const localBackground = require('../utils/local-background')
const photoWatermark = require('../utils/photo-watermark')
const cosmetics = require('../utils/cosmetics')
const ocrText = require('../utils/ocr-text')
const cycle = require('../utils/cycle')
const steamRadar = require('../utils/steam-radar')
const storage = require('../utils/storage')
const excelData = require('../utils/excel-data')
const tableCleaner = require('../utils/table-cleaner')
const meetingCost = require('../utils/meeting-cost')

test('文本统计按 Unicode 字符和实际行数计算', () => {
  assert.deepEqual(textUtils.countText('浦哥😀\n工具'), {
    characterCount: 6,
    lineCount: 2
  })
  assert.deepEqual(textUtils.countText(''), { characterCount: 0, lineCount: 0 })
})

test('文本操作可组合：合并空格、去空行、逐行去重', () => {
  const result = textUtils.processText('A   B\n\nA   B\n C', [
    textUtils.OPERATION_IDS.MERGE_SPACES,
    textUtils.OPERATION_IDS.REMOVE_EMPTY_LINES,
    textUtils.OPERATION_IDS.DEDUPE_LINES
  ])
  assert.equal(result, 'A B\n C')
})

test('文本增强支持首尾清理、自然排序、链接提取和非空行编号', () => {
  const sorted = textUtils.processText('  项目10  \n项目2\n\n项目1', [
    textUtils.OPERATION_IDS.TRIM_LINES,
    textUtils.OPERATION_IDS.REMOVE_EMPTY_LINES,
    textUtils.OPERATION_IDS.SORT_LINES,
    textUtils.OPERATION_IDS.NUMBER_LINES
  ])
  assert.equal(sorted, '1. 项目1\n2. 项目2\n3. 项目10')

  const links = textUtils.processText(
    '官网 https://example.com/a，重复 https://example.com/a\n文档 https://example.com/b?x=1',
    [textUtils.OPERATION_IDS.EXTRACT_LINKS]
  )
  assert.equal(links, 'https://example.com/a\nhttps://example.com/b?x=1')
  assert.deepEqual(textUtils.extractLinks('没有链接'), [])
})

test('日期算法校验闰年并按 UTC 日历日计算', () => {
  assert.notEqual(dateUtils.parseDate('2024-02-29'), null)
  assert.equal(dateUtils.parseDate('2023-02-29'), null)
  assert.equal(dateUtils.daysBetween('2026-03-07', '2026-03-09'), 2)
  assert.equal(dateUtils.daysBetween('2026-12-31', '2027-01-01'), 1)
})

test('倒数日正确区分未来、过去和今天', () => {
  assert.deepEqual(dateUtils.countdownFrom('2026-08-13', '2026-08-10'), {
    status: 'future', prefix: '还有', days: 3, signedDays: 3, text: '还有 3 天'
  })
  assert.equal(dateUtils.countdownFrom('2026-08-09', '2026-08-10').status, 'past')
  assert.equal(dateUtils.countdownFrom('2026-08-10', '2026-08-10').status, 'today')
})

test('日期加减覆盖闰日、跨年、负数和异常范围', () => {
  assert.equal(dateUtils.addCalendarDays('2024-02-28', 1), '2024-02-29')
  assert.equal(dateUtils.addCalendarDays('2026-12-31', 1), '2027-01-01')
  assert.equal(dateUtils.addCalendarDays('2026-01-01', -1), '2025-12-31')
  assert.equal(dateUtils.addCalendarDays('2026-01-01', '7'), '2026-01-08')
  assert.equal(dateUtils.addCalendarDays('invalid', 1), null)
  assert.equal(dateUtils.addCalendarDays('2026-01-01', 365001), null)
})

test('长度、重量、温度换算覆盖常用中国单位', () => {
  assert.equal(converter.convertValue(1, 'length', 'meter', 'centimeter'), 100)
  assert.equal(converter.convertValue(2, 'weight', 'jin', 'kilogram'), 1)
  assert.equal(converter.convertValue(0, 'temperature', 'celsius', 'fahrenheit'), 32)
  assert.equal(converter.formatNumber(12.340000), '12.34')
  assert.ok(Number.isNaN(converter.convertValue('', 'length', 'meter', 'centimeter')))
})

test('面积、体积、速度、时间和数据容量换算口径明确', () => {
  assert.equal(converter.convertValue(1, 'area', 'mu', 'squareMeter'), 666.6666666666667)
  assert.equal(converter.convertValue(1, 'volume', 'cubicMeter', 'liter'), 1000)
  assert.equal(converter.convertValue(36, 'speed', 'kilometerPerHour', 'meterPerSecond'), 10)
  assert.equal(converter.convertValue(2, 'time', 'hour', 'minute'), 120)
  assert.equal(converter.convertValue(1, 'data', 'gigabyte', 'megabyte'), 1024)
})

test('百分比、折扣和涨跌幅覆盖零值与异常输入', () => {
  assert.equal(calculator.percentageOf(25, 200), 12.5)
  assert.equal(calculator.percentageOf(1, 0), null)
  const discount = calculator.discountPrice(299, 8.5)
  assert.equal(discount.finalPrice, 254.15)
  assert.ok(Math.abs(discount.saved - 44.85) < 1e-10)
  assert.equal(calculator.discountPrice(100, 11), null)
  assert.equal(calculator.percentageChange(80, 100), 25)
  assert.equal(calculator.percentageChange(100, 80), -20)
})

test('公积金试算按个人与单位分别取整，并覆盖投影和输入边界', () => {
  assert.deepEqual(financeTools.calculateHousingFund(10000, 5, 12, 1000, 12), {
    base: 10000,
    personalRate: 5,
    employerRate: 12,
    personalMonthly: 500,
    employerMonthly: 1200,
    totalMonthly: 1700,
    personalAnnual: 6000,
    employerAnnual: 14400,
    totalAnnual: 20400,
    currentBalance: 1000,
    projectionMonths: 12,
    projectedContribution: 20400,
    projectedBalance: 21400
  })
  assert.equal(financeTools.calculateHousingFund(10001, 5, 5, 0, 1).totalMonthly, 1000)
  assert.equal(financeTools.calculateHousingFund(0, 5, 5), null)
  assert.equal(financeTools.calculateHousingFund(10000, 31, 5), null)
  assert.equal(financeTools.calculateHousingFund(10000, 5, 5, -1), null)
  assert.equal(financeTools.calculateHousingFund(10000, 5, 5, 0, 0), null)
})

test('退休金试算覆盖计发月数、典型口径和无效范围', () => {
  assert.equal(financeTools.pensionPaymentMonths(50), 195)
  assert.equal(financeTools.pensionPaymentMonths(55), 170)
  assert.equal(financeTools.pensionPaymentMonths(60), 139)
  assert.equal(financeTools.pensionPaymentMonths(71), 0)
  assert.deepEqual(financeTools.calculatePensionEstimate(10000, 1, 30, 139000, 60), {
    calculationBase: 10000,
    averageIndex: 1,
    contributionYears: 30,
    accountBalance: 139000,
    retirementAge: 60,
    paymentMonths: 139,
    indexedMonthlySalary: 10000,
    basicPension: 3000,
    accountPension: 1000,
    estimatedMonthly: 4000,
    estimatedAnnual: 48000
  })
  assert.equal(financeTools.calculatePensionEstimate(0, 1, 30, 100000, 60), null)
  assert.equal(financeTools.calculatePensionEstimate(10000, 0.09, 30, 100000, 60), null)
  assert.equal(financeTools.calculatePensionEstimate(10000, 1, 0, 100000, 60), null)
  assert.equal(financeTools.calculatePensionEstimate(10000, 1, 30, 100000, 39), null)
})

test('宠物年龄换算区分猫犬体型、生命周期和无效年龄', () => {
  const cat = petAge.calculatePetAge('cat', 2, 0)
  assert.equal(cat.humanAge, 24)
  assert.equal(cat.stage.id, 'adult')
  const dog = petAge.calculatePetAge('dog', 5, 0, 'large')
  assert.equal(dog.humanAge, 42)
  assert.equal(dog.dogSize, 'large')
  assert.equal(petAge.calculatePetAge('dog', 10, 0, 'small').stage.id, 'senior')
  assert.equal(petAge.calculatePetAge('cat', 0, 1).humanAge, 1)
  assert.equal(petAge.calculatePetAge('cat', 0, 0), null)
  assert.equal(petAge.calculatePetAge('rabbit', 2, 0), null)
  assert.equal(petAge.calculatePetAge('dog', 31, 0), null)
})

test('驾照记分周期自查正确处理周年日、闰日和 12 分风险', () => {
  assert.equal(licenseCycle.anniversaryForYear('2020-02-29', 2026), '2026-02-28')
  const before = licenseCycle.calculateLicenseCycle('2020-02-29', 5, '2026-02-27')
  assert.deepEqual({
    remainingPoints: before.remainingPoints,
    periodStart: before.periodStart,
    periodEnd: before.periodEnd,
    nextPeriodStart: before.nextPeriodStart,
    daysRemaining: before.daysRemaining
  }, {
    remainingPoints: 7,
    periodStart: '2025-02-28',
    periodEnd: '2026-02-27',
    nextPeriodStart: '2026-02-28',
    daysRemaining: 1
  })
  const boundary = licenseCycle.calculateLicenseCycle('2020-02-29', 12, '2026-02-28')
  assert.equal(boundary.periodStart, '2026-02-28')
  assert.equal(boundary.remainingPoints, 0)
  assert.match(boundary.risk, /12123/)
  assert.equal(licenseCycle.calculateLicenseCycle('2027-01-01', 0, '2026-01-01'), null)
  assert.equal(licenseCycle.calculateLicenseCycle('2020-01-01', 100, '2026-01-01'), null)
})

test('图片工具覆盖等比缩放、证件照常见尺寸与人物定位', () => {
  assert.deepEqual(imageTools.fitWithin(4000, 2000, 1920), { width: 1920, height: 960, scale: 0.48 })
  assert.deepEqual(imageTools.fitWithin(800, 600, 1920), { width: 800, height: 600, scale: 1 })
  assert.equal(imageTools.fitWithin(0, 600, 1920), null)
  assert.equal(imageTools.formatBytes(1023), '1023 B')
  assert.equal(imageTools.formatBytes(1536), '1.5 KB')
  assert.equal(imageTools.formatBytes(2 * 1024 * 1024), '2.00 MB')

  assert.equal(imageTools.PHOTO_SIZE_PRESETS.length, 5)
  assert.deepEqual(imageTools.getPhotoSizePreset('one-inch'), {
    id: 'one-inch', name: '一寸', use: '简历、证件常用', mm: '25 × 35 mm', width: 295, height: 413
  })
  assert.deepEqual(imageTools.calculateCoverPlacement(600, 800, 295, 413, 1, 0), { x: -7, y: 0, width: 310, height: 413 })
  assert.equal(imageTools.calculateCoverPlacement(0, 800, 295, 413), null)
})

test('时间水印按本地日期生成并在常见画幅内稳定定位', () => {
  const fixed = new Date(2026, 7, 27, 9, 5, 0, 0)
  assert.equal(photoWatermark.currentDateText(fixed), '2026-08-27')
  assert.equal(photoWatermark.currentTimeText(fixed), '09:05')
  assert.equal(photoWatermark.formatWatermarkText('2024-02-29', '23:59'), '2024-02-29 23:59')
  assert.equal(photoWatermark.formatWatermarkText('2025-02-29', '12:00'), '')
  assert.deepEqual(photoWatermark.fitCanvasSize(4000, 3000, 2048), {
    width: 2048,
    height: 1536,
    scale: 0.512
  })
  const style = photoWatermark.getWatermarkStyle(1080, 1920)
  const left = photoWatermark.calculateWatermarkBox(1080, 1920, 360, 'bottom-left', style)
  const right = photoWatermark.calculateWatermarkBox(1080, 1920, 360, 'bottom-right', style)
  assert.ok(left.x < right.x)
  assert.equal(left.y, right.y)
})

test('证件照只移除边缘连通的纯色背景并保留人物内部同色像素', () => {
  const width = 10
  const height = 10
  const pixels = new Uint8ClampedArray(width * height * 4)
  function paint(x, y, color) {
    const offset = (y * width + x) * 4
    pixels[offset] = color[0]
    pixels[offset + 1] = color[1]
    pixels[offset + 2] = color[2]
    pixels[offset + 3] = 255
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) paint(x, y, [40, 120, 200])
  }
  for (let y = 2; y < height; y += 1) {
    for (let x = 3; x <= 6; x += 1) paint(x, y, [180, 70, 60])
  }
  paint(4, 5, [40, 120, 200])

  const result = localBackground.removeConnectedBackground(pixels, width, height)
  assert.equal(result.data[3], 0, '与顶边连通的背景应变为透明')
  assert.equal(result.data[(5 * width + 4) * 4 + 3], 255, '人物内部即使与背景同色，也不得被全图扫描误删')
  assert.equal(result.data[(5 * width + 3) * 4 + 3], 255, '人物像素必须保持不透明')
  assert.ok(result.coverage > 0.5 && result.coverage < 0.8)

  const page = fs.readFileSync(path.join(root, 'pages', 'photo-bg', 'index.js'), 'utf8')
  assert.match(page, /removeConnectedBackground\s*\(/)
  assert.match(page, /MAX_PROCESSING_LONG_EDGE/)
  assert.doesNotMatch(page, /vision-service|segmentPortrait|wx\.cloud/)
})

testAsync('证件照会对纯色背景不足和人物背景过近给出准确提示', async () => {
  const previousWx = global.wx
  const modals = []
  global.wx = {
    showLoading() {},
    hideLoading() {},
    showModal(options) { modals.push(options) },
    getFileSystemManager() {
      return { unlink({ success }) { if (typeof success === 'function') success() } }
    }
  }
  const expected = {
    BACKGROUND_NOT_FOUND: '没有识别到足够的纯色背景，请换一张背景更简单、四周留有空白的照片',
    FOREGROUND_NOT_FOUND: '人物与背景颜色过于接近，请换一张人物轮廓更清楚的照片'
  }

  try {
    const { definition } = loadPageModule('../pages/photo-bg/index.js')
    for (const [code, content] of Object.entries(expected)) {
      const page = makePageInstance(definition)
      page.requestGeneration = 0
      page.unloaded = false
      page.loadingVisible = false
      page.createLocalForeground = async () => { throw Object.assign(new Error(code), { code }) }
      await page.processImage('source-portrait.jpg')
      assert.equal(modals.at(-1).title, '没有识别好背景')
      assert.equal(modals.at(-1).content, content)
      assert.equal(/网络|云端|额度/.test(modals.at(-1).content), false)
    }
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

testAsync('证件照合成只铺背景色并绘制透明人物图，按所选尺寸导出', async () => {
  const previousWx = global.wx
  const drawing = []
  let exportOptions
  global.wx = {
    getImageInfo({ src, success }) {
      drawing.push({ action: 'getImageInfo', src })
      success({ width: 500, height: 1000 })
    },
    createCanvasContext() {
      return {
        setFillStyle(color) { drawing.push({ action: 'setFillStyle', color }) },
        fillRect(x, y, width, height) { drawing.push({ action: 'fillRect', x, y, width, height }) },
        drawImage(src, x, y, width, height) { drawing.push({ action: 'drawImage', src, x, y, width, height }) },
        draw(_reserve, callback) { drawing.push({ action: 'draw' }); callback() }
      }
    },
    canvasToTempFilePath(options) {
      exportOptions = options
      options.success({ tempFilePath: 'composed-id-photo.jpg' })
    },
    showLoading() {},
    hideLoading() {},
    getFileSystemManager() {
      return { unlink({ success }) { if (typeof success === 'function') success() } }
    }
  }
  try {
    const { definition } = loadPageModule('../pages/photo-bg/index.js')
    const page = makePageInstance(definition)
    page.requestGeneration = 0
    page.unloaded = false
    page.loadingVisible = false
    page.data.sourcePath = 'original-photo.jpg'
    page.data.foregroundPath = 'transparent-person.png'
    page.data.backgroundId = 'red'
    page.data.canvasWidth = 390
    page.data.canvasHeight = 567
    page.data.portraitScale = 100
    page.data.portraitOffsetY = 0

    await page.compose()

    assert.deepEqual(drawing[0], { action: 'getImageInfo', src: 'transparent-person.png' })
    assert.deepEqual(drawing[1], { action: 'setFillStyle', color: '#DC4949' })
    assert.deepEqual(drawing[2], { action: 'fillRect', x: 0, y: 0, width: 390, height: 567 })
    assert.equal(drawing[3].action, 'drawImage')
    assert.equal(drawing[3].src, 'transparent-person.png')
    assert.equal(drawing.some((item) => item.src === 'original-photo.jpg'), false, '换底合成不得重新绘制会遮住背景色的原图')
    assert.equal(exportOptions.destWidth, 390)
    assert.equal(exportOptions.destHeight, 567)
    assert.equal(page.data.outputPath, 'composed-id-photo.jpg')
    assert.equal(page.data.processing, false)
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('证件照透明前景只在本机生成并在页面生命周期结束时清理', () => {
  const page = fs.readFileSync(path.join(root, 'pages', 'photo-bg', 'index.js'), 'utf8')
  assert.match(page, /wx\.canvasGetImageData\s*\(/)
  assert.match(page, /wx\.canvasPutImageData\s*\(/)
  assert.match(page, /fileType:\s*['"]png['"]/)
  assert.doesNotMatch(page, /wx\.cloud|fileID|imageVision/)
  assert.match(page, /onUnload\s*\(\)[\s\S]*?removeLocalTempFile\(this\.data\.foregroundPath\)/)
  assert.match(page, /onUnload\s*\(\)[\s\S]*?removeLocalTempFile\(this\.data\.outputPath\)/)
  assert.match(page, /!this\.isCurrent\(requestId\)[\s\S]*?removeLocalTempFile\(foregroundPath\)/)
})

test('证件照离页与失效导出会关闭 loading 并清理本机临时文件', () => {
  const previousWx = global.wx
  const removed = []
  let hideLoadingCount = 0
  let exportSuccess
  let chooseSuccess
  global.wx = {
    hideLoading() { hideLoadingCount += 1 },
    chooseMedia(options) { chooseSuccess = options.success },
    canvasToTempFilePath(options) { exportSuccess = options.success },
    getFileSystemManager() {
      return {
        unlink(options) {
          removed.push(options.filePath)
          if (typeof options.success === 'function') options.success()
        }
      }
    }
  }
  try {
    const { definition } = loadPageModule('../pages/photo-bg/index.js')
    const leavingPage = makePageInstance(definition)
    leavingPage.requestGeneration = 3
    leavingPage.unloaded = false
    leavingPage.loadingVisible = true
    leavingPage.data.foregroundPath = 'foreground.png'
    leavingPage.data.outputPath = 'output.jpg'
    leavingPage.onUnload()
    assert.equal(leavingPage.unloaded, true)
    assert.ok(removed.includes('foreground.png'))
    assert.ok(removed.includes('output.jpg'))
    assert.equal(hideLoadingCount, 1)

    const generationAfterUnload = leavingPage.requestGeneration
    leavingPage.chooseImage()
    chooseSuccess({ tempFiles: [{ tempFilePath: 'late-photo.jpg' }] })
    leavingPage.processImage('late-direct-photo.jpg')
    assert.equal(leavingPage.requestGeneration, generationAfterUnload, '离页后的选图和直接处理都必须被入口拦截')
    assert.equal(leavingPage.data.sourcePath, '')

    const { definition: watermarkDefinition } = loadPageModule('../pages/photo-watermark/index.js')
    const watermarkPage = makePageInstance(watermarkDefinition)
    watermarkPage.unloaded = true
    watermarkPage.requestGeneration = 4
    watermarkPage.chooseImage()
    chooseSuccess({ tempFiles: [{ tempFilePath: 'late-watermark-photo.jpg' }] })
    assert.equal(watermarkPage.requestGeneration, 4, '时间水印离页后的选图回调不得启动处理')
    assert.equal(watermarkPage.data.sourcePath, '')

    const stalePage = makePageInstance(definition)
    stalePage.requestGeneration = 2
    stalePage.unloaded = false
    stalePage.data.canvasWidth = 295
    stalePage.data.canvasHeight = 413
    stalePage.exportOutput(1)
    exportSuccess({ tempFilePath: 'stale-output.jpg' })
    assert.ok(removed.includes('stale-output.jpg'))
    assert.equal(stalePage.data.outputPath, '')
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('本机 OCR 文本清洗会按识别顺序合并全部文字块', () => {
  assert.equal(ocrText.cleanIngredientOcrText('全成分表：\n水，甘油\nNiacinamide'), '水、甘油、Niacinamide')
  assert.equal(ocrText.pickOcrText([
    { text: '全成分表：水，甘油' },
    { text: '烟酰胺；泛醇' },
    { subtext: '苯氧乙醇' }
  ]), '水、甘油、烟酰胺、泛醇、苯氧乙醇')
  assert.equal(ocrText.pickOcrText([
    { text: '水，甘油' },
    { text: '水、甘油' },
    { text: '   ', subtext: '烟酰胺' }
  ]), '水、甘油、烟酰胺')
  assert.equal(ocrText.pickOcrText([]), '')
})

testAsync('化妆品拍照 OCR 会缩放图片、送入端侧识别并写回指定一侧供校对', async () => {
  const previousWx = global.wx
  let ocrFrame
  const toasts = []
  const image = {}
  Object.defineProperty(image, 'src', {
    set() { if (typeof image.onload === 'function') image.onload() }
  })
  global.wx = {
    getDeviceInfo() { return { platform: 'ios' } },
    createVKSession() {},
    getImageInfo({ success }) { success({ width: 2400, height: 1200 }) },
    createOffscreenCanvas({ width, height }) {
      return {
        getContext() {
          return {
            drawImage() {},
            getImageData() { return { data: new Uint8ClampedArray(width * height * 4) } }
          }
        },
        createImage() { return image }
      }
    },
    showLoading() {},
    hideLoading() {},
    showToast(options) { toasts.push(options) }
  }
  try {
    const { definition } = loadPageModule('../pages/cosmetics/index.js')
    const page = makePageInstance(definition)
    page.onLoad()
    page.setData({ ocrReady: true })
    page.ocrSession = {
      runOCR(frame) { ocrFrame = frame },
      stop() {}
    }

    await page.runLocalOcr('ingredients.jpg', 'right')
    assert.equal(ocrFrame.width, 1600)
    assert.equal(ocrFrame.height, 800)
    assert.ok(ocrFrame.frameBuffer instanceof ArrayBuffer)
    assert.equal(page.data.ocrProcessing, true)
    assert.equal(page.data.ocrSide, 'right')

    page.handleOcrResult([
      { text: '全成分表：水，甘油' },
      { text: '烟酰胺；苯氧乙醇' }
    ])
    assert.equal(page.data.leftText, '')
    assert.equal(page.data.rightText, '水、甘油、烟酰胺、苯氧乙醇')
    assert.equal(page.data.ocrProcessing, false)
    assert.equal(page.data.ocrSide, '')
    assert.deepEqual(toasts, [{ title: '已识别，请先校对' }])
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('化妆品 OCR 离页会终止会话、关闭 loading 并丢弃迟到结果', () => {
  const previousWx = global.wx
  let hideLoadingCount = 0
  let stopCount = 0
  let toastCount = 0
  global.wx = {
    getDeviceInfo() { return { platform: 'ios' } },
    createVKSession() {},
    createOffscreenCanvas() {},
    hideLoading() { hideLoadingCount += 1 },
    showToast() { toastCount += 1 }
  }
  try {
    const { definition } = loadPageModule('../pages/cosmetics/index.js')
    const page = makePageInstance(definition)
    page.onLoad()
    page.setData({ leftText: '原有内容', ocrProcessing: true, ocrSide: 'left' })
    page.requestGeneration = 7
    page.activeOcrRequestId = 7
    page.ocrLoadingVisible = true
    page.ocrLoadingRequestId = 7
    page.ocrSession = { stop() { stopCount += 1 } }

    page.onUnload()
    page.handleOcrResult([{ text: '水、甘油' }])
    page.failOcr('不应显示', 7)

    assert.equal(page.unloaded, true)
    assert.equal(page.ocrSession, null)
    assert.equal(page.ocrCanvas, null)
    assert.equal(stopCount, 1)
    assert.equal(hideLoadingCount, 1)
    assert.equal(page.data.leftText, '原有内容')
    assert.equal(toastCount, 0)

    const processingPage = makePageInstance(definition)
    processingPage.onLoad()
    processingPage.setData({ leftText: '识别前', rightText: '另一份', ocrProcessing: true })
    processingPage.fillExample()
    processingPage.clearAll()
    processingPage.compare()
    assert.equal(processingPage.data.leftText, '识别前')
    assert.equal(processingPage.data.rightText, '另一份')
    assert.equal(toastCount, 0)

    const wxml = fs.readFileSync(path.join(root, 'pages', 'cosmetics', 'index.wxml'), 'utf8')
    assert.match(wxml, /class="example-button" disabled="{{ocrProcessing}}"/)
    assert.match(wxml, /class="clear-button" disabled="{{ocrProcessing}}"/)
    assert.match(wxml, /class="compare-button" disabled="{{ocrProcessing}}"/)
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('化妆品成分词典识别中英文别名并只做可解释的差异对比', () => {
  assert.equal(cosmetics.identifyIngredient('Aqua').key, 'water')
  assert.equal(cosmetics.identifyIngredient('玻尿酸钠').key, 'sodium-hyaluronate')
  assert.equal(cosmetics.identifyIngredient('本地未收录成分').known, false)
  assert.deepEqual(cosmetics.splitIngredients('水，甘油;烟酰胺\n角鲨烷'), ['水', '甘油', '烟酰胺', '角鲨烷'])

  const result = cosmetics.compareIngredientLists(
    '水、甘油、烟酰胺、测试成分',
    'Aqua, Glycerin, Squalane, 测试成分'
  )
  assert.deepEqual(result.common.map((item) => item.key), ['water', 'glycerin', 'unknown:测试成分'])
  assert.deepEqual(result.onlyLeft.map((item) => item.key), ['niacinamide'])
  assert.deepEqual(result.onlyRight.map((item) => item.key), ['squalane'])
  assert.equal(result.knownCount, 6)
  assert.equal(result.unknownCount, 2)
})

test('周期估算使用本地日历日，覆盖稳定周期、去重和异常日期', () => {
  assert.notEqual(cycle.parseLocalDate('2024-02-29'), null)
  assert.equal(cycle.parseLocalDate('2023-02-29'), null)
  assert.equal(cycle.addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(cycle.daysBetween('2026-03-07', '2026-03-09'), 2)
  assert.deepEqual(cycle.normalizeRecords([
    { date: 'invalid', duration: 4 },
    { date: '2026-01-29', duration: 7 },
    { date: '2026-01-01', duration: 5 },
    { date: '2026-01-29', duration: 9 }
  ]), [
    { date: '2026-01-01', duration: 5 },
    { date: '2026-01-29', duration: 7 }
  ])
  const result = cycle.estimateCycle([
    { date: '2026-01-01', duration: 5 },
    { date: '2026-01-29', duration: 5 },
    { date: '2026-02-26', duration: 5 },
    { date: '2026-03-26', duration: 5 }
  ])
  assert.equal(result.averageCycle, 28)
  assert.equal(result.variation, 0)
  assert.equal(result.nextDate, '2026-04-23')
  assert.equal(result.expectedEnd, '2026-04-27')
  assert.equal(result.confidence, '较稳定')
  assert.equal(cycle.estimateCycle([]), null)
})

test('周期第 13 条较早记录会明确拒绝，较新记录保存后仍然可见', () => {
  const pageModule = loadPageModule('../pages/period/index')
  const records = Array.from({ length: 12 }, (_, index) => ({
    date: `2026-${String(index + 1).padStart(2, '0')}-01`,
    duration: 5
  }))
  const tooOld = pageModule.exported.buildRecordUpdate(records, '2025-12-01', 5)
  assert.equal(tooOld.accepted, false)
  assert.deepEqual(tooOld.records, cycle.normalizeRecords(records))
  const newest = pageModule.exported.buildRecordUpdate(records, '2027-01-01', 5)
  assert.equal(newest.accepted, true)
  assert.equal(newest.records.length, 12)
  assert.ok(newest.records.some((item) => item.date === '2027-01-01'))
  assert.equal(newest.droppedOldest, true)
})

test('Steam 限免雷达只管理本机记录并正确区分活动状态', () => {
  const record = steamRadar.normalizeRecord({
    id: 'game-1', name: '  测试游戏  ', endDate: '2026-08-22', type: 'keep', createdAt: 1
  })
  assert.equal(record.name, '测试游戏')
  assert.equal(steamRadar.normalizeRecord({ name: '', endDate: '2026-08-22' }), null)
  assert.equal(steamRadar.normalizeRecord({ name: '测试', endDate: 'bad-date' }), null)
  assert.equal(steamRadar.presentRecord(record, '2026-08-20').countdown, '还剩 2 天')
  assert.equal(steamRadar.presentRecord(record, '2026-08-22').countdown, '今天截止')
  assert.equal(steamRadar.presentRecord(record, '2026-08-23').state, 'expired')
  const active = steamRadar.activeRecords([
    record,
    { id: 'game-2', name: '已过期', endDate: '2026-08-19', type: 'weekend', createdAt: 2 }
  ], '2026-08-20')
  assert.deepEqual(active.map((item) => item.id), ['game-1'])

  const full = Array.from({ length: 30 }, (_, index) => ({
    id: `existing-${index}`,
    name: `已有游戏 ${index}`,
    endDate: '2026-09-30',
    type: 'keep',
    claimed: false,
    createdAt: index + 1
  }))
  const newest = steamRadar.normalizeRecord({
    id: 'newest', name: '本次新增', endDate: '2027-12-31', type: 'keep', createdAt: 9999
  })
  const afterAdd = steamRadar.addRecord(full, newest, '2026-08-20')
  assert.equal(afterAdd.length, steamRadar.MAX_RECORDS)
  assert.ok(afterAdd.some((item) => item.id === 'newest'), '第 31 条本次新增记录必须可见')

  const prioritized = steamRadar.normalizeRecords(Array.from({ length: 29 }, (_, index) => ({
    id: `active-${index}`,
    name: `未领取有效 ${index}`,
    endDate: '2026-10-01',
    type: 'keep',
    claimed: false,
    createdAt: index + 1
  })).concat([
    { id: 'claimed-active', name: '已领取有效', endDate: '2026-10-02', type: 'keep', claimed: true, createdAt: 100 },
    { id: 'claimed-expired', name: '已领取过期', endDate: '2026-01-01', type: 'keep', claimed: true, createdAt: 200 }
  ]), '2026-08-20')
  assert.equal(prioritized.length, steamRadar.MAX_RECORDS)
  assert.ok(prioritized.some((item) => item.id === 'claimed-active'))
  assert.equal(prioritized.some((item) => item.id === 'claimed-expired'), false, '容量不足时应先清理已领取过期项')
})

test('金额大写覆盖零值、跨位补零、角分和输入边界', () => {
  assert.equal(money.toChineseUppercase('0'), '零元整')
  assert.equal(money.toChineseUppercase('0.05'), '伍分')
  assert.equal(money.toChineseUppercase('0.50'), '伍角')
  assert.equal(money.toChineseUppercase('1.01'), '壹元零壹分')
  assert.equal(money.toChineseUppercase('10'), '壹拾元整')
  assert.equal(money.toChineseUppercase('1001.05'), '壹仟零壹元零伍分')
  assert.equal(money.toChineseUppercase('100000001.01'), '壹亿零壹元零壹分')
  assert.equal(money.toChineseUppercase('￥1,234,567.89'), '壹佰贰拾叁万肆仟伍佰陆拾柒元捌角玖分')
  assert.equal(money.toChineseUppercase('-1'), null)
  assert.equal(money.toChineseUppercase('1.001'), null)
  assert.equal(money.toChineseUppercase('1000000000000'), null)
})

test('安心自查提供三套模板并支持自定义清单和检查项目', () => {
  const defaults = safety.defaultLists()
  assert.equal(defaults.length, 3)
  assert.equal(defaults[0].id, 'leaving-home')
  assert.ok(defaults[0].items.some((item) => item.critical))

  const custom = safety.createCustomList('下班前检查', '电脑已关机', 1000, 0.123)
  assert.equal(custom.name, '下班前检查')
  assert.equal(custom.items[0].label, '电脑已关机')
  let lists = safety.addList(defaults, custom)
  assert.equal(lists.length, 4)
  lists = safety.addItem(lists, custom.id, '门窗已关闭', true, 1001, 0.456)
  const updated = lists.find((item) => item.id === custom.id)
  assert.equal(updated.items.length, 2)
  assert.equal(updated.items[1].critical, true)
  lists = safety.removeItem(lists, custom.id, updated.items[0].id)
  assert.equal(lists.find((item) => item.id === custom.id).items.length, 1)
  assert.equal(safety.deleteCustomList(lists, 'leaving-home').length, lists.length)
  assert.equal(safety.deleteCustomList(lists, custom.id).length, 3)
})

test('安心自查会话逐项确认后才能登记并限制历史数量', () => {
  const list = safety.defaultLists()[0]
  let session = safety.createSession(list, 10000, 0.25)
  assert.deepEqual(safety.sessionProgress(session), {
    checked: 0, total: 7, percent: 0, complete: false
  })
  assert.equal(safety.buildHistoryRecord(session, 20000), null)
  session.items.forEach((item) => {
    session = safety.toggleSessionItem(session, item.id)
  })
  assert.deepEqual(safety.sessionProgress(session), {
    checked: 7, total: 7, percent: 100, complete: true
  })
  const record = safety.buildHistoryRecord(session, 20000)
  assert.equal(record.listName, '出门前检查')
  assert.equal(record.durationSeconds, 10)
  let history = []
  for (let index = 0; index < 35; index += 1) {
    history = safety.appendHistory(history, Object.assign({}, record, {
      id: `record-${index}`,
      completedAt: 20000 + index
    }))
  }
  assert.equal(history.length, 30)
  assert.equal(history[0].id, 'record-34')
})

test('东西放哪了支持新增、搜索和数据清洗', () => {
  let records = dailyTools.addWhereRecord([], '螺丝刀', '阳台工具柜第二层', '工具', 1000, 0.1)
  records = dailyTools.addWhereRecord(records, '备用钥匙', '鞋柜上层', '重要物品', 1001, 0.2)
  assert.equal(records.length, 2)
  assert.equal(dailyTools.searchWhereRecords(records, '工具柜')[0].name, '螺丝刀')
  assert.equal(dailyTools.searchWhereRecords(records, '重要物品')[0].name, '备用钥匙')
  assert.equal(dailyTools.addWhereRecord(records, '', '', '', 1002, 0.3).length, 2)
})

test('该换了按周期计算下次日期并提供到期状态', () => {
  let records = dailyTools.addLifecycleRecord([], '牙刷', '2026-08-18', 90, 1000, 0.1)
  assert.equal(records[0].nextDate, '2026-11-16')
  assert.deepEqual(dailyTools.lifecycleStatus('2026-08-18', '2026-08-18'), { tone: 'warning', text: '今天该处理' })
  records = dailyTools.markLifecycleDone(records, records[0].id, '2026-08-20')
  assert.equal(records[0].nextDate, '2026-11-18')
})

test('临时记忆卡按有效期自动过滤', () => {
  const now = 100000
  const notes = dailyTools.addQuickNote([], '停车位置', 'B2 层 C36', 24, now, 0.1)
  assert.equal(dailyTools.normalizeQuickNotes(notes, now + 23 * 3600000).length, 1)
  assert.equal(dailyTools.normalizeQuickNotes(notes, now + 25 * 3600000).length, 0)
})

test('冰箱先吃谁按日期排序并区分临期状态', () => {
  let records = dailyTools.addFoodRecord([], '牛奶', '2026-08-19', 1000, 0.1)
  records = dailyTools.addFoodRecord(records, '鸡蛋', '2026-08-25', 1001, 0.2)
  const sorted = dailyTools.sortFoodRecords(records, '2026-08-18')
  assert.equal(sorted[0].name, '牛奶')
  assert.equal(sorted[0].tone, 'warning')
  assert.equal(dailyTools.foodStatus('2026-08-17', '2026-08-18').tone, 'danger')
})

test('公平轮值优先选择历史次数较少的人', () => {
  const selected = dailyTools.chooseFair(['小浦', '阿明', '小林'], [
    { name: '小浦' }, { name: '小浦' }, { name: '阿明' }
  ], () => 0)
  assert.equal(selected.name, '小林')
  assert.equal(dailyTools.chooseFair(['小浦'], [], () => 0), null)
})

test('今天只做一件按紧急和重要标记排序', () => {
  const result = dailyTools.pickTopTask([
    { text: '整理桌面', index: 0, important: false, urgent: false },
    { text: '提交报销', index: 1, important: true, urgent: false },
    { text: '回复紧急消息', index: 2, important: false, urgent: true }
  ])
  assert.equal(result.text, '回复紧急消息')
})

test('一起算清按分精确分摊且总额不丢失', () => {
  assert.deepEqual(dailyTools.calculateSplit(100, 0, 0, 3), {
    total: 100, people: 3, base: 33.33, remainder: 1, first: 33.34
  })
  assert.deepEqual(dailyTools.calculateSplit(368, 50, 12, 4), {
    total: 330, people: 4, base: 82.5, remainder: 0, first: 82.5
  })
  assert.equal(dailyTools.calculateSplit('', 0, 0, 2), null)
  assert.equal(dailyTools.calculateSplit(100, 0, 0, 0), null)
})

test('首页今日待处理聚合五类本机数据并按紧急程度排序', () => {
  const now = new Date(2026, 7, 18, 9, 0, 0).getTime()
  const dashboard = homeDashboard.buildTodayDashboard({
    safetyDraft: { listName: '出门前检查' },
    safetyProgress: { checked: 2, total: 5 },
    lifecycleRecords: [{ id: 'cycle-1', name: '滤芯', intervalDays: 90, lastDate: '2026-05-17', nextDate: '2026-08-15' }],
    foodRecords: [{ id: 'food-1', name: '牛奶', expiryDate: '2026-08-18' }],
    quickNotes: [{ id: 'note-1', title: '停车位置', detail: 'B2 C36', createdAt: now, expiresAt: now + 8 * 3600000 }],
    focusDraft: { tasks: [{ text: '提交报告', index: 0, urgent: true, important: false }] }
  }, '2026-08-18', now)
  assert.equal(dashboard.totalCount, 5)
  assert.equal(dashboard.pendingItemCount, 7)
  assert.equal(dashboard.items.length, 3)
  assert.equal(dashboard.hiddenCount, 2)
  assert.deepEqual(dashboard.items.map((item) => item.id), ['safety', 'lifecycle', 'food'])
  assert.match(dashboard.items[0].description, /还有 3 项未确认/)
  assert.deepEqual(homeDashboard.buildTodayDashboard({}, '2026-08-18', now), { totalCount: 0, pendingItemCount: 0, hiddenCount: 0, items: [] })
})

test('七个创意工具都提供统一的快捷示例入口', () => {
  for (const toolId of ['where', 'lifecycle', 'quick-note', 'food', 'rotation', 'focus-one', 'split']) {
    const script = fs.readFileSync(path.join(root, 'pages', toolId, 'index.js'), 'utf8')
    const template = fs.readFileSync(path.join(root, 'pages', toolId, 'index.wxml'), 'utf8')
    assert.match(script, /fillExample\(\)/, `${toolId} 缺少 fillExample`)
    assert.match(template, /bindtap="fillExample"/, `${toolId} 缺少示例入口`)
    assert.match(template, /试试示例/, `${toolId} 缺少统一文案`)
  }
})

test('首页我的常用最多展示四个收藏工具', () => {
  const source = fs.readFileSync(path.join(root, 'pages', 'home', 'index.js'), 'utf8')
  assert.match(source, /favoriteIds\.slice\(0, 4\)/)
  assert.match(source, /buildFavoriteTools/)
  assert.match(source, /getRecentTools\(\)\.slice\(0, 4\)/, '首页最近使用只应展示前 4 条')
  const recentSource = fs.readFileSync(path.join(root, 'pages', 'recent', 'index.js'), 'utf8')
  assert.match(recentSource, /getRecentTools\(\)/, '最近使用页应读取完整记录')
  assert.equal(/getRecentTools\(\)\.slice\(/.test(recentSource), false, '最近使用页不应截断 12 条记录')
})

test('随机清单去重并可稳定分成数量均衡的小组', () => {
  const options = randomUtils.parseOptions('小浦\n阿明\n\n小浦\n小林\n小周\n小陈')
  assert.deepEqual(options, ['小浦', '阿明', '小林', '小周', '小陈'])
  const groups = randomUtils.groupOptions(options, 2, () => 0.5)
  assert.deepEqual(groups.map((items) => items.length), [3, 2])
  assert.deepEqual(groups.flat().slice().sort(), options.slice().sort())
  assert.deepEqual(randomUtils.groupOptions(options, 6, () => 0.5), [])
})

test('匿名分析按事件白名单过滤字段并拦截用户文本', () => {
  assert.deepEqual(analytics.sanitizeData(analytics.EVENT_IDS.TOOL_ACTION, {
    tool_id: 'text',
    action_id: 'dedupe-lines',
    result: 'success',
    private_text: '绝不能上传这段用户原文',
    count: 2
  }), {
    tool_id: 'text',
    action_id: 'dedupe-lines',
    result: 'success'
  })
  assert.deepEqual(analytics.sanitizeData('unknown_event', {
    private_text: '绝不能上传这段用户原文'
  }), {})
})

test('匿名分析只上报四个已定义事件及其约定属性', () => {
  assert.deepEqual(analytics.EVENT_FIELDS, {
    pugo_tool_open: ['tool_id'],
    pugo_tool_action: ['tool_id', 'action_id', 'result'],
    pugo_copy_result: ['tool_id'],
    pugo_favorite: ['tool_id', 'state']
  })

  let captured
  global.wx = {
    reportEvent(eventId, data) { captured = { eventId, data } }
  }
  assert.equal(analytics.report(analytics.EVENT_IDS.TOOL_OPEN, {
    tool_id: 'text',
    private_text: '不能上报'
  }), true)
  assert.deepEqual(captured, {
    eventId: 'pugo_tool_open',
    data: { tool_id: 'text' }
  })
  assert.equal(analytics.report('unknown_event', { tool_id: 'text' }), false)
})

test('敏感周期工具统一拒绝打开、操作、复制与收藏等全部匿名事件', () => {
  const captured = []
  global.wx = {
    reportEvent(eventId, data) { captured.push({ eventId, data }) }
  }
  assert.ok(analytics.SENSITIVE_TOOL_IDS.includes('period'))
  assert.ok(analytics.SENSITIVE_TOOL_IDS.includes('cosmetics'))
  assert.ok(analytics.SENSITIVE_TOOL_IDS.includes('photo-bg'))
  assert.equal(analytics.isSensitiveTool('period'), true)
  assert.deepEqual(analytics.sanitizeData(analytics.EVENT_IDS.TOOL_ACTION, {
    tool_id: 'period', action_id: 'add_record', result: 'success'
  }), {})
  assert.equal(analytics.trackToolOpen('period'), false)
  assert.equal(analytics.trackToolAction('period', 'add_record', 'success'), false)
  assert.equal(analytics.trackToolAction('cosmetics', 'compare', 'success'), false)
  assert.equal(analytics.trackToolAction('photo-bg', 'segment', 'success'), false)
  assert.equal(analytics.trackCopy('period'), false)
  assert.equal(analytics.trackFavorite('period', true), false)
  assert.equal(analytics.report(analytics.EVENT_IDS.TOOL_OPEN, { tool_id: 'period' }), false)
  assert.deepEqual(captured, [])
  assert.equal(analytics.trackToolOpen('text'), true, '非敏感工具仍应正常上报')
  assert.equal(captured.length, 1)
})

test('清空全部覆盖现用键和旧 AI 额度键，并在部分删除失败时返回失败', () => {
  const removed = []
  global.wx = {
    removeStorageSync(key) {
      removed.push(key)
      if (key === storage.KEYS.periodRecords) throw new Error('mock remove failed')
    }
  }
  assert.ok(storage.LEGACY_KEYS.includes('pugo_ai_daily_usage'))
  assert.equal(storage.clearAppData(), false)
  const expected = Array.from(new Set(Object.values(storage.KEYS).concat(storage.LEGACY_KEYS)))
  assert.deepEqual(removed.slice().sort(), expected.slice().sort(), '即使中途失败也应尝试清除每一个键')
  assert.ok(removed.includes('pugo_ai_daily_usage'))

  global.wx = { removeStorageSync() {} }
  assert.equal(storage.clearAppData(), true)
})

test('周期与 Steam 页面在存储失败时保留原状态并提示失败', () => {
  const originalSet = storage.set
  const originalRemove = storage.remove
  const toasts = []
  global.wx = {
    showToast(options) { toasts.push(options) },
    showModal(options) { options.success({ confirm: true }) },
    reportEvent() {}
  }
  storage.set = () => false
  storage.remove = () => false
  try {
    const periodModule = loadPageModule('../pages/period/index')
    const periodPage = makePageInstance(periodModule.definition)
    periodPage.records = [{ date: '2026-08-01', duration: 5 }]
    periodPage.data.selectedDate = '2026-09-01'
    periodPage.data.duration = '5'
    periodPage.addRecord()
    assert.deepEqual(periodPage.records, [{ date: '2026-08-01', duration: 5 }])
    assert.equal(periodPage.data.selectedDate, '2026-09-01')
    periodPage.removeRecord({ currentTarget: { dataset: { date: '2026-08-01' } } })
    assert.equal(periodPage.records.length, 1)
    periodPage.clearRecords()
    assert.equal(periodPage.records.length, 1)

    const steamModule = loadPageModule('../pages/steam-radar/index')
    const steamPage = makePageInstance(steamModule.definition)
    steamPage.records = [{
      id: 'old', name: '已有游戏', endDate: '2026-12-31', type: 'keep', claimed: false, createdAt: 1
    }]
    steamPage.data.name = '新游戏'
    steamPage.data.endDate = '2027-01-01'
    steamPage.addRecord()
    assert.deepEqual(steamPage.records.map((item) => item.id), ['old'])
    assert.equal(steamPage.data.name, '新游戏')
    steamPage.toggleClaimed({ currentTarget: { dataset: { id: 'old' } } })
    assert.equal(steamPage.records[0].claimed, false)
    steamPage.removeRecord({ currentTarget: { dataset: { id: 'old' } } })
    assert.equal(steamPage.records.length, 1)
    assert.ok(toasts.filter((item) => item.icon === 'none').length >= 6)
  } finally {
    storage.set = originalSet
    storage.remove = originalRemove
  }
})

test('设置页聚合所有清理结果，任一失败时显示未完成', () => {
  const originalRemove = storage.remove
  const removed = []
  storage.remove = (key) => {
    removed.push(key)
    return key !== storage.KEYS.periodRecords
  }
  const toasts = []
  global.wx = {
    getStorageSync() { return '' },
    showModal(options) { options.success({ confirm: true }) },
    showToast(options) { toasts.push(options) }
  }
  try {
    const settingsModule = loadPageModule('../pages/settings/index')
    assert.equal(settingsModule.exported.removeAll([
      storage.KEYS.periodRecords,
      storage.KEYS.steamWatchRecords
    ]), false)
    assert.deepEqual(removed, [storage.KEYS.periodRecords, storage.KEYS.steamWatchRecords])
    const settingsPage = makePageInstance(settingsModule.definition)
    settingsPage.confirmAction('测试清理', '测试', () => false)
    assert.deepEqual(toasts.pop(), { title: '清理未完成，请重试', icon: 'none' })
  } finally {
    storage.remove = originalRemove
  }
})

test('每个已注册工具都具备分享、打开埋点和最近使用源码契约', () => {
  const toolRegistry = require('../utils/tools')
  for (const tool of toolRegistry.TOOL_DEFINITIONS) {
    const relativePage = tool.path.replace(/^\//, '')
    const source = fs.readFileSync(path.join(root, `${relativePage}.js`), 'utf8')
    assert.match(source, /onShareAppMessage\s*\(\s*\)/, `${tool.id} 缺少分享入口`)
    assert.match(source, new RegExp(`analytics\\.trackToolOpen\\(\\s*['\"]${tool.id}['\"]\\s*\\)`), `${tool.id} 缺少打开埋点`)
    assert.match(source, new RegExp(`[A-Za-z_$][\\w$]*\\.recordRecent\\(\\s*['\"]${tool.id}['\"]\\s*\\)`), `${tool.id} 缺少最近使用记录`)
    assert.match(source, new RegExp(`path:\\s*['\"]${tool.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['\"]`), `${tool.id} 分享路径与注册路径不一致`)
  }

  for (const pageId of ['home', 'favorites', 'recent']) {
    const source = fs.readFileSync(path.join(root, 'pages', pageId, 'index.js'), 'utf8')
    assert.equal(source.includes('trackToolOpen'), false, `${pageId} 不应在跳转前重复上报工具打开`)
  }
})

test('本地收藏、最近使用和设置形成持久化闭环', () => {
  const memory = new Map()
  global.wx = {
    getStorageSync(key) { return memory.has(key) ? memory.get(key) : '' },
    setStorageSync(key, value) { memory.set(key, value) },
    removeStorageSync(key) { memory.delete(key) }
  }

  const tools = require('../utils/tools')
  assert.deepEqual(tools.searchTools('公斤').map((item) => item.id), ['convert'])
  assert.deepEqual(tools.searchTools('AI 校对').map((item) => item.id), [])
  assert.deepEqual(tools.searchTools('抽签').map((item) => item.id), ['random'])
  assert.deepEqual(tools.searchTools('折后价').map((item) => item.id), [])
  assert.deepEqual(tools.searchTools('公积金 月缴').map((item) => item.id), ['housing-fund'])
  assert.deepEqual(tools.searchTools('退休 养老金').map((item) => item.id), ['retirement'])
  assert.deepEqual(tools.searchTools('宠物 狗').map((item) => item.id), ['pet-age'])
  assert.deepEqual(tools.searchTools('驾照 12123').map((item) => item.id), ['license-cycle'])
  assert.deepEqual(tools.searchTools('图片 压缩').map((item) => item.id), ['image-compress'])
  assert.deepEqual(tools.searchTools('证件照 换底').map((item) => item.id), ['photo-bg'])
  assert.deepEqual(tools.searchTools('成分 对比').map((item) => item.id), ['cosmetics'])
  assert.deepEqual(tools.searchTools('姨妈 周期').map((item) => item.id), ['period'])
  assert.deepEqual(tools.searchTools('Steam 限免').map((item) => item.id), ['steam-radar'])
  assert.deepEqual(tools.searchTools('报销 大写').map((item) => item.id), ['money'])
  assert.deepEqual(tools.searchTools('出门 燃气').map((item) => item.id), ['safety'])
  assert.deepEqual(tools.searchTools('工具 找东西').map((item) => item.id), ['where'])
  assert.deepEqual(tools.searchTools('牙刷 到期').map((item) => item.id), ['lifecycle'])
  assert.deepEqual(tools.searchTools('AA 运费').map((item) => item.id), ['split'])
  assert.deepEqual(tools.searchTools('木鱼 解压').map((item) => item.id), ['woodfish'])
  assert.deepEqual(tools.searchTools('番茄钟 叶子').map((item) => item.id), ['grow-focus'])
  assert.ok(tools.TOOL_CATEGORIES.length >= 6)
  assert.ok(tools.TOOL_CATEGORIES.some((item) => item.id === 'women'))
  assert.ok(tools.TOOL_CATEGORIES.some((item) => item.id === 'men'))
  memory.set(storage.KEYS.favorites, ['calculate'])
  assert.deepEqual(tools.getFavorites(), ['calculate'])
  assert.equal(tools.getFavoriteTools()[0].id, 'calculate')
  assert.notEqual(tools.getFavoriteTools()[0].id, 'housing-fund', '旧 calculate 收藏不得映射到公积金')
  memory.set(storage.KEYS.recent, ['calculate'])
  assert.deepEqual(tools.getRecentTools().map((item) => item.id), ['calculate'])
  memory.set(storage.KEYS.favorites, [])
  memory.set(storage.KEYS.recent, [])
  assert.deepEqual(tools.getFavorites(), [])
  assert.deepEqual(tools.toggleFavorite('text'), ['text'])
  assert.equal(tools.getFavoriteTools()[0].name, '文本处理')
  tools.recordRecent('text')
  tools.recordRecent('date')
  tools.recordRecent('text')
  assert.deepEqual(tools.getRecentTools().map((item) => item.id), ['text', 'date'])
  tools.clearRecent()
  tools.TOOL_DEFINITIONS.slice(0, 15).forEach((tool) => tools.recordRecent(tool.id))
  assert.equal(tools.getRecentTools().length, 12, '最近使用应保留最多 12 条')
  assert.equal(tools.getRecentTools()[0].id, tools.TOOL_DEFINITIONS[14].id)
  assert.equal(tools.updateSettings({ vibration: false }).vibration, false)
})

test('功德木鱼按天累计并可只清空今天', () => {
  let stats = entertainment.addWoodfishHit({}, '2026-08-18')
  stats = entertainment.addWoodfishHit(stats, '2026-08-18', 2)
  stats = entertainment.addWoodfishHit(stats, '2026-08-17', 4)
  assert.equal(stats.total, 7)
  assert.equal(stats.days['2026-08-18'], 3)
  stats = entertainment.clearWoodfishToday(stats, '2026-08-18')
  assert.equal(stats.total, 4)
  assert.equal(stats.days['2026-08-18'], undefined)
})

test('今日摸鱼使用时间戳恢复并汇总当日和本周', () => {
  const startAt = new Date(2026, 7, 18, 9, 0, 0).getTime()
  const endAt = startAt + 5 * 60000
  let state = entertainment.startMoyu({}, '喝水', startAt)
  assert.equal(entertainment.moyuSummary(state, startAt + 12000).activeDurationMs, 12000)
  const finished = entertainment.finishMoyu(state, endAt)
  state = finished.state
  assert.equal(finished.record.durationMs, 5 * 60000)
  assert.equal(entertainment.moyuSummary(state, endAt).todayMs, 5 * 60000)
  assert.equal(entertainment.formatClock(3723000), '01:02:03')
})

test('每天值多少按使用日计算并给出目标日期', () => {
  const result = entertainment.calculateDailyValue('手机', 90, '2026-08-10', 3, '2026-08-18')
  assert.equal(result.usedDays, 9)
  assert.equal(result.dailyValue, 10)
  assert.equal(result.remainingDays, 21)
  assert.equal(result.targetDate, '2026-09-08')
  assert.equal(entertainment.calculateDailyValue('手机', 90, '2026-08-20', 3, '2026-08-18'), null)
})

test('成长番茄钟按结束时间恢复并生成七天叶片统计', () => {
  const now = new Date(2026, 7, 18, 9, 0, 0).getTime()
  let state = entertainment.startFocus({}, 'short', now)
  assert.equal(entertainment.focusRemaining(state, now + 6000), 1494)
  state = entertainment.pauseFocus(state, now + 6000)
  assert.equal(state.remainingSeconds, 1494)
  let history = entertainment.addFocusCompletion([], 'short', now)
  history = entertainment.addFocusCompletion(history, 'short', now + 60000)
  const summary = entertainment.focusWeekSummary(history, now + 60000)
  assert.equal(summary.today.count, 2)
  assert.equal(summary.today.minutes, 50)
  assert.equal(summary.week.length, 7)
})

test('app.json 中每个页面都具备四件套', () => {
  const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))
  appConfig.pages.forEach((pagePath) => {
    for (const extension of ['.js', '.json', '.wxml', '.wxss']) {
      assert.ok(fs.existsSync(path.join(root, `${pagePath}${extension}`)), `${pagePath}${extension} 不存在`)
    }
  })
})

test('工具注册遵守动态契约且每个分类至少包含一个可达工具', () => {
  const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))
  const registry = require('../utils/tools')
  const categories = registry.TOOL_CATEGORIES
  const definitions = registry.TOOL_DEFINITIONS
  const categoryIds = categories.map((item) => item.id)
  const toolIds = definitions.map((item) => item.id)
  const toolPaths = definitions.map((item) => item.path)

  assert.ok(categories.length > 0, '至少需要一个工具分类')
  assert.equal(new Set(categoryIds).size, categoryIds.length, '分类 ID 必须唯一')
  assert.equal(new Set(toolIds).size, toolIds.length, '工具 ID 必须唯一')
  assert.equal(new Set(toolPaths).size, toolPaths.length, '工具路径必须唯一')

  categories.forEach((category) => {
    assert.match(category.id || '', /^[a-z][a-z0-9-]*$/, '分类 ID 只允许小写字母、数字和连字符')
    assert.ok(String(category.name || '').trim(), `${category.id} 缺少分类名称`)
    assert.ok(String(category.description || '').trim(), `${category.id} 缺少分类说明`)
    assert.ok(definitions.some((tool) => tool.category === category.id), `${category.id} 分类没有任何工具`)
  })

  definitions.forEach((tool) => {
    assert.match(tool.id || '', /^[a-z][a-z0-9-]*$/, '工具 ID 只允许小写字母、数字和连字符')
    assert.ok(String(tool.name || '').trim(), `${tool.id} 缺少名称`)
    assert.ok(String(tool.description || '').trim(), `${tool.id} 缺少功能说明`)
    assert.ok(String(tool.keywords || '').trim(), `${tool.id} 缺少搜索关键词`)
    assert.ok(String(tool.symbol || '').trim(), `${tool.id} 缺少图标文字`)
    assert.ok(categoryIds.includes(tool.category), `${tool.id} 引用了不存在的分类 ${tool.category}`)
    assert.match(tool.path || '', /^\/pages\/[a-z0-9-]+\/index$/, `${tool.id} 路径格式不正确`)
    const registeredPath = tool.path.replace(/^\//, '')
    assert.ok(appConfig.pages.includes(registeredPath), `${tool.id} 的路径未写入 app.json`)
    for (const extension of ['.js', '.json', '.wxml', '.wxss']) {
      assert.ok(fs.existsSync(path.join(root, `${registeredPath}${extension}`)), `${tool.id} 缺少页面${extension}`)
    }
  })

  const requiredFeatureToolIds = [
    'housing-fund', 'retirement', 'pet-age', 'license-cycle',
    'image-compress', 'photo-bg', 'cosmetics', 'period', 'steam-radar'
  ]
  requiredFeatureToolIds.forEach((id) => assert.ok(registry.getToolById(id), `特色工具 ${id} 尚未注册`))
  assert.equal(definitions.length, 31, '1.4.0 抽屉应注册 31 个公开工具')
  assert.equal(definitions.some((tool) => tool.id === 'calculate'), false, '旧百分比计算器不应出现在 31 工具抽屉')
  const legacyCalculator = registry.getToolById('calculate')
  assert.equal(legacyCalculator && legacyCalculator.id, 'calculate', '旧收藏与最近使用仍应可解析 calculate')
  assert.equal(legacyCalculator && legacyCalculator.path, '/pages/calculate/index')
  assert.equal(appConfig.pages.includes('pages/calculate/index'), true, 'app.json 应保留 calculate 隐藏兼容路径')
})

test('关于页提供 GitHub 与公众号宣传入口并保留受限场景降级', () => {
  const config = require('../utils/app-config')
  const aboutScript = fs.readFileSync(path.join(root, 'pages', 'about', 'index.js'), 'utf8')
  const aboutTemplate = fs.readFileSync(path.join(root, 'pages', 'about', 'index.wxml'), 'utf8')

  assert.equal(config.githubUsername, 'QAQgpnu')
  assert.equal(config.githubUrl, 'https://github.com/QAQgpnu/pugo-toolbox')
  assert.equal(config.officialAccountName, '浦哥随笔')
  assert.match(aboutScript, /wx\.setClipboardData/)
  assert.match(aboutScript, /wx\.getLaunchOptionsSync/)
  for (const scene of ['1011', '1038', '1047', '1089', '1124']) {
    assert.match(aboutScript, new RegExp(`\\b${scene}\\b`), `公众号组件缺少场景 ${scene}`)
  }
  assert.match(aboutTemplate, /bindtap="copyGithubUrl"/)
  assert.match(aboutTemplate, /bindtap="copyOfficialAccountName"/)
  assert.match(aboutTemplate, /<official-account\b/)
  assert.match(aboutTemplate, /bindload="onOfficialAccountLoad"/)
  assert.match(aboutTemplate, /binderror="onOfficialAccountError"/)
  assert.doesNotMatch(aboutTemplate, /<web-view\b/)
  assert.doesNotMatch(aboutScript, /wx\.request\s*\(/)
})

test('页面 JSON 不包含当前开发者工具判定为无效的分享字段', () => {
  walk(path.join(root, 'pages'), '.json').forEach((file) => {
    const config = JSON.parse(fs.readFileSync(file, 'utf8'))
    assert.equal(config.enableShareAppMessage, undefined, `${file} 不应配置 enableShareAppMessage`)
  })
})

test('Markdown 中的本地相对链接均指向现有文件', () => {
  walk(root, '.md').forEach((file) => {
    const source = fs.readFileSync(file, 'utf8')
    for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].trim()
      if (!target || /^(?:https?:|mailto:|#)/i.test(target)) continue
      const relativePath = decodeURIComponent(target.split('#')[0])
      assert.ok(fs.existsSync(path.resolve(path.dirname(file), relativePath)), `${file} 的链接不存在：${target}`)
    }
  })
})

test('所有 JSON 与 JavaScript 文件可解析', () => {
  walk(root, '.json').forEach((file) => JSON.parse(fs.readFileSync(file, 'utf8')))
  walk(root, '.js').forEach((file) => {
    if (file === __filename) return
    new vm.Script(fs.readFileSync(file, 'utf8'), { filename: file })
  })
})

test('WXML 标签闭合且模板表达式不调用 JavaScript 方法', () => {
  walk(root, '.wxml').forEach((file) => {
    const source = fs.readFileSync(file, 'utf8')
    assert.equal(/\{\{[^}]*\.[A-Za-z_$][\w$]*\s*\(/.test(source), false, `${file} 含方法调用`)
    const stack = []
    const tagPattern = /<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*?)?\s*\/?>/g
    for (const match of source.matchAll(tagPattern)) {
      const tag = match[0]
      if (/^<\//.test(tag)) {
        const name = tag.match(/^<\/([A-Za-z][A-Za-z0-9-]*)/)[1]
        assert.equal(stack.pop(), name, `${file} 的 ${name} 标签闭合顺序错误`)
      } else if (!/\/>$/.test(tag)) {
        stack.push(tag.match(/^<([A-Za-z][A-Za-z0-9-]*)/)[1])
      }
    }
    assert.deepEqual(stack, [], `${file} 存在未闭合标签`)
  })
})

test('WXSS 遵守安卓与鸿蒙兼容布局契约', () => {
  const wxssFiles = walk(root, '.wxss')
  wxssFiles.forEach((file) => {
    const source = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    assert.equal(/\b(?:row-|column-)?gap\s*:/i.test(source), false, `${file} 不应使用 gap 系列属性`)
    assert.equal(/display\s*:\s*(?:inline-)?grid\b/i.test(source), false, `${file} 不应使用 CSS Grid`)
    assert.equal(/\bgrid-(?:template|auto|column|row|area)\b/i.test(source), false, `${file} 不应使用 Grid 布局属性`)

    const blockPattern = /([^{}]+)\{([^{}]*)\}/g
    for (const match of source.matchAll(blockPattern)) {
      const selector = match[1].trim().replace(/\s+/g, ' ')
      const declarations = match[2]
      if (!/display\s*:\s*(?:inline-)?flex\b/i.test(declarations)) continue
      assert.match(declarations, /flex-direction\s*:\s*(?:row|row-reverse|column|column-reverse)\b/i, `${file} 的 ${selector} 使用 flex 时必须显式声明 flex-direction`)
    }
  })

  const componentStyles = walk(path.join(root, 'components'), '.wxss')
  assert.ok(componentStyles.some((file) => file.endsWith(path.join('bottom-nav', 'index.wxss'))), '应覆盖底部抽屉组件样式')
  const nativeTags = '(?:view|text|image|button|input|textarea|scroll-view|swiper|swiper-item|canvas|picker|switch|navigator)'
  componentStyles.forEach((file) => {
    const source = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const selectorPattern = /([^{}]+)\{/g
    for (const match of source.matchAll(selectorPattern)) {
      const selector = match[1].trim()
      if (!selector || selector.startsWith('@') || /^(?:from|to|\d+%)$/.test(selector)) continue
      assert.equal(/#[A-Za-z_-][\w-]*/.test(selector), false, `${file} 组件样式不应使用 ID 选择器：${selector}`)
      assert.equal(/\[[^\]]+\]/.test(selector), false, `${file} 组件样式不应使用属性选择器：${selector}`)
      assert.equal(new RegExp(`(^|[\\s>+~,])${nativeTags}(?=$|[\\s>+~,.#:\\[])`).test(selector), false, `${file} 组件样式不应使用元素选择器：${selector}`)
    }
  })

  const homeStyles = fs.readFileSync(path.join(root, 'pages', 'home', 'index.wxss'), 'utf8')
  assert.equal(/calc\([^)]*%[^)]*rpx|calc\([^)]*rpx[^)]*%/i.test(homeStyles), false, '首页关键布局不应混用百分比与 rpx 的 calc')
})

test('1.4.0 客户端不含登录、直连密钥或生成式 AI 调用', () => {
  const testsDirectory = path.join(root, 'tests') + path.sep
  const cloudDirectory = path.join(root, 'cloudfunctions') + path.sep
  const source = walk(root, '.js')
    .filter((file) => !file.startsWith(testsDirectory) && !file.startsWith(cloudDirectory))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n')
  for (const forbidden of [
    /wx\.login\b/, /wx\.request\b/, /wx\.uploadFile\b/, /wx\.downloadFile\b/,
    /AppSecret\b/i, /API_KEY\b/, /apiKey\b/, /secretKey\b/, /accessToken\b/,
    /Bearer\s+[A-Za-z0-9._-]+/, /\bsk-[A-Za-z0-9_-]{12,}/
  ]) {
    assert.equal(forbidden.test(source), false, `发现不应出现的 ${forbidden}`)
  }
  for (const forbiddenAi of [
    /wx\.cloud\.extend\.AI\b/, /createModel\s*\(/, /chat\.completions\b/,
    /deepseek\b/i, /stable[-_ ]?diffusion\b/i, /text[-_ ]?to[-_ ]?image\b/i
  ]) {
    assert.equal(forbiddenAi.test(source), false, `公开版不应包含 AI 深度合成调用 ${forbiddenAi}`)
  }
})

test('1.4.0 证件照客户端不依赖 BDA 策略、云函数或长期凭证', () => {
  const page = fs.readFileSync(path.join(root, 'pages', 'photo-bg', 'index.js'), 'utf8')
  const local = fs.readFileSync(path.join(root, 'utils', 'local-background.js'), 'utf8')
  assert.match(page, /local-background/)
  assert.match(local, /createConnectedMask/)
  assert.doesNotMatch(`${page}\n${local}`, /name\/bda|SegmentPortraitPic|TENCENTCLOUD|SecretKey|wx\.cloud/)
  assert.equal(fs.existsSync(path.join(root, 'docs', 'cam-policy-image-vision-bda-1.4.0.json')), false)
})

test('公开仓库不包含正式账号、云环境或停用云函数', () => {
  const project = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'))
  const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8')
  const appConfigSource = fs.readFileSync(path.join(root, 'utils', 'app-config.js'), 'utf8')
  assert.equal(project.appid, 'touristappid')
  assert.equal(Object.prototype.hasOwnProperty.call(project, 'cloudfunctionRoot'), false)
  assert.equal(fs.existsSync(path.join(root, 'cloudfunctions')), false)
  assert.equal(fs.existsSync(path.join(root, 'cloudbaserc.json')), false)
  assert.doesNotMatch(appSource, /wx\.cloud|cloudEnvId/)
  assert.doesNotMatch(appConfigSource, /cloudEnvId|envId/)
})

test('媒体能力与隐私文案明确约定本机处理、相册选择和主动保存', () => {
  const privacySource = [
    fs.readFileSync(path.join(root, 'pages', 'privacy', 'index.wxml'), 'utf8'),
    fs.readFileSync(path.join(root, 'pages', 'image-compress', 'index.wxml'), 'utf8'),
    fs.readFileSync(path.join(root, 'pages', 'photo-bg', 'index.wxml'), 'utf8')
  ].join('\n')
  assert.match(privacySource, /本机|本地/)
  assert.match(privacySource, /相册|照片/)
  assert.match(privacySource, /主动保存|保存到相册/)
  assert.match(privacySource, /不上传|不会发送到服务器/)
  assert.match(privacySource, /OPENID/)
  assert.match(privacySource, /不读取 OPENID/)
  assert.match(privacySource, /边缘连通/)

  const privacyMatrix = fs.readFileSync(path.join(root, 'docs', 'privacy-boundary.md'), 'utf8')
  assert.match(privacyMatrix, /不调用 `imageVision`、BDA、COS/)
  assert.match(privacyMatrix, /不读取 OPENID/)

  for (const id of ['image-compress', 'photo-bg']) {
    const source = fs.readFileSync(path.join(root, 'pages', id, 'index.js'), 'utf8')
    assert.match(source, /wx\.chooseMedia\s*\(/, `${id} 应由用户主动选择图片`)
    assert.match(source, /wx\.saveImageToPhotosAlbum\s*\(/, `${id} 应只在用户主动操作时保存到相册`)
    assert.equal(/wx\.(?:request|uploadFile|downloadFile)\s*\(/.test(source), false, `${id} 不应上传或下载图片`)
  }
})

test('底部导航精简为三栏，收藏与最近使用改由首页查看全部进入', () => {
  const navSource = fs.readFileSync(path.join(root, 'components', 'bottom-nav', 'index.js'), 'utf8')
  const navTemplate = fs.readFileSync(path.join(root, 'components', 'bottom-nav', 'index.wxml'), 'utf8')
  assert.match(navSource, /home:\s*'\/pages\/home\/index'/)
  assert.match(navSource, /settings:\s*'\/pages\/settings\/index'/)
  assert.equal(/\/pages\/(?:favorites|recent)\//.test(navSource), false, '底部导航脚本不应保留收藏与最近使用跳转')
  assert.equal(/data-page="(?:favorites|recent)"/.test(navTemplate), false, '底部导航模板不应保留收藏与最近使用入口')
  assert.match(navTemplate, /nav-item--create/, '中央加工具入口必须保留并突出')
  assert.match(navTemplate, /openDrawer/, '中央加号应继续打开工具抽屉')

  const homeSource = fs.readFileSync(path.join(root, 'pages', 'home', 'index.js'), 'utf8')
  const homeTemplate = fs.readFileSync(path.join(root, 'pages', 'home', 'index.wxml'), 'utf8')
  assert.match(homeSource, /goFavorites\s*\(/, '首页应提供查看全部收藏入口')
  assert.match(homeSource, /\/pages\/favorites\/index/)
  assert.match(homeSource, /goRecent\s*\(/, '首页应提供查看全部最近使用入口')
  assert.match(homeSource, /\/pages\/recent\/index/)
  assert.match(homeTemplate, /查看全部/)
  assert.match(homeTemplate, /bindtap="goFavorites"/)
  assert.match(homeTemplate, /bindtap="goRecent"/)
})

test('办公助手接管图片处理且不再保留单工具图片分类', () => {
  const registry = require('../utils/tools')
  const office = registry.TOOL_CATEGORIES.find((item) => item.id === 'office')
  assert.ok(office, '办公助手分类必须注册')
  assert.equal(office.name, '办公助手')
  assert.equal(registry.TOOL_CATEGORIES.some((item) => item.id === 'efficiency'), false, '效率处理分类应下线')
  for (const id of ['text', 'image-compress', 'photo-bg', 'money', 'convert', 'random', 'rotation']) {
    assert.equal(registry.getToolById(id).category, 'office', `${id} 应归入办公助手`)
  }
  for (const id of ['excel-formulas', 'excel-errors', 'table-cleaner', 'meeting-cost']) {
    const tool = registry.getToolById(id)
    assert.ok(tool, `新办公工具 ${id} 必须注册`)
    assert.equal(tool.category, 'office', `${id} 应归入办公助手`)
  }
  assert.equal(registry.TOOL_CATEGORIES.some((item) => item.id === 'image'), false, '单独图片工具分类应下线')
  assert.equal(registry.TOOL_CATEGORIES.length, 6, '合并图片工具后应为 6 个分类')
})

test('Excel 公式助手内置至少 40 个函数并覆盖六大分类', () => {
  assert.ok(excelData.FORMULA_LIBRARY.length >= 40, '第一版至少 40 个常用函数')
  assert.ok(excelData.FORMULA_CATEGORIES.length >= 6)
  excelData.FORMULA_LIBRARY.forEach((formula) => {
    assert.ok(formula.name && formula.usage && formula.syntax && formula.example, `${formula.name} 资料不完整`)
    const paramsFilled = Array.isArray(formula.params)
      ? formula.params.length > 0
      : String(formula.params || '').trim()
    assert.ok(paramsFilled, `${formula.name} 缺少参数解释`)
    const errorsFilled = Array.isArray(formula.errors)
      ? formula.errors.length > 0
      : String(formula.errors || '').trim()
    assert.ok(errorsFilled, `${formula.name} 缺少常见错误`)
    assert.ok(excelData.FORMULA_CATEGORIES.some((category) => category.id === formula.category), `${formula.name} 分类无效`)
  })
  const searched = excelData.searchFormulas('条件 求和', 'all')
  assert.ok(searched.some((formula) => formula.name === 'SUMIF'), '关键词搜索应命中 SUMIF')
  assert.ok(excelData.searchFormulas('', 'lookup').every((formula) => formula.category === 'lookup'))
  assert.equal(excelData.getFormulaByName('VLOOKUP').name, 'VLOOKUP')
  assert.equal(excelData.getFormulaByName('不存在的函数'), null)
})

test('公式向导按办公场景生成公式、解释并拒绝不完整输入', () => {
  assert.ok(excelData.WIZARD_SCENARIOS.length >= 6)
  const sumif = excelData.generateWizardFormula('sumif', {
    range: 'A2:A100', condition: '华东', sumRange: 'C2:C100'
  })
  assert.ok(sumif && sumif.formula.includes('SUMIF'), '条件求和应生成 SUMIF 公式')
  assert.ok(sumif.formula.includes('"华东"'), '文本条件应自动加引号')
  assert.ok(String(sumif.explanation).trim(), '生成结果必须带中文解释')

  const numeric = excelData.generateWizardFormula('sumif', {
    range: 'A2:A100', condition: '>100', sumRange: 'C2:C100'
  })
  assert.ok(numeric.formula.includes('>100'), '比较符条件不应被加引号')

  const vlookup = excelData.generateWizardFormula('vlookup', {
    lookupCell: 'A2', tableRange: 'D2:F100', columnIndex: '2'
  })
  assert.ok(vlookup.formula.includes('VLOOKUP'))

  assert.equal(excelData.generateWizardFormula('sumif', { range: 'A2:A100' }), null, '未填满字段不得生成公式')
  assert.equal(excelData.generateWizardFormula('不存在的场景', {}), null)
})

test('Excel 报错诊断至少覆盖 12 项常见问题并可搜索', () => {
  assert.ok(excelData.ERROR_GUIDES.length >= 12)
  excelData.ERROR_GUIDES.forEach((guide) => {
    assert.ok(guide.code && guide.title && guide.summary, `${guide.id} 基础信息不完整`)
    assert.ok(Array.isArray(guide.causes) && guide.causes.length > 0, `${guide.id} 缺少常见原因`)
    assert.ok(Array.isArray(guide.steps) && guide.steps.length > 0, `${guide.id} 缺少排查步骤`)
    assert.ok(String(guide.fixExample || '').trim(), `${guide.id} 缺少修复示例`)
    assert.ok(Array.isArray(guide.pitfalls) && guide.pitfalls.length > 0, `${guide.id} 缺少易犯错误`)
  })
  for (const code of ['#VALUE!', '#N/A', '#REF!', '#DIV/0!', '#NAME?', '#NUM!', '#SPILL!']) {
    assert.ok(excelData.ERROR_GUIDES.some((guide) => guide.code === code), `缺少 ${code} 诊断`)
  }
  assert.ok(excelData.searchErrors('vlookup', 'all').length > 0, '应能搜索到 VLOOKUP 查不到结果')
  assert.ok(excelData.searchErrors('', 'behavior').every((guide) => guide.category === 'behavior'))
  assert.equal(excelData.getErrorGuide('value').code, '#VALUE!')
})

test('表格文本整理支持 16 种操作、统计变化并守住长度上限', () => {
  assert.ok(tableCleaner.OPERATIONS.length >= 16)
  assert.equal(tableCleaner.MAX_INPUT_LENGTH, 20000)

  assert.equal(tableCleaner.runOperation('a\n\nb\n a ', 'remove-empty-lines').output, 'a\nb\n a ')
  assert.equal(tableCleaner.runOperation('A\nB\nA\n', 'dedupe').output, 'A\nB')
  assert.equal(tableCleaner.runOperation('项目10\n项目2', 'natural-sort').output, '项目2\n项目10')
  assert.equal(tableCleaner.runOperation('a\tb\nc\td', 'split-tabs').output, 'a\nb\nc\nd')
  assert.equal(tableCleaner.runOperation('a\nb\nc\nd', 'single-to-multi', { columns: 2 }).output, 'a\tb\nc\td')
  assert.equal(tableCleaner.runOperation('a\nb\nc', 'single-to-multi', { columns: 0 }), null)
  assert.equal(tableCleaner.runOperation('项目2 价格3.5元', 'extract-numbers').output, '2\n3.5')
  assert.equal(tableCleaner.runOperation('联系 test@example.com 和 TEST@example.com', 'extract-emails').output, 'test@example.com')
  assert.equal(tableCleaner.runOperation('张三 13812345678 编号 20240001', 'extract-phones').output, '13812345678')
  assert.equal(tableCleaner.runOperation('a\tb', 'to-csv').output, 'a,b')
  assert.equal(tableCleaner.runOperation('"甲,乙",丙', 'to-tsv').output, '甲,乙\t丙')
  assert.equal(
    tableCleaner.runOperation('=1+1\t+SUM(A1:A2)\t-1+2\t@SUM(A1:A2)', 'to-csv').output,
    "'=1+1,'+SUM(A1:A2),'-1+2,'@SUM(A1:A2)",
    'CSV 转换必须默认中和四类公式前缀'
  )
  assert.equal(
    tableCleaner.runOperation('"  =1+1","\u000b+SUM(A1:A2)","\ufeff-1+2"', 'to-tsv').output,
    "'=1+1\t'+SUM(A1:A2)\t'-1+2",
    'TSV 转换必须覆盖引号字段、前导空白、控制字符与 BOM'
  )
  assert.equal(
    tableCleaner.runOperation('=1\t安全\n普通\t@SUM(A1:A2)', 'to-csv').output,
    "'=1,安全\n普通,'@SUM(A1:A2)",
    '公式保护必须覆盖不同行列'
  )
  assert.equal(tableCleaner.runOperation("'=1+1\t普通", 'to-csv').output, "'=1+1,普通", '已中和值不得重复添加前缀')
  assert.equal(tableCleaner.runOperation('text=1\tuser@example.com', 'to-csv').output, 'text=1,user@example.com', '普通文本必须保持不变')
  assert.equal(tableCleaner.runOperation('+7\t-12.5', 'to-csv').output, "'+7,'-12.5", '有符号值默认按文本输出，避免公式解释')
  assert.equal(tableCleaner.runOperation('=1+1\n普通', 'remove-empty-lines').output, "'=1+1\n普通", '基础清理不得绕过公式保护')
  assert.equal(
    tableCleaner.runOperation('=1+1\n@SUM(A1:A2)', 'single-to-multi', { columns: 2 }).output,
    "'=1+1\t'@SUM(A1:A2)",
    '拆分与合并不得绕过公式保护'
  )
  assert.equal(tableCleaner.runOperation('+cmd@example.com', 'extract-emails').output, "'+cmd@example.com", '提取结果不得绕过公式保护')
  assert.equal(
    tableCleaner.runOperation('=SUM(A1:A2) 13812345678', 'mask-phones').output,
    "'=SUM(A1:A2) 138****5678",
    '脱敏结果不得绕过公式保护'
  )

  assert.equal(tableCleaner.runOperation('13812345678', 'mask-phones').output, '138****5678')
  assert.equal(tableCleaner.runOperation('test@example.com', 'mask-emails').output, 't***@example.com')
  assert.equal(tableCleaner.runOperation('110101199003074321', 'mask-idcards').output, '110101********4321')

  const stats = tableCleaner.runOperation('a\n\nb', 'remove-empty-lines')
  assert.deepEqual({ inputLines: stats.inputLines, outputLines: stats.outputLines }, { inputLines: 3, outputLines: 2 })
  assert.equal(tableCleaner.runOperation('x'.repeat(20001), 'dedupe'), null, '超长文本必须拒绝')
  assert.equal(tableCleaner.runOperation('   ', 'dedupe'), null, '空文本必须拒绝')
})

test('表格文本整理不进入匿名统计，敏感拦截在上报边界统一生效', () => {
  assert.ok(analytics.SENSITIVE_TOOL_IDS.includes('period'))
  assert.ok(analytics.SENSITIVE_TOOL_IDS.includes('table-cleaner'))
  assert.equal(analytics.trackToolOpen('table-cleaner'), false)
  assert.equal(analytics.trackToolAction('table-cleaner', 'run_operation', 'success'), false)
  assert.equal(analytics.trackCopy('table-cleaner'), false)
  const source = fs.readFileSync(path.join(root, 'pages', 'table-cleaner', 'index.js'), 'utf8')
  assert.match(source, /trackToolOpen\(\s*'table-cleaner'\s*\)/, '页面源码保留契约调用，由上报边界拦截')
})

test('会议成本按时薪月薪双口径折算并支持后台时间戳恢复', () => {
  assert.equal(meetingCost.hourlyRate({ payType: 'monthly', amount: 17400, workDaysPerMonth: 21.75, workHoursPerDay: 8 }), 100)
  assert.equal(meetingCost.hourlyRate({ payType: 'hourly', amount: 50 }), 50)
  assert.equal(meetingCost.hourlyRate({ payType: 'monthly', amount: 0, workDaysPerMonth: 21.75, workHoursPerDay: 8 }), null)
  assert.equal(meetingCost.hourlyRate({ payType: 'monthly', amount: 10000, workDaysPerMonth: 0, workHoursPerDay: 8 }), null)
  assert.equal(meetingCost.costFor(100, 5, 3600000), 500)
  assert.equal(meetingCost.formatClock(3723000), '01:02:03')

  const started = meetingCost.startSession(1000)
  const paused = meetingCost.pauseSession(started, 61000)
  assert.equal(paused.status, 'paused')
  assert.equal(meetingCost.currentDurationMs(paused, 999999), 60000, '暂停期间时长不应继续增长')
  const resumed = meetingCost.resumeSession(paused, 121000)
  assert.equal(resumed.status, 'running')
  const restored = meetingCost.normalizeSession(JSON.parse(JSON.stringify(resumed)))
  assert.equal(meetingCost.currentDurationMs(restored, 181000), 120000, '后台返回后必须按时间戳恢复')
  assert.equal(meetingCost.finishSession(restored, 181000), 120000)
})

test('会议记录最多保留 50 条并支持删除、撤回与本周统计', () => {
  const now = new Date(2026, 7, 19, 12, 0, 0).getTime()
  const record = meetingCost.normalizeRecord({
    id: 'meeting-1', startedAt: now - 3600000, endedAt: now, durationMs: 3600000, people: 3, rate: 100, cost: 300
  })
  assert.equal(record.cost, 300)
  assert.equal(meetingCost.normalizeRecord({ startedAt: now, endedAt: now - 1 }), null)

  let records = []
  for (let index = 0; index < 55; index += 1) {
    records = meetingCost.addRecord(records, {
      id: `meeting-${index}`,
      startedAt: now - index * 60000,
      endedAt: now - index * 60000 + 60000,
      durationMs: 60000,
      people: 2,
      rate: 100,
      cost: 200 / 60
    })
  }
  assert.equal(records.length, meetingCost.MAX_RECORDS, '最多保留 50 条会议记录')
  assert.equal(records[0].id, 'meeting-54', '最新记录应排在最前')
  assert.equal(records.some((item) => item.id === 'meeting-0'), false, '容量满时应丢弃最旧记录')

  const removed = meetingCost.removeRecord(records, 'meeting-54')
  assert.equal(removed.length, records.length - 1)
  const restored = meetingCost.addRecord(removed, records[0])
  assert.equal(restored.length, records.length, '撤回删除后记录应恢复')

  const oldRecord = {
    id: 'old-meeting', startedAt: now - 30 * 86400000, endedAt: now - 30 * 86400000 + 3600000,
    durationMs: 3600000, people: 2, rate: 100, cost: 200
  }
  const summary = meetingCost.weekSummary([record, oldRecord], now)
  assert.equal(summary.count, 1, '本周统计只应包含本周记录')
  assert.equal(summary.durationMs, 3600000)
  assert.equal(summary.cost, 300)
})

;(async () => {
  for (const item of asyncTests) {
    try {
      await item.run()
      passed += 1
      console.log(`✓ ${item.name}`)
    } catch (error) {
      failed += 1
      console.error(`✗ ${item.name}`)
      console.error(error.stack || error.message)
    }
  }
  console.log(`\n${passed} 项通过，${failed} 项失败。`)
  if (failed) process.exitCode = 1
})()
