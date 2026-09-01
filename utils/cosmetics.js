const INGREDIENTS = Object.freeze([
  { key: 'water', name: '水', aliases: ['water', 'aqua', '纯化水'], category: '基质', note: '常见溶剂和配方基质。' },
  { key: 'glycerin', name: '甘油', aliases: ['glycerin', 'glycerol', '丙三醇'], category: '保湿', note: '常见吸湿剂，帮助角质层保持水分。' },
  { key: 'butylene-glycol', name: '丁二醇', aliases: ['butylene glycol', '1,3-丁二醇'], category: '保湿', note: '常见溶剂和保湿剂，也帮助改善肤感。' },
  { key: 'propylene-glycol', name: '丙二醇', aliases: ['propylene glycol', '1,2-丙二醇'], category: '保湿', note: '常见保湿剂、溶剂和促渗辅助成分。' },
  { key: 'pentylene-glycol', name: '戊二醇', aliases: ['pentylene glycol', '1,2-戊二醇'], category: '保湿', note: '兼具保湿、溶剂和配方辅助作用。' },
  { key: 'hyaluronic-acid', name: '透明质酸', aliases: ['hyaluronic acid', '玻尿酸'], category: '保湿', note: '大分子保湿成分，常用于增加皮肤表面含水感。' },
  { key: 'sodium-hyaluronate', name: '透明质酸钠', aliases: ['sodium hyaluronate', '玻尿酸钠'], category: '保湿', note: '透明质酸的钠盐，是常见保湿成分。' },
  { key: 'betaine', name: '甜菜碱', aliases: ['betaine'], category: '保湿', note: '常见保湿和肤感调节成分。' },
  { key: 'panthenol', name: '泛醇', aliases: ['panthenol', '维生素原b5', '维生素原B5'], category: '保湿舒缓', note: '常用于保湿和改善干燥不适的肤感。' },
  { key: 'allantoin', name: '尿囊素', aliases: ['allantoin'], category: '舒缓', note: '常见皮肤调理和舒缓成分。' },
  { key: 'centella', name: '积雪草提取物', aliases: ['centella asiatica extract', 'centella asiatica leaf extract', '积雪草'], category: '舒缓', note: '植物来源的皮肤调理成分，实际效果与配方浓度有关。' },
  { key: 'madecassoside', name: '羟基积雪草甙', aliases: ['madecassoside', '羟基积雪草苷'], category: '舒缓', note: '积雪草相关的皮肤调理成分。' },
  { key: 'bisabolol', name: '红没药醇', aliases: ['bisabolol', 'alpha-bisabolol'], category: '舒缓', note: '常见舒缓与皮肤调理成分。' },
  { key: 'niacinamide', name: '烟酰胺', aliases: ['niacinamide', '维生素b3', '维生素B3'], category: '皮肤调理', note: '常见皮肤调理成分；浓度和整体配方会影响使用感。' },
  { key: 'ascorbic-acid', name: '抗坏血酸', aliases: ['ascorbic acid', '维生素c', '维生素C'], category: '抗氧化', note: '维生素 C 原型，稳定性与配方环境关系较大。' },
  { key: 'tocopherol', name: '生育酚', aliases: ['tocopherol', '维生素e', '维生素E'], category: '抗氧化', note: '维生素 E，常作为抗氧化和皮肤调理成分。' },
  { key: 'tocopheryl-acetate', name: '生育酚乙酸酯', aliases: ['tocopheryl acetate', '醋酸生育酚'], category: '抗氧化', note: '维生素 E 衍生物，常用于皮肤调理。' },
  { key: 'ferulic-acid', name: '阿魏酸', aliases: ['ferulic acid'], category: '抗氧化', note: '植物来源抗氧化成分，也常用于配方稳定。' },
  { key: 'resveratrol', name: '白藜芦醇', aliases: ['resveratrol'], category: '抗氧化', note: '常见抗氧化与皮肤调理成分。' },
  { key: 'squalane', name: '角鲨烷', aliases: ['squalane'], category: '润肤', note: '常见润肤成分，帮助减少干燥和粗糙感。' },
  { key: 'mineral-oil', name: '矿油', aliases: ['mineral oil', 'paraffinum liquidum', '液体石蜡'], category: '润肤', note: '封闭型润肤成分，常用于减少水分散失。' },
  { key: 'petrolatum', name: '矿脂', aliases: ['petrolatum', '凡士林'], category: '润肤', note: '封闭性较强的润肤成分，常用于干燥皮肤护理。' },
  { key: 'dimethicone', name: '聚二甲基硅氧烷', aliases: ['dimethicone', '二甲基硅油'], category: '肤感润滑', note: '常见硅类成分，用于改善顺滑度并形成保护膜。' },
  { key: 'cyclopentasiloxane', name: '环五聚二甲基硅氧烷', aliases: ['cyclopentasiloxane', 'd5'], category: '肤感润滑', note: '挥发性硅类，常用于改善延展与清爽肤感。' },
  { key: 'caprylic-triglyceride', name: '辛酸/癸酸甘油三酯', aliases: ['caprylic/capric triglyceride', '辛酸癸酸甘油三酯'], category: '润肤', note: '常见轻质润肤剂和配方载体。' },
  { key: 'ceramide-np', name: '神经酰胺 NP', aliases: ['ceramide np', '神经酰胺np', '神经酰胺3'], category: '屏障护理', note: '皮肤脂质相关成分，常用于屏障护理配方。' },
  { key: 'cholesterol', name: '胆甾醇', aliases: ['cholesterol', '胆固醇'], category: '屏障护理', note: '皮肤脂质相关成分，常与神经酰胺和脂肪酸搭配。' },
  { key: 'salicylic-acid', name: '水杨酸', aliases: ['salicylic acid'], category: '角质调理', note: '角质调理成分；使用浓度、频率和法规限制需结合具体产品。' },
  { key: 'glycolic-acid', name: '乙醇酸', aliases: ['glycolic acid', '甘醇酸'], category: '角质调理', note: '果酸类角质调理成分，使用感与浓度、pH 有关。' },
  { key: 'lactic-acid', name: '乳酸', aliases: ['lactic acid'], category: '角质调理', note: '可用于角质调理或调节配方酸碱度。' },
  { key: 'mandelic-acid', name: '扁桃酸', aliases: ['mandelic acid', '杏仁酸'], category: '角质调理', note: '果酸类角质调理成分，仍需注意产品用法。' },
  { key: 'gluconolactone', name: '葡糖酸内酯', aliases: ['gluconolactone'], category: '角质调理', note: '多羟基酸类成分，也可用于保湿和配方辅助。' },
  { key: 'retinol', name: '视黄醇', aliases: ['retinol', '维生素a醇', '维生素A醇'], category: '皮肤调理', note: '维 A 类皮肤调理成分；使用限制和耐受需看具体产品说明。' },
  { key: 'retinal', name: '视黄醛', aliases: ['retinal', 'retinaldehyde'], category: '皮肤调理', note: '维 A 类皮肤调理成分；不根据成分表单独判断适用人群。' },
  { key: 'bakuchiol', name: '补骨脂酚', aliases: ['bakuchiol'], category: '皮肤调理', note: '植物来源的皮肤调理成分，不等同于维 A 酸药物。' },
  { key: 'zinc-oxide', name: '氧化锌', aliases: ['zinc oxide'], category: '紫外线防护', note: '矿物紫外线过滤剂，也可用于皮肤保护。' },
  { key: 'titanium-dioxide', name: '二氧化钛', aliases: ['titanium dioxide', 'ci 77891', 'CI 77891'], category: '紫外线防护/着色', note: '可作为矿物紫外线过滤剂或白色着色剂。' },
  { key: 'avobenzone', name: '丁基甲氧基二苯甲酰基甲烷', aliases: ['avobenzone', 'butyl methoxydibenzoylmethane'], category: '紫外线防护', note: 'UVA 过滤剂，需结合完整防晒体系理解。' },
  { key: 'octocrylene', name: '奥克立林', aliases: ['octocrylene'], category: '紫外线防护', note: 'UVB 过滤剂，也可帮助稳定部分防晒体系。' },
  { key: 'ethylhexyl-triazone', name: '乙基己基三嗪酮', aliases: ['ethylhexyl triazone'], category: '紫外线防护', note: 'UVB 过滤剂，需结合完整配方和法规用量。' },
  { key: 'bemotrizinol', name: '双-乙基己氧苯酚甲氧苯基三嗪', aliases: ['bis-ethylhexyloxyphenol methoxyphenyl triazine', 'bemotrizinol', 'tinosorb s'], category: '紫外线防护', note: '广谱紫外线过滤剂，常用于防晒体系。' },
  { key: 'phenoxyethanol', name: '苯氧乙醇', aliases: ['phenoxyethanol'], category: '防腐', note: '常见防腐剂，其使用量受化妆品法规限制。' },
  { key: 'ethylhexylglycerin', name: '乙基己基甘油', aliases: ['ethylhexylglycerin'], category: '防腐辅助', note: '常见防腐辅助与皮肤调理成分。' },
  { key: 'methylparaben', name: '羟苯甲酯', aliases: ['methylparaben', '尼泊金甲酯'], category: '防腐', note: '对羟基苯甲酸酯类防腐剂，使用需符合限量规定。' },
  { key: 'chlorphenesin', name: '氯苯甘醚', aliases: ['chlorphenesin'], category: '防腐', note: '常见防腐剂，使用量受法规限制。' },
  { key: 'disodium-edta', name: 'EDTA 二钠', aliases: ['disodium edta', 'edta-2na', '乙二胺四乙酸二钠'], category: '配方辅助', note: '螯合剂，帮助提升配方稳定性。' },
  { key: 'carbomer', name: '卡波姆', aliases: ['carbomer'], category: '增稠', note: '常见凝胶增稠和稳定成分。' },
  { key: 'xanthan-gum', name: '黄原胶', aliases: ['xanthan gum'], category: '增稠', note: '多糖类增稠和稳定成分。' },
  { key: 'cetearyl-alcohol', name: '鲸蜡硬脂醇', aliases: ['cetearyl alcohol'], category: '乳化/润肤', note: '脂肪醇类，不等同于常说的挥发性酒精。' },
  { key: 'cetyl-alcohol', name: '鲸蜡醇', aliases: ['cetyl alcohol'], category: '乳化/润肤', note: '脂肪醇类，常用于增稠、乳化和润肤。' },
  { key: 'stearic-acid', name: '硬脂酸', aliases: ['stearic acid'], category: '乳化/润肤', note: '脂肪酸类成分，常用于乳化、增稠和润肤。' },
  { key: 'lecithin', name: '卵磷脂', aliases: ['lecithin'], category: '乳化/润肤', note: '常见乳化和皮肤调理成分。' },
  { key: 'alcohol', name: '乙醇', aliases: ['alcohol', 'alcohol denat', 'alcohol denat.', '变性乙醇'], category: '溶剂', note: '常见挥发性溶剂；肤感与浓度、配方体系和个人耐受有关。' },
  { key: 'fragrance', name: '香精', aliases: ['fragrance', 'parfum', '香料'], category: '香味', note: '用于赋香；仅凭出现与否不能判断个人是否会不适。' },
  { key: 'citric-acid', name: '柠檬酸', aliases: ['citric acid'], category: '酸碱调节', note: '常用于调节配方 pH，也可参与角质调理。' },
  { key: 'sodium-hydroxide', name: '氢氧化钠', aliases: ['sodium hydroxide'], category: '酸碱调节', note: '通常用于少量调节配方 pH，不能只按原料性质判断成品刺激性。' },
  { key: 'sodium-chloride', name: '氯化钠', aliases: ['sodium chloride', '食盐'], category: '配方辅助', note: '常用于调节黏度或作为配方辅助成分。' },
  { key: 'caffeine', name: '咖啡因', aliases: ['caffeine'], category: '皮肤调理', note: '常见皮肤调理成分，实际表现取决于配方和使用部位。' },
  { key: 'urea', name: '尿素', aliases: ['urea'], category: '保湿/角质调理', note: '可用于保湿和角质调理，作用与浓度密切相关。' },
  { key: 'peptide', name: '棕榈酰五肽-4', aliases: ['palmitoyl pentapeptide-4', '棕榈酰五肽4'], category: '皮肤调理', note: '肽类皮肤调理成分，不能从成分名推断成品功效强度。' }
])

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\d+[\.、)）\s]*/, '')
    .replace(/[（(].*?[）)]/g, '')
    .replace(/[\s_.·-]+/g, '')
}

