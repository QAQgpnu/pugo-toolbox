const storage = require('./storage')

const TOOL_DEFINITIONS = Object.freeze([
  {
    id: 'text',
    name: '文本处理',
    description: '清理、排序、提取链接',
    keywords: '字数 行数 空行 重复行 空格 清洗 排版 去重 去首尾空格 排序 编号 链接 网址 提取 复制',
    path: '/pages/text/index',
    symbol: '文',
    category: 'office'
  },
  {
    id: 'date',
    name: '日期计算',
    description: '天数、倒数、日期加减',
    keywords: '日期 天数 间隔 倒计时 今天 纪念日 加减 推算 到期日',
    path: '/pages/date/index',
    symbol: '日',
    category: 'life'
  },
  {
    id: 'convert',
    name: '单位换算',
    description: '长度、面积、容量等 8 类',
    keywords: '单位 公斤 千克 斤 克 磅 米 厘米 英寸 摄氏 华氏 开尔文 面积 平方米 亩 公顷 容量 体积 毫升 升 速度 时间 分钟 小时 数据 KB MB GB',
    path: '/pages/convert/index',
    symbol: '换',
    category: 'office'
  },
  {
    id: 'housing-fund',
    name: '公积金缴存试算',
    description: '个人、单位与年度缴存',
    keywords: '公积金 缴存基数 缴存比例 单位 个人 月缴 年缴 余额 试算',
    path: '/pages/housing-fund/index',
    symbol: '积',
    category: 'life'
  },
  {
    id: 'retirement',
    name: '职工养老金试算',
    description: '基础与个人账户部分估算',
    keywords: '退休 养老金 养老保险 计发基数 缴费指数 缴费年限 个人账户 估算',
    path: '/pages/retirement/index',
    symbol: '养',
    category: 'life'
  },
  {
    id: 'pet-age',
    name: '宠物年龄换算',
    description: '猫狗年龄与生命阶段',
    keywords: '宠物 猫 狗 年龄 人类年龄 月龄 小型犬 中型犬 大型犬 生命阶段',
    path: '/pages/pet-age/index',
    symbol: '宠',
    category: 'life'
  },
  {
    id: 'license-cycle',
    name: '记分周期助手',
    description: '手填扣分，估算清分日期',
    keywords: '驾照 驾驶证 记分 扣分 12分 清分 周期 交管12123 官方查询',
    path: '/pages/license-cycle/index',
    symbol: '证',
    category: 'life'
  },
  {
    id: 'money',
    name: '金额大写',
    description: '数字金额转中文大写',
    keywords: '人民币 财务 报销 发票 收据 支票 合同 壹 贰 角 分 大写金额',
    path: '/pages/money/index',
    symbol: '额',
    category: 'office'
  },
  {
    id: 'image-compress',
    name: '图片压缩',
    description: '本机减小图片体积',
    keywords: '图片 照片 压缩 缩小 体积 清晰度 相册 本机处理',
    path: '/pages/image-compress/index',
    symbol: '压',
    category: 'office'
  },
  {
    id: 'photo-bg',
    name: '证件照制作',
    description: '保留人物、换底色与常见尺寸',
    keywords: '证件照 换底色 背景 白底 蓝底 红底 一寸 二寸 小二寸 拍照 人像抠图',
    path: '/pages/photo-bg/index',
    symbol: '照',
    category: 'office'
  },
  {
    id: 'photo-watermark',
    name: '时间水印相机',
    description: '拍照或选图，本机添加时间',
    keywords: '时间水印 相机 拍照 照片 日期 时间 打卡 记录 相册 左下角 右下角 本机处理',
    path: '/pages/photo-watermark/index',
    symbol: '时',
    category: 'office'
  },
  {
    id: 'safety',
    name: '安心自查',
    description: '出门、睡前逐项确认',
    keywords: '安全 自查 健忘 提醒 出门 睡前 离家 门锁 门窗 燃气 水电 清单 登记 打卡',
    path: '/pages/safety/index',
    symbol: '安',
    category: 'memory'
  },
  {
    id: 'where',
    name: '东西放哪了',
    description: '记录物品放置位置',
    keywords: '物品 东西 放哪 找东西 位置 收纳 钥匙 工具 证件 说明书',
    path: '/pages/where/index',
    symbol: '找',
    category: 'memory'
  },
  {
    id: 'lifecycle',
    name: '该换了',
    description: '生活用品更换周期',
    keywords: '更换 周期 到期 牙刷 滤芯 电池 清洗 保养 耗材',
    path: '/pages/lifecycle/index',
    symbol: '换',
    category: 'memory'
  },
  {
    id: 'quick-note',
    name: '临时记住',
    description: '到期自动消失的记忆卡',
    keywords: '临时 记住 停车 快递柜 储物柜 座位号 号码 自动删除',
    path: '/pages/quick-note/index',
    symbol: '记',
    category: 'memory'
  },
  {
    id: 'food',
    name: '冰箱先吃谁',
    description: '把临期食物排在前面',
    keywords: '冰箱 食物 食材 剩菜 保质期 临期 过期 先吃',
    path: '/pages/food/index',
    symbol: '鲜',
    category: 'memory'
  },
  {
    id: 'random',
    name: '随机选择',
    description: '抽一个、随机分组',
    keywords: '随机 抽签 选择 决定 吃什么 点名 分组 分队 小组 洗牌',
    path: '/pages/random/index',
    symbol: '随',
    category: 'office'
  },
  {
    id: 'rotation',
    name: '公平轮值',
    description: '记住历史，尽量不连选',
    keywords: '轮流 家务 值日 洗碗 倒垃圾 点名 公平 排班',
    path: '/pages/rotation/index',
    symbol: '轮',
    category: 'office'
  },
  {
    id: 'focus-one',
    name: '今天只做一件',
    description: '从待办里选出第一件事',
    keywords: '待办 优先级 重要 紧急 拖延 先做 今天 任务',
    path: '/pages/focus-one/index',
    symbol: '一',
    category: 'office'
  },
  {
    id: 'split',
    name: '一起算清',
    description: 'AA、优惠和运费分摊',
    keywords: 'AA 分账 拼单 优惠券 运费 人均 聚餐 平摊',
    path: '/pages/split/index',
    symbol: '分',
    category: 'life'
  },
  {
    id: 'woodfish',
    name: '功德木鱼',
    description: '敲一下，功德 +1',
    keywords: '木鱼 功德 敲击 放松 解压 娱乐 计数 震动 声音',
    path: '/pages/woodfish/index',
    symbol: '木',
    category: 'fun'
  },
  {
    id: 'moyu',
    name: '今日摸鱼',
    description: '记下今天放空了多久',
    keywords: '摸鱼 上厕所 喝水 发呆 休息 放空 计时 时间 记录',
    path: '/pages/moyu/index',
    symbol: '闲',
    category: 'fun'
  },
  {
    id: 'daily-value',
    name: '每天值多少',
    description: '越用越划算',
    keywords: '日均 价值 每天 价格 购买日期 物品 成本 回本 划算',
    path: '/pages/daily-value/index',
    symbol: '值',
    category: 'fun'
  },
  {
    id: 'grow-focus',
    name: '努力长出来',
    description: '专注一次，长出一片叶',
    keywords: '番茄钟 专注 学习 工作 计时 努力 成长 叶子 休息',
    path: '/pages/grow-focus/index',
    symbol: '芽',
    category: 'fun'
  },
  {
    id: 'cosmetics',
    name: '化妆品成分对比',
    description: '共同与差异成分科普',
    keywords: '女生 女性 化妆品 护肤品 成分表 INCI 对比 科普 烟酰胺 玻尿酸',
    path: '/pages/cosmetics/index',
    symbol: '成',
    category: 'women'
  },
  {
    id: 'period',
    name: '姨妈周期记录',
    description: '本机记录与下次估算',
    keywords: '女生 女性 姨妈 月经 经期 周期 开始日期 预测 记录 隐私',
    path: '/pages/period/index',
    symbol: '期',
    category: 'women'
  },
  {
    id: 'steam-radar',
    name: 'Steam 限免雷达',
    description: '记下限免，首页提醒截止',
    keywords: '男生 男性 Steam 游戏 喜加一 限免 免费周末 推送 提醒 清单',
    path: '/pages/steam-radar/index',
    symbol: 'S',
    category: 'men'
  },
  {
    id: 'excel-formulas',
    name: 'Excel公式助手',
    description: '常用函数查询与公式向导',
    keywords: 'Excel 表格 公式 函数 VLOOKUP IF SUMIF COUNTIF 查找 条件求和 向导 复制 办公',
    path: '/pages/excel-formulas/index',
    symbol: '式',
    category: 'office'
  },
  {
    id: 'excel-errors',
    name: 'Excel报错诊断',
    description: '常见报错原因与修复步骤',
    keywords: 'Excel 报错 错误 VALUE REF DIV NAME SPILL 不计算 日期 前导零 VLOOKUP 查不到 排查 修复 办公',
    path: '/pages/excel-errors/index',
    symbol: '诊',
    category: 'office'
  },
  {
    id: 'table-cleaner',
    name: '表格文本整理',
    description: '粘贴文本清洗、拆分与脱敏',
    keywords: '表格 文本 清洗 空行 空格 去重 排序 拆分 单列 多列 CSV 制表符 手机号 邮箱 身份证 脱敏 办公',
    path: '/pages/table-cleaner/index',
    symbol: '整',
    category: 'office'
  },
  {
    id: 'meeting-cost',
    name: '会议成本计时器',
    description: '实时算出这场会花了多少钱',
    keywords: '会议 成本 计时 时薪 月薪 人数 开会 费用 时长 统计 办公',
    path: '/pages/meeting-cost/index',
    symbol: '会',
    category: 'office'
  }
])

