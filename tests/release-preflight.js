const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const project = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'))
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const appConfig = require(path.join(root, 'utils', 'app-config'))
const analytics = require(path.join(root, 'utils', 'analytics'))
const converter = require(path.join(root, 'utils', 'converter'))
const textUtils = require(path.join(root, 'utils', 'text'))
const tools = require(path.join(root, 'utils', 'tools'))
const storage = require(path.join(root, 'utils', 'storage'))
const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))

const RELEASE_VERSION = '1.4.0'
const REQUIRED_FEATURE_TOOL_IDS = Object.freeze([
  'housing-fund', 'retirement', 'pet-age', 'license-cycle',
  'image-compress', 'photo-bg', 'photo-watermark', 'cosmetics', 'period', 'steam-radar',
  'excel-formulas', 'excel-errors', 'table-cleaner', 'meeting-cost'
])

const expectedAnalyticsFields = {
  pugo_tool_open: ['tool_id'],
  pugo_tool_action: ['tool_id', 'action_id', 'result'],
  pugo_copy_result: ['tool_id'],
  pugo_favorite: ['tool_id', 'state']
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

function validateVersionContract() {
  const errors = []
  if (packageJson.version !== RELEASE_VERSION) errors.push(`package.json 版本应为 ${RELEASE_VERSION}`)
  if (appConfig.version !== RELEASE_VERSION) errors.push(`utils/app-config.js 版本应为 ${RELEASE_VERSION}`)
  if (!String(project.projectname || '').includes(RELEASE_VERSION)) errors.push('projectname 未包含发布版本号')
  if (!String(project.description || '').includes(RELEASE_VERSION)) errors.push('project.config.json 描述未包含发布版本号')
  if (!/工具/.test(String(packageJson.description || '')) || !/工具/.test(String(project.description || ''))) {
    errors.push('package 与 project 描述没有共同指向工具箱产品')
  }
  if (/1\.2\.[01]|18\s*个|四分区/.test(`${project.description || ''}\n${packageJson.description || ''}`)) {
    errors.push('package 或 project 描述仍残留 1.2.x、18 个工具或四分区旧口径')
  }
  return errors
}

function validatePromotionContract() {
  const errors = []
  const aboutScript = fs.readFileSync(path.join(root, 'pages', 'about', 'index.js'), 'utf8')
  const aboutTemplate = fs.readFileSync(path.join(root, 'pages', 'about', 'index.wxml'), 'utf8')
  if (appConfig.githubUsername !== 'QAQgpnu') errors.push('GitHub 用户名不是已核对的 QAQgpnu')
  if (appConfig.githubUrl !== 'https://github.com/QAQgpnu/pugo-toolbox') errors.push('GitHub 仓库链接不一致')
  if (appConfig.officialAccountName !== '浦哥随笔') errors.push('公众号名称不一致')
  if (!/wx\.setClipboardData/.test(aboutScript)) errors.push('宣传入口缺少用户主动复制降级')
  if (!/wx\.getLaunchOptionsSync/.test(aboutScript)) errors.push('公众号组件未按启动场景判断')
  if (!/<official-account\b/.test(aboutTemplate)) errors.push('关于页缺少微信官方公众号组件')
  if (!/bindload="onOfficialAccountLoad"/.test(aboutTemplate) || !/binderror="onOfficialAccountError"/.test(aboutTemplate)) {
    errors.push('公众号组件缺少加载或失败反馈')
  }
  if (/<web-view\b/.test(aboutTemplate) || /wx\.request\s*\(/.test(aboutScript)) {
    errors.push('宣传入口不应通过 web-view 或网络请求绕过平台能力')
  }
  return errors
}

function validateRegistryContract() {
  const errors = []
  const categoryIds = tools.TOOL_CATEGORIES.map((item) => item.id)
  const toolIds = tools.TOOL_DEFINITIONS.map((item) => item.id)
  const toolPaths = tools.TOOL_DEFINITIONS.map((item) => item.path)
  if (!categoryIds.length) errors.push('没有工具分类')
  if (new Set(categoryIds).size !== categoryIds.length) errors.push('分类 ID 重复')
  if (new Set(toolIds).size !== toolIds.length) errors.push('工具 ID 重复')
  if (new Set(toolPaths).size !== toolPaths.length) errors.push('工具路径重复')

  tools.TOOL_CATEGORIES.forEach((category) => {
    if (!/^[a-z][a-z0-9-]*$/.test(category.id || '')) errors.push(`分类 ID 不合规：${category.id}`)
    if (!String(category.name || '').trim()) errors.push(`${category.id} 缺少名称`)
    if (!String(category.description || '').trim()) errors.push(`${category.id} 缺少说明`)
    if (!tools.TOOL_DEFINITIONS.some((tool) => tool.category === category.id)) errors.push(`${category.id} 分类为空`)
  })

  tools.TOOL_DEFINITIONS.forEach((tool) => {
    if (!/^[a-z][a-z0-9-]*$/.test(tool.id || '')) errors.push(`工具 ID 不合规：${tool.id}`)
    for (const field of ['name', 'description', 'keywords', 'symbol']) {
      if (!String(tool[field] || '').trim()) errors.push(`${tool.id} 缺少 ${field}`)
    }
    if (!categoryIds.includes(tool.category)) errors.push(`${tool.id} 的分类不存在：${tool.category}`)
    if (!/^\/pages\/[a-z0-9-]+\/index$/.test(tool.path || '')) errors.push(`${tool.id} 路径格式不正确`)
    const registeredPath = String(tool.path || '').replace(/^\//, '')
    if (!appJson.pages.includes(registeredPath)) errors.push(`${tool.id} 未写入 app.json`)
    for (const extension of ['.js', '.json', '.wxml', '.wxss']) {
      if (!fs.existsSync(path.join(root, `${registeredPath}${extension}`))) errors.push(`${tool.id} 缺少页面${extension}`)
    }
  })

  appJson.pages.forEach((pagePath) => {
    for (const extension of ['.js', '.json', '.wxml', '.wxss']) {
      if (!fs.existsSync(path.join(root, `${pagePath}${extension}`))) errors.push(`${pagePath}${extension} 不存在`)
    }
  })

  REQUIRED_FEATURE_TOOL_IDS.forEach((id) => {
    if (!tools.getToolById(id)) errors.push(`特色工具 ${id} 尚未注册`)
  })
  if (tools.TOOL_DEFINITIONS.length !== 31) errors.push('1.4.0 抽屉公开工具数应为 31')
  if (tools.TOOL_DEFINITIONS.some((tool) => tool.id === 'calculate')) errors.push('旧 calculate 不应出现在 31 工具抽屉')
  const legacyCalculator = tools.getToolById('calculate')
  if (!legacyCalculator || legacyCalculator.path !== '/pages/calculate/index') errors.push('旧 calculate 收藏与最近使用无法解析')
  if (!appJson.pages.includes('pages/calculate/index')) errors.push('app.json 未保留 calculate 隐藏兼容路径')
  return errors
}

function validatePageSourceContracts() {
  const errors = []
  tools.TOOL_DEFINITIONS.forEach((tool) => {
    const scriptPath = path.join(root, `${tool.path.replace(/^\//, '')}.js`)
    if (!fs.existsSync(scriptPath)) return
    const source = fs.readFileSync(scriptPath, 'utf8')
    if (!/onShareAppMessage\s*\(\s*\)/.test(source)) errors.push(`${tool.id} 缺少分享入口`)
    if (!new RegExp(`analytics\\.trackToolOpen\\(\\s*['\"]${tool.id}['\"]\\s*\\)`).test(source)) errors.push(`${tool.id} 缺少打开埋点`)
    if (!new RegExp(`[A-Za-z_$][\\w$]*\\.recordRecent\\(\\s*['\"]${tool.id}['\"]\\s*\\)`).test(source)) errors.push(`${tool.id} 缺少最近使用记录`)
    const escapedPath = tool.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (!new RegExp(`path:\\s*['\"]${escapedPath}['\"]`).test(source)) errors.push(`${tool.id} 分享路径与注册路径不一致`)
  })
  return errors
}

function validateWxssCompatibility() {
  const errors = []
  walk(root, '.wxss').forEach((file) => {
    const source = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const relative = path.relative(root, file)
    if (/\b(?:row-|column-)?gap\s*:/i.test(source)) errors.push(`${relative} 使用了 gap`)
    if (/display\s*:\s*(?:inline-)?grid\b/i.test(source) || /\bgrid-(?:template|auto|column|row|area)\b/i.test(source)) {
      errors.push(`${relative} 使用了 CSS Grid`)
    }
    const blockPattern = /([^{}]+)\{([^{}]*)\}/g
    for (const match of source.matchAll(blockPattern)) {
      if (!/display\s*:\s*(?:inline-)?flex\b/i.test(match[2])) continue
      if (!/flex-direction\s*:\s*(?:row|row-reverse|column|column-reverse)\b/i.test(match[2])) {
        errors.push(`${relative} 的 ${match[1].trim().replace(/\s+/g, ' ')} 未显式声明 flex-direction`)
      }
    }
  })
  const componentsDirectory = path.join(root, 'components')
  const componentStyles = walk(componentsDirectory, '.wxss')
  if (!componentStyles.some((file) => file.endsWith(path.join('bottom-nav', 'index.wxss')))) {
    errors.push('未覆盖 components/bottom-nav/index.wxss')
  }
  const nativeTags = '(?:view|text|image|button|input|textarea|scroll-view|swiper|swiper-item|canvas|picker|switch|navigator)'
  componentStyles.forEach((file) => {
    const source = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const selectorPattern = /([^{}]+)\{/g
    for (const match of source.matchAll(selectorPattern)) {
      const selector = match[1].trim()
      if (!selector || selector.startsWith('@') || /^(?:from|to|\d+%)$/.test(selector)) continue
      const relative = path.relative(root, file)
      if (/#[A-Za-z_-][\w-]*/.test(selector)) errors.push(`${relative} 使用 ID 选择器：${selector}`)
      if (/\[[^\]]+\]/.test(selector)) errors.push(`${relative} 使用属性选择器：${selector}`)
      if (new RegExp(`(^|[\\s>+~,])${nativeTags}(?=$|[\\s>+~,.#:\\[])`).test(selector)) {
        errors.push(`${relative} 使用元素选择器：${selector}`)
      }
    }
  })
  const homeStyles = fs.readFileSync(path.join(root, 'pages', 'home', 'index.wxss'), 'utf8')
  if (/calc\([^)]*%[^)]*rpx|calc\([^)]*rpx[^)]*%/i.test(homeStyles)) errors.push('首页混用了百分比与 rpx 的 calc')
  return errors
}

function validateLocalPrivacyContract() {
  const errors = []
  if (!Array.isArray(storage.LEGACY_KEYS) || !storage.LEGACY_KEYS.includes('pugo_ai_daily_usage')) {
    errors.push('清空全部未覆盖旧 pugo_ai_daily_usage 键')
  }
  const testsDirectory = path.join(root, 'tests') + path.sep
  const cloudDirectory = path.join(root, 'cloudfunctions') + path.sep
  const source = walk(root, '.js')
    .filter((file) => !file.startsWith(testsDirectory) && !file.startsWith(cloudDirectory))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n')
  const forbiddenPatterns = [
    /wx\.login\b/, /wx\.request\b/, /wx\.uploadFile\b/, /wx\.downloadFile\b/,
    /AppSecret\b/i, /API_KEY\b/, /apiKey\b/, /secretKey\b/, /accessToken\b/,
    /Bearer\s+[A-Za-z0-9._-]+/, /\bsk-[A-Za-z0-9_-]{12,}/,
    /wx\.cloud\.extend\.AI\b/, /createModel\s*\(/, /chat\.completions\b/,
    /deepseek\b/i, /stable[-_ ]?diffusion\b/i, /text[-_ ]?to[-_ ]?image\b/i
  ]
  forbiddenPatterns.forEach((pattern) => {
    if (pattern.test(source)) errors.push(`发现禁用调用或敏感标记 ${pattern}`)
  })

  const privacy = fs.readFileSync(path.join(root, 'pages', 'privacy', 'index.wxml'), 'utf8')
  for (const phrase of ['本机', '选择图片', '保存', '相册', '边缘连通', '时间水印']) {
    if (!privacy.includes(phrase)) errors.push(`隐私页缺少媒体能力说明：${phrase}`)
  }
  for (const id of ['image-compress', 'photo-bg', 'photo-watermark']) {
    const script = fs.readFileSync(path.join(root, 'pages', id, 'index.js'), 'utf8')
    if (!/wx\.chooseMedia\s*\(/.test(script)) errors.push(`${id} 缺少用户主动选图入口`)
    if (!/wx\.saveImageToPhotosAlbum\s*\(/.test(script)) errors.push(`${id} 缺少用户主动保存入口`)
    if (/wx\.(?:request|uploadFile|downloadFile)\s*\(/.test(script)) errors.push(`${id} 不应上传或下载图片`)
  }
  const portrait = fs.readFileSync(path.join(root, 'pages', 'photo-bg', 'index.js'), 'utf8')
  const localPortrait = fs.readFileSync(path.join(root, 'utils', 'local-background.js'), 'utf8')
  if (!/removeConnectedBackground\s*\(/.test(portrait) || !/createConnectedMask/.test(localPortrait)) {
    errors.push('证件照页面未接入边缘连通的本机背景处理')
  }
  if (/vision-service|segmentPortrait|wx\.cloud/.test(portrait)) {
    errors.push('证件照客户端仍依赖 BDA、云函数或云端下载')
  }
  if (!/Uint8Array/.test(localPortrait) || !/Int32Array/.test(localPortrait)) {
    errors.push('本机背景处理缺少连通区域掩码或有界队列')
  }
  return errors
}

function validateLocalPortraitContract() {
  const errors = []
  const policyPath = path.join(root, 'docs', 'cam-policy-image-vision-bda-1.4.0.json')
  if (fs.existsSync(policyPath)) errors.push('无效的 name/bda:* CAM 策略模板不应继续作为发布资产')
  if (fs.existsSync(path.join(root, 'utils', 'vision-service.js'))) errors.push('客户端不应保留未使用的 BDA 云端桥接')
  const source = fs.readFileSync(path.join(root, 'pages', 'photo-bg', 'index.js'), 'utf8')
  if (!/local-background/.test(source)) errors.push('证件照页面未使用本机背景处理模块')
  if (/TENCENTCLOUD|SecretKey|SegmentPortraitPic/.test(source)) errors.push('证件照页面仍含腾讯云凭据或 BDA 接口耦合')
  return errors
}

function validatePublicRepositoryBoundary() {
  const errors = []
  const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8')
  const configSource = fs.readFileSync(path.join(root, 'utils', 'app-config.js'), 'utf8')
  if (project.appid !== 'touristappid') errors.push('公开配置必须使用 touristappid')
  if (Object.prototype.hasOwnProperty.call(project, 'cloudfunctionRoot')) errors.push('公开配置不应声明 cloudfunctionRoot')
  for (const relative of ['cloudfunctions', 'cloudbaserc.json', 'CONTINUE_HERE.md', 'project.private.config.json']) {
    if (fs.existsSync(path.join(root, relative))) errors.push(`公开仓库不应包含 ${relative}`)
  }
  if (/wx\.cloud|cloudEnvId/.test(appSource)) errors.push('app.js 仍初始化云环境')
  if (/cloudEnvId|envId/.test(configSource)) errors.push('公开 app-config 仍包含云环境标识')
  return errors
}

function validateNavigationContract() {
  const errors = []
  const navScript = fs.readFileSync(path.join(root, 'components', 'bottom-nav', 'index.js'), 'utf8')
  const navTemplate = fs.readFileSync(path.join(root, 'components', 'bottom-nav', 'index.wxml'), 'utf8')
  if (/\/pages\/(?:favorites|recent)\//.test(navScript)) errors.push('底部导航脚本仍残留收藏或最近使用跳转')
  if (/data-page="(?:favorites|recent)"/.test(navTemplate)) errors.push('底部导航模板仍残留收藏或最近使用入口')
  if (!/nav-item--create/.test(navTemplate)) errors.push('底部导航缺少中央工具入口')
  if (!/openDrawer/.test(navTemplate)) errors.push('中央加号未继续绑定工具抽屉')
  const homeScript = fs.readFileSync(path.join(root, 'pages', 'home', 'index.js'), 'utf8')
  if (!/goFavorites\s*\(/.test(homeScript) || !/goRecent\s*\(/.test(homeScript)) {
    errors.push('首页缺少收藏或最近使用的查看全部入口')
  }
  const office = tools.TOOL_CATEGORIES.find((item) => item.id === 'office')
  if (!office || office.name !== '办公助手') errors.push('办公助手分类未注册')
  if (tools.TOOL_CATEGORIES.some((item) => item.id === 'efficiency')) errors.push('效率处理分类仍残留')
  const officeToolIds = [
    'text', 'image-compress', 'photo-bg', 'photo-watermark', 'money', 'convert', 'random', 'rotation',
    'excel-formulas', 'excel-errors', 'table-cleaner', 'meeting-cost'
  ]
  officeToolIds.forEach((id) => {
    const tool = tools.getToolById(id)
    if (!tool || tool.category !== 'office') errors.push(`${id} 未归入办公助手`)
  })
  if (tools.TOOL_CATEGORIES.some((item) => item.id === 'image')) errors.push('单独图片工具分类仍残留')
  return errors
}

function validateAnalyticsContract() {
  const errors = []
  if (JSON.stringify(analytics.EVENT_FIELDS) !== JSON.stringify(expectedAnalyticsFields)) {
    errors.push('埋点事件或字段白名单不一致')
  }
  if (!Array.isArray(analytics.SENSITIVE_TOOL_IDS) || !analytics.SENSITIVE_TOOL_IDS.includes('period')) {
    errors.push('period 未进入统一敏感工具 denylist')
  }
  if (!analytics.SENSITIVE_TOOL_IDS.includes('table-cleaner')) {
    errors.push('table-cleaner 未进入统一敏感工具 denylist，粘贴文本可能进入匿名统计')
  }
  for (const id of ['cosmetics', 'photo-bg']) {
    if (!analytics.SENSITIVE_TOOL_IDS.includes(id)) errors.push(`${id} 未进入统一敏感媒体 denylist`)
  }
  if (JSON.stringify(analytics.sanitizeData(analytics.EVENT_IDS.TOOL_ACTION, {
    tool_id: 'period', action_id: 'add_record', result: 'success'
  })) !== '{}') {
    errors.push('period 行为数据未在清洗边界拦截')
  }
  const periodTemplate = fs.readFileSync(path.join(root, 'pages', 'period', 'index.wxml'), 'utf8')
  if (!periodTemplate.includes('不会进入匿名统计')) errors.push('period 页面缺少“不进入匿名统计”说明')
  return errors
}

const checks = [
  {
    name: '公开游客 AppID 与无云边界',
    errors: validatePublicRepositoryBoundary()
  },
  {
    name: 'We分析四事件隐私契约',
    errors: validateAnalyticsContract()
  },
  {
    name: '1.4.0 版本与项目描述一致',
    errors: validateVersionContract()
  },
  {
    name: 'GitHub 与公众号宣传入口',
    errors: validatePromotionContract()
  },
  {
    name: '三栏导航与办公助手分类契约',
    errors: validateNavigationContract()
  },
  {
    name: '动态工具注册与页面契约',
    errors: validateRegistryContract().concat(validatePageSourceContracts())
  },
  {
    name: '安卓与鸿蒙 WXSS 兼容契约',
    errors: validateWxssCompatibility()
  },
  {
    name: '本地能力与媒体隐私边界',
    errors: validateLocalPrivacyContract()
  },
  {
    name: '证件照本机处理与无凭据边界',
    errors: validateLocalPortraitContract()
  },
  {
    name: '既有文本与单位换算覆盖未回退',
    errors: Object.keys(converter.CATEGORY_CONFIG).length >= 8 && Object.keys(textUtils.OPERATION_IDS).length >= 7
      ? []
      : ['单位换算类别或文本操作数量发生回退']
  },
  {
    name: '公开版不携带账号备案字段',
    errors: appConfig.filingNumber === '' ? [] : ['公开仓库 filingNumber 必须为空']
  }
]

let blockers = 0

for (const check of checks) {
  if (!check.errors.length) {
    console.log(`✓ ${check.name}`)
    continue
  }
  const prefix = check.warning ? '!' : '✗'
  console.log(`${prefix} ${check.name}`)
  check.errors.forEach((detail) => console.log(`  - ${detail}`))
  if (!check.warning) blockers += 1
}

if (blockers > 0) {
  console.error(`\n上传预检未通过：${blockers} 组阻塞项。`)
  process.exit(1)
}

console.log('\n公开仓库预检通过：游客 AppID、无云函数、无账号绑定配置。')