const ALIAS_MAP = (() => {
  const map = {}
  INGREDIENTS.forEach((item) => {
    ;[item.name, item.key].concat(item.aliases || []).forEach((name) => {
      map[normalizeName(name)] = item
    })
  })
  return Object.freeze(map)
})()

function splitIngredients(text) {
  return String(text || '')
    .split(/[,，;；\n\r、]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 200)
}

function identifyIngredient(raw) {
  const normalized = normalizeName(raw)
  const known = ALIAS_MAP[normalized]
  if (known) return Object.assign({ known: true, raw }, known)
  return {
    key: `unknown:${normalized}`,
    name: String(raw || '').trim(),
    category: '待查证',
    note: '本地词典暂未收录，不代表该成分有问题。可结合产品官方说明继续核对。',
    known: false,
    raw
  }
}

function parseIngredientList(text) {
  const seen = {}
  return splitIngredients(text)
    .map(identifyIngredient)
    .filter((item) => {
      if (!item.name || seen[item.key]) return false
      seen[item.key] = true
      return true
    })
}

function compareIngredientLists(leftText, rightText) {
  const left = parseIngredientList(leftText)
  const right = parseIngredientList(rightText)
  const leftKeys = new Set(left.map((item) => item.key))
  const rightKeys = new Set(right.map((item) => item.key))
  const common = left.filter((item) => rightKeys.has(item.key))
  const onlyLeft = left.filter((item) => !rightKeys.has(item.key))
  const onlyRight = right.filter((item) => !leftKeys.has(item.key))
  return {
    left,
    right,
    common,
    onlyLeft,
    onlyRight,
    knownCount: left.concat(right).filter((item) => item.known).length,
    unknownCount: left.concat(right).filter((item) => !item.known).length
  }
}

module.exports = {
  INGREDIENTS,
  normalizeName,
  splitIngredients,
  identifyIngredient,
  parseIngredientList,
  compareIngredientLists
}