// 仅用于承接 1.2.x 已收藏记录和历史分享卡，不进入搜索、分类与中央工具抽屉。
const LEGACY_TOOL_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'calculate',
    name: '百分比与折扣',
    description: '旧版兼容：占比、折扣与涨跌幅',
    keywords: '',
    path: '/pages/calculate/index',
    symbol: '%',
    category: 'life',
    legacy: true
  })
])

const TOOL_CATEGORIES = Object.freeze([
  { id: 'memory', name: '防健忘', description: '记位置、记周期、记临时小事' },
  { id: 'life', name: '生活试算', description: '日期、养老、公积金与日常分摊' },
  { id: 'office', name: '办公助手', description: '文本、表格、公式、换算与会议小工具' },
  { id: 'fun', name: '轻松一下', description: '给日常一点小反馈' },
  { id: 'women', name: '女生专区', description: '成分与周期，所有人都可按需使用' },
  { id: 'men', name: '男生专区', description: '游戏关注，所有人都可按需使用' }
])

function getToolById(id) {
  return TOOL_DEFINITIONS.find((tool) => tool.id === id) || LEGACY_TOOL_DEFINITIONS.find((tool) => tool.id === id)
}

function searchTools(query) {
  const terms = String(query || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (!terms.length) return TOOL_DEFINITIONS.slice()

  return TOOL_DEFINITIONS.filter((tool) => {
    const searchable = `${tool.name} ${tool.description} ${tool.keywords || ''}`.toLowerCase()
    return terms.every((term) => searchable.includes(term))
  })
}

function normalizeStoredToolIds(value) {
  const stored = Array.isArray(value) ? value : []
  return stored.filter((id, index) => Boolean(getToolById(id)) && stored.indexOf(id) === index)
}

function getFavorites() {
  const stored = storage.get(storage.KEYS.favorites, [])
  const ids = normalizeStoredToolIds(stored)
  if (Array.isArray(stored) && JSON.stringify(ids) !== JSON.stringify(stored)) storage.set(storage.KEYS.favorites, ids)
  return ids
}

function toggleFavorite(id) {
  if (!getToolById(id)) return getFavorites()
  const ids = getFavorites()
  const next = ids.includes(id) ? ids.filter((item) => item !== id) : [id].concat(ids)
  storage.set(storage.KEYS.favorites, next)
  return next
}

function getFavoriteTools() {
  return getFavorites().map(getToolById).filter(Boolean)
}

function recordRecent(id) {
  if (!getToolById(id)) return getRecentTools()
  const current = storage.get(storage.KEYS.recent, [])
  const ids = normalizeStoredToolIds(current)
  const next = [id].concat(ids.filter((item) => item !== id)).slice(0, 12)
  storage.set(storage.KEYS.recent, next)
  return next.map(getToolById).filter(Boolean)
}

function getRecentTools() {
  const stored = storage.get(storage.KEYS.recent, [])
  const ids = normalizeStoredToolIds(stored)
  if (Array.isArray(stored) && JSON.stringify(ids) !== JSON.stringify(stored)) storage.set(storage.KEYS.recent, ids)
  return ids.map(getToolById).filter(Boolean)
}

function clearRecent() {
  return storage.remove(storage.KEYS.recent)
}

function getSettings() {
  const value = storage.get(storage.KEYS.settings, {})
  return Object.assign({ vibration: true }, value && typeof value === 'object' ? value : {})
}

function updateSettings(patch) {
  const next = Object.assign({}, getSettings(), patch)
  storage.set(storage.KEYS.settings, next)
  return next
}

module.exports = {
  TOOL_DEFINITIONS,
  LEGACY_TOOL_DEFINITIONS,
  TOOL_CATEGORIES,
  getToolById,
  searchTools,
  getFavorites,
  getFavoriteTools,
  toggleFavorite,
  recordRecent,
  getRecentTools,
  clearRecent,
  getSettings,
  updateSettings
}
