// Excel 公式助手与报错诊断的内置数据。
// 全部内容离线内置：不联网、不调用 AI、不上传用户输入。

const FORMULA_CATEGORIES = Object.freeze([
  { id: 'lookup', name: '查找引用' },
  { id: 'logic', name: '条件判断' },
  { id: 'math', name: '求和统计' },
  { id: 'text', name: '文本处理' },
  { id: 'date', name: '日期时间' },
  { id: 'clean', name: '数据清洗' }
])

const FORMULA_LIBRARY = Object.freeze([
  // —— 查找引用 ——
  {
    name: 'VLOOKUP', category: 'lookup',
    usage: '按首列的值横向查找，返回同一行指定列的内容',
    syntax: 'VLOOKUP(查找值, 数据区域, 返回第几列, 匹配方式)',
    params: '查找值：要查的内容；数据区域：查找范围，首列必须包含查找值；返回第几列：从区域首列起算的列号；匹配方式：FALSE 为精确匹配，推荐。',
    example: '=VLOOKUP(A2,$D$2:$F$100,2,FALSE)',
    errors: '查不到会返回 #N/A；数据区域没锁定（按 F4 加 $），复制公式后引用会错位。'
  },
  {
    name: 'HLOOKUP', category: 'lookup',
    usage: '按首行的值纵向查找，返回同一列指定行的内容',
    syntax: 'HLOOKUP(查找值, 数据区域, 返回第几行, 匹配方式)',
    params: '与 VLOOKUP 相同，只是方向转了 90 度：首行包含查找值，按行号返回。',
    example: '=HLOOKUP(B1,$A$1:$M$3,2,FALSE)',
    errors: '表头是竖排时应该用 VLOOKUP，方向选错会一直返回 #N/A。'
  },
  {
    name: 'XLOOKUP', category: 'lookup',
    usage: '新版通用查找：任意方向查找，可自定义查不到时的返回值',
    syntax: 'XLOOKUP(查找值, 查找列, 返回列, 查不到时返回)',
    params: '查找列与返回列分别是两列区域；第 4 个参数可选，查不到时返回它而不是报错。需要较新版本的 Excel 或 WPS。',
    example: '=XLOOKUP(A2,D:D,E:E,"未找到")',
    errors: '旧版本 Excel 不支持，会显示 #NAME?；可以退回用 VLOOKUP 或 INDEX+MATCH。'
  },
  {
    name: 'INDEX', category: 'lookup',
    usage: '按行号和列号取出区域中某个单元格的值',
    syntax: 'INDEX(区域, 行号, 列号)',
    params: '行号、列号从 1 开始数；常与 MATCH 组合，替代 VLOOKUP 实现“向左查找”。',
    example: '=INDEX(C2:C100,MATCH(A2,B2:B100,0))',
    errors: '行号超出区域范围会返回 #REF!。'
  },
  {
    name: 'MATCH', category: 'lookup',
    usage: '返回某个值在一列中的位置（第几个）',
    syntax: 'MATCH(查找值, 查找列, 匹配方式)',
    params: '匹配方式填 0 表示精确匹配；结果是数字位置，不是值本身。',
    example: '=MATCH("小浦",A2:A50,0)',
    errors: '查不到返回 #N/A；文本查找区分不区分大小写取决于版本，注意首尾空格。'
  },
  {
    name: 'OFFSET', category: 'lookup',
    usage: '以某个单元格为起点，按偏移行列取区域',
    syntax: 'OFFSET(起点单元格, 下移行, 右移列, 高度, 宽度)',
    params: '下移行/右移列可为负数；高度宽度决定返回区域大小，常配合 SUM 做动态汇总。',
    example: '=SUM(OFFSET(A1,0,0,COUNTA(A:A),1))',
    errors: '区域超出工作表边界返回 #REF!；大表格中大量使用会拖慢计算。'
  },
  {
    name: 'INDIRECT', category: 'lookup',
    usage: '把文本形式的引用变成真正的单元格引用',
    syntax: 'INDIRECT(文本引用)',
    params: '参数是文本，比如 "B2" 或由其他单元格拼出来的地址；常用于跨表动态引用。',
    example: '=INDIRECT(A1&"!B2")',
    errors: '文本拼错或引用的表不存在时返回 #REF!；它会随打开实时重算，别滥用。'
  },
  // —— 条件判断 ——
  {
    name: 'IF', category: 'logic',
    usage: '条件成立返回一个值，不成立返回另一个值',
    syntax: 'IF(条件, 成立时返回, 不成立时返回)',
    params: '条件是比较表达式，如 A2>=60；两个返回值可以是文本（加英文引号）、数字或公式。',
    example: '=IF(A2>=60,"及格","不及格")',
    errors: '引号必须用英文半角引号；条件写成 A2=60 之外的等值判断时别漏掉比较符号。'
  },
  {
    name: 'IFS', category: 'logic',
    usage: '多个条件依次判断，返回第一个成立条件对应的值',
    syntax: 'IFS(条件1, 值1, 条件2, 值2, ...)',
    params: '条件按顺序判断，命中即停；需要较新版本 Excel。最后可用 TRUE 作为兜底条件。',
    example: '=IFS(A2>=90,"优",A2>=60,"及格",TRUE,"不及格")',
    errors: '所有条件都不成立且没有兜底时返回 #N/A。'
  },
  {
    name: 'AND', category: 'logic',
    usage: '所有条件都成立才返回 TRUE',
    syntax: 'AND(条件1, 条件2, ...)',
    params: '常与 IF 组合：IF(AND(条件1,条件2),...)。',
    example: '=IF(AND(A2>=60,B2>=60),"全部及格","有科目未及格")',
    errors: '单独使用只会得到 TRUE/FALSE，一般要配合 IF 使用。'
  },
  {
    name: 'OR', category: 'logic',
    usage: '任一条件成立就返回 TRUE',
    syntax: 'OR(条件1, 条件2, ...)',
    params: '同样常与 IF 组合使用。',
    example: '=IF(OR(A2="周六",A2="周日"),"休息日","工作日")',
    errors: '文本条件忘记加引号会被当成名称，出现 #NAME?。'
  },
  {
    name: 'NOT', category: 'logic',
    usage: '把 TRUE 变 FALSE，FALSE 变 TRUE',
    syntax: 'NOT(条件)',
    params: '用于反转判断结果，也可写成 条件<>值。',
    example: '=IF(NOT(A2="已完成"),"待处理","已完成")',
    errors: '嵌套过深可读性差，建议直接用 <> 比较。'
  },
  {
    name: 'IFERROR', category: 'logic',
    usage: '公式报错时返回你指定的替代值',
    syntax: 'IFERROR(原公式, 报错时返回)',
    params: '包住任何可能报错的公式，把 #N/A、#DIV/0! 等替换成友好文案或 0。',
    example: '=IFERROR(VLOOKUP(A2,D:F,2,FALSE),"无记录")',
    errors: '别用它无脑包住所有公式，真正的错误会被掩盖，排查更难。'
  },
  {
    name: 'IFNA', category: 'logic',
    usage: '只在公式返回 #N/A 时给出替代值',
    syntax: 'IFNA(原公式, 返回#N/A时显示)',
    params: '比 IFERROR 更精确：其他错误仍会正常显示，便于发现问题。',
    example: '=IFNA(VLOOKUP(A2,D:F,2,FALSE),"未找到")',
    errors: '旧版本不支持时退回 IFERROR。'
  },
  // —— 求和统计 ——
  {
    name: 'SUM', category: 'math',
    usage: '对一组数字求和',
    syntax: 'SUM(数值1, 数值2, ...)',
    params: '参数可以是数字、单元格或区域；文本和空单元格会被忽略。',
    example: '=SUM(B2:B100)',
    errors: '结果不对时先检查是否有数字被存成了文本（左上角绿色小三角）。'
  },
  {
    name: 'SUMIF', category: 'math',
    usage: '只把符合条件的单元格加起来',
    syntax: 'SUMIF(条件区域, 条件, 求和区域)',
    params: '条件区域用来判断；求和区域是真正相加的数字列；两区域行数和位置要对应。',
    example: '=SUMIF(A2:A100,"华东",C2:C100)',
    errors: '条件区域与求和区域错位是最常见错误，结果会偏大或偏小。'
  },
  {
    name: 'SUMIFS', category: 'math',
    usage: '同时满足多个条件才相加',
    syntax: 'SUMIFS(求和区域, 条件区域1, 条件1, 条件区域2, 条件2, ...)',
    params: '注意顺序：求和区域在最前面，与 SUMIF 相反；后面是成对的区域和条件。',
    example: '=SUMIFS(D2:D100,A2:A100,"华东",B2:B100,">100")',
    errors: '把求和区域放错位置是最常见翻车点；带比较符的条件要整体加引号，如 ">100"。'
  },
  {
    name: 'COUNTA', category: 'math',
    usage: '统计非空单元格个数（含文本）',
    syntax: 'COUNTA(区域)',
    params: 'COUNT 只统计数字，COUNTA 统计所有非空内容。',
    example: '=COUNTA(A2:A100)',
    errors: '单元格里有空格或空字符串（""）也会被算作非空。'
  },
  {
    name: 'COUNTIF', category: 'math',
    usage: '统计符合条件的单元格个数',
    syntax: 'COUNTIF(条件区域, 条件)',
    params: '条件可以是文本、数字或 ">60" 这类比较；支持通配符，如 "张*"。',
    example: '=COUNTIF(B2:B100,"已完成")',
    errors: '统计数字区间时条件要写成字符串，例如 ">=60"，直接写 >=60 会报错。'
  },
  {
    name: 'COUNTIFS', category: 'math',
    usage: '同时满足多个条件的个数统计',
    syntax: 'COUNTIFS(条件区域1, 条件1, 条件区域2, 条件2, ...)',
    params: '区域和条件成对出现，所有区域行数要一致。',
    example: '=COUNTIFS(A2:A100,"华东",C2:C100,">100")',
    errors: '多组区域行数不一致会返回 #VALUE!。'
  },
  {
    name: 'AVERAGE', category: 'math',
    usage: '求平均值，自动忽略空单元格',
    syntax: 'AVERAGE(数值区域)',
    params: '文本和空单元格不参与平均；0 会参与计算。',
    example: '=AVERAGE(C2:C100)',
    errors: '把 0 和“缺考”混在一起时，结果会偏低，可改用 AVERAGEIF 排除。'
  },
  {
    name: 'AVERAGEIF', category: 'math',
    usage: '只计算符合条件的单元格的平均值',
    syntax: 'AVERAGEIF(条件区域, 条件, 平均区域)',
    params: '结构与 SUMIF 一致；平均区域可省略，此时对条件区域自身求平均。',
    example: '=AVERAGEIF(A2:A100,"华东",C2:C100)',
    errors: '没有任何单元格符合条件时返回 #DIV/0!，可用 IFERROR 包住。'
  },
  // —— 文本处理 ——
  {
    name: 'LEFT', category: 'text',
    usage: '从文本左边取指定个数的字符',
    syntax: 'LEFT(文本, 字符数)',
    params: '字符数省略时默认取 1 个。',
    example: '=LEFT(A2,3)',
    errors: '数字列直接用 LEFT 也可以，但结果会变成文本，注意后续计算。'
  },
  {
    name: 'RIGHT', category: 'text',
    usage: '从文本右边取指定个数的字符',
    syntax: 'RIGHT(文本, 字符数)',
    params: '常用来取手机号后四位、编号尾号。',
    example: '=RIGHT(A2,4)',
    errors: '与 LEFT 一样，结果是文本；需要参与计算时套一层 VALUE。'
  },
  {
    name: 'MID', category: 'text',
    usage: '从文本中间某个位置开始取指定长度',
    syntax: 'MID(文本, 开始位置, 字符数)',
    params: '开始位置从 1 起算；常用来从身份证号提取出生日期。',
    example: '=MID(A2,7,8)',
    errors: '开始位置超过文本长度会返回空，注意先确认数据位数一致。'
  },
  {
    name: 'LEN', category: 'text',
    usage: '统计文本的字符数',
    syntax: 'LEN(文本)',
    params: '常配合 IF 校验位数，比如手机号是否 11 位。',
    example: '=IF(LEN(A2)=11,"位数正确","位数不对")',
    errors: '首尾空格也会被计入长度，可先用 TRIM 清理。'
  },
  {
    name: 'FIND', category: 'text',
    usage: '返回某段文本在字符串中的起始位置',
    syntax: 'FIND(要找的文本, 原文本, 起始位置)',
    params: '区分大小写；找不到会报错，常与 ISNUMBER 组合做包含判断。',
    example: '=IF(ISNUMBER(FIND("发票",A2)),"含发票","不含")',
    errors: '不区分大小写请用 SEARCH；FIND 不支持通配符。'
  },
  {
    name: 'SUBSTITUTE', category: 'text',
    usage: '把文本中的指定内容替换成别的',
    syntax: 'SUBSTITUTE(文本, 旧内容, 新内容, 替换第几个)',
    params: '替换所有匹配时省略第 4 个参数；常用来去掉多余符号。',
    example: '=SUBSTITUTE(A2,"元","")',
    errors: '旧内容必须完全一致（含空格），否则原样返回。'
  },
  {
    name: 'TEXT', category: 'text',
    usage: '把数字或日期按指定格式转成文本',
    syntax: 'TEXT(值, 格式代码)',
    params: '格式代码如 "0.00"、"yyyy-mm-dd"、"0%"。',
    example: '=TEXT(TODAY(),"yyyy年m月d日")',
    errors: '结果是文本，不能再直接参与数字计算。'
  },
  {
    name: 'TEXTJOIN', category: 'text',
    usage: '用分隔符把多个单元格拼成一段文本',
    syntax: 'TEXTJOIN(分隔符, 是否忽略空值, 内容1, 内容2, ...)',
    params: '第 2 个参数填 TRUE 可跳过空单元格；需要较新版本 Excel。',
    example: '=TEXTJOIN("、",TRUE,A2:A10)',
    errors: '旧版本没有该函数，可退回 CONCATENATE 或 & 拼接。'
  },
  // —— 日期时间 ——
  {
    name: 'TODAY', category: 'date',
    usage: '返回今天的日期，每次打开自动更新',
    syntax: 'TODAY()',
    params: '不带参数；想带时间请用 NOW()。',
    example: '=TODAY()-A2',
    errors: '结果是日期序列号，显示成数字时把单元格格式设为日期即可。'
  },
  {
    name: 'NOW', category: 'date',
    usage: '返回当前日期和时间',
    syntax: 'NOW()',
    params: '任何重算都会刷新，适合做“更新时间”标记。',
    example: '=TEXT(NOW(),"yyyy-mm-dd hh:mm")',
    errors: '需要固定值时请粘贴为数值，否则会一直变。'
  },
  {
    name: 'DATE', category: 'date',
    usage: '用年月日三个数字构造日期',
    syntax: 'DATE(年, 月, 日)',
    params: '月超过 12 会自动进位，比如 DATE(2026,13,1) 得到 2027 年 1 月 1 日。',
    example: '=DATE(2026,8,1)+30',
    errors: '两位数年份可能被识别成 19xx 年，尽量写四位年份。'
  },
  {
    name: 'DATEDIF', category: 'date',
    usage: '计算两个日期之间相差的天数、月数或年数',
    syntax: 'DATEDIF(开始日期, 结束日期, 单位)',
    params: '单位："D" 天，"M" 整月，"Y" 整年；输入时不提示，但函数真实存在。',
    example: '=DATEDIF(A2,B2,"D")',
    errors: '开始日期晚于结束日期会报 #NUM!；单位必须大写并加引号。'
  },
  {
    name: 'WEEKDAY', category: 'date',
    usage: '返回日期是星期几',
    syntax: 'WEEKDAY(日期, 类型)',
    params: '类型填 2 时，1 表示周一、7 表示周日，更符合国内习惯。',
    example: '=IF(WEEKDAY(A2,2)>5,"周末","工作日")',
    errors: '不写类型参数时默认 1 表示周日，容易判断错周末。'
  },
  {
    name: 'EDATE', category: 'date',
    usage: '返回某日期之后若干个月的同一天',
    syntax: 'EDATE(开始日期, 月数)',
    params: '月数可为负表示往前推；常用于合同到期、保修期计算。',
    example: '=EDATE(A2,12)',
    errors: '结果可能显示为数字，把格式设为日期即可；月末日期会自动归整到月末。'
  },
  // —— 数据清洗 ——
  {
    name: 'TRIM', category: 'clean',
    usage: '去掉首尾多余空格，中间多个空格只留一个',
    syntax: 'TRIM(文本)',
    params: '从网页或其他系统复制来的数据常带隐藏空格，先 TRIM 再做查找比较。',
    example: '=TRIM(A2)',
    errors: 'TRIM 去不掉不间断空格（常见于网页），可再用 SUBSTITUTE 替换。'
  },
  {
    name: 'CLEAN', category: 'clean',
    usage: '去掉文本里的换行符等不可见字符',
    syntax: 'CLEAN(文本)',
    params: '常与 TRIM 组合：TRIM(CLEAN(A2))。',
    example: '=TRIM(CLEAN(A2))',
    errors: '部分 Unicode 特殊字符 CLEAN 处理不了，需要 SUBSTITUTE。'
  },
  {
    name: 'VALUE', category: 'clean',
    usage: '把看起来像数字的文本转成真数字',
    syntax: 'VALUE(文本)',
    params: '文本型数字无法求和时用它转换；也可用“分列”或乘 1 实现。',
    example: '=VALUE(A2)',
    errors: '文本里带单位（如 "12元"）会转换失败，先用 SUBSTITUTE 去掉单位。'
  },
  {
    name: 'EXACT', category: 'clean',
    usage: '严格比较两段文本是否完全一致',
    syntax: 'EXACT(文本1, 文本2)',
    params: '区分大小写和空格，普通 = 比较不区分大小写。',
    example: '=EXACT(A2,B2)',
    errors: '肉眼看不出差异时，用 LEN 对比长度更容易发现空格问题。'
  },
  {
    name: 'PROPER', category: 'clean',
    usage: '把英文文本每个单词首字母转大写',
    syntax: 'PROPER(文本)',
    params: '主要用于英文姓名、品牌名规范化。',
    example: '=PROPER(A2)',
    errors: '对中文无效；全角英文标点不会被处理。'
  },
  {
    name: 'UPPER', category: 'clean',
    usage: '把英文字母全部转成大写（LOWER 为全部小写）',
    syntax: 'UPPER(文本)',
    params: '配合 EXACT、VLOOKUP 做大小写归一，避免因大小写查不到。',
    example: '=UPPER(A2)',
    errors: '只影响英文字母；数字和符号原样保留。'
  }
])

function searchFormulas(query, categoryId) {
  const terms = String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  return FORMULA_LIBRARY.filter((formula) => {
    if (categoryId && categoryId !== 'all' && formula.category !== categoryId) return false
    if (!terms.length) return true
    const searchable = `${formula.name} ${formula.usage} ${formula.syntax}`.toLowerCase()
    return terms.every((term) => searchable.includes(term))
  })
}

function getFormulaByName(name) {
  return FORMULA_LIBRARY.find((formula) => formula.name === String(name || '')) || null
}

// —— 公式向导：按常见场景生成公式并给出中文解释 ——

const WIZARD_SCENARIOS = Object.freeze([
  {
    id: 'sumif',
    name: '条件求和',
    description: '只把符合条件的金额加起来',
    fields: Object.freeze([
      Object.freeze({ key: 'range', label: '条件所在区域', placeholder: '例如 A2:A100' }),
      Object.freeze({ key: 'condition', label: '条件', placeholder: '例如 华东 或 >100' }),
      Object.freeze({ key: 'sumRange', label: '要求和的金额区域', placeholder: '例如 C2:C100' })
    ])
  },
  {
    id: 'countifs',
    name: '多条件计数',
    description: '同时满足两个条件才算一个',
    fields: Object.freeze([
      Object.freeze({ key: 'range1', label: '条件一区域', placeholder: '例如 A2:A100' }),
      Object.freeze({ key: 'condition1', label: '条件一', placeholder: '例如 华东' }),
      Object.freeze({ key: 'range2', label: '条件二区域', placeholder: '例如 C2:C100' }),
      Object.freeze({ key: 'condition2', label: '条件二', placeholder: '例如 >100' })
    ])
  },
  {
    id: 'keyword-if',
    name: '按关键词判断',
    description: '单元格里包含某个词就返回“是”',
    fields: Object.freeze([
      Object.freeze({ key: 'cell', label: '要判断的单元格', placeholder: '例如 A2' }),
      Object.freeze({ key: 'keyword', label: '关键词', placeholder: '例如 发票' }),
      Object.freeze({ key: 'yesText', label: '包含时显示', placeholder: '例如 是' }),
      Object.freeze({ key: 'noText', label: '不包含时显示', placeholder: '例如 否' })
    ])
  },
  {
    id: 'vlookup',
    name: '查找对应值',
    description: '按编号或姓名查出同一行的其他信息',
    fields: Object.freeze([
      Object.freeze({ key: 'lookupCell', label: '查找值所在单元格', placeholder: '例如 A2' }),
      Object.freeze({ key: 'tableRange', label: '数据表区域', placeholder: '例如 D2:F100' }),
      Object.freeze({ key: 'columnIndex', label: '返回第几列', placeholder: '例如 2' })
    ])
  },
  {
    id: 'mid',
    name: '提取字符',
    description: '从固定位置截取几位字符',
    fields: Object.freeze([
      Object.freeze({ key: 'cell', label: '要提取的单元格', placeholder: '例如 A2' }),
      Object.freeze({ key: 'start', label: '从第几位开始', placeholder: '例如 7' }),
      Object.freeze({ key: 'length', label: '提取几位', placeholder: '例如 8' })
    ])
  },
  {
    id: 'datedif',
    name: '日期相差天数',
    description: '算两个日期之间隔了多少天',
    fields: Object.freeze([
      Object.freeze({ key: 'startCell', label: '开始日期单元格', placeholder: '例如 A2' }),
      Object.freeze({ key: 'endCell', label: '结束日期单元格', placeholder: '例如 B2' })
    ])
  }
])

function cleanInput(value) {
  return String(value === undefined || value === null ? '' : value).trim()
}

// 条件参数：已带比较符或纯数字保持原样，其余按文本加英文引号。
function formatCondition(value) {
  const text = cleanInput(value)
  if (/^[<>]=?/.test(text) || /^-?\d+(\.\d+)?$/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

function isPositiveIntegerText(value) {
  return /^[1-9]\d*$/.test(cleanInput(value))
}

function generateWizardFormula(scenarioId, inputs) {
  const scenario = WIZARD_SCENARIOS.find((item) => item.id === scenarioId)
  if (!scenario) return null
  const values = {}
  let complete = true
  scenario.fields.forEach((field) => {
    const value = cleanInput(inputs && inputs[field.key])
    values[field.key] = value
    if (!value) complete = false
  })
  if (!complete) return null

  if (scenarioId === 'sumif') {
    return {
      scenarioId,
      name: scenario.name,
      formula: `=SUMIF(${values.range},${formatCondition(values.condition)},${values.sumRange})`,
      explanation: `在区域 ${values.range} 中找出等于 ${formatCondition(values.condition)} 的行，把对应 ${values.sumRange} 里的数字相加。注意两个区域的首尾行要对齐。`
    }
  }

  if (scenarioId === 'countifs') {
    return {
      scenarioId,
      name: scenario.name,
      formula: `=COUNTIFS(${values.range1},${formatCondition(values.condition1)},${values.range2},${formatCondition(values.condition2)})`,
      explanation: `统计同时满足两个条件的行数：${values.range1} 等于 ${formatCondition(values.condition1)}，且 ${values.range2} 等于 ${formatCondition(values.condition2)}。`
    }
  }

  if (scenarioId === 'keyword-if') {
    return {
      scenarioId,
      name: scenario.name,
      formula: `=IF(ISNUMBER(FIND("${values.keyword}",${values.cell})),"${values.yesText}","${values.noText}")`,
      explanation: `在 ${values.cell} 里查找关键词“${values.keyword}”，找到就显示“${values.yesText}”，找不到显示“${values.noText}”。FIND 区分大小写，不支持通配符。`
    }
  }

  if (scenarioId === 'vlookup') {
    if (!isPositiveIntegerText(values.columnIndex)) return null
    return {
      scenarioId,
      name: scenario.name,
      formula: `=VLOOKUP(${values.lookupCell},${values.tableRange},${values.columnIndex},FALSE)`,
      explanation: `拿 ${values.lookupCell} 的值去 ${values.tableRange} 的第一列精确查找，返回同一行第 ${values.columnIndex} 列的内容。建议选中区域按 F4 锁定（加 $），防止复制公式后引用错位。`
    }
  }

  if (scenarioId === 'mid') {
    if (!isPositiveIntegerText(values.start) || !isPositiveIntegerText(values.length)) return null
    return {
      scenarioId,
      name: scenario.name,
      formula: `=MID(${values.cell},${values.start},${values.length})`,
      explanation: `从 ${values.cell} 的第 ${values.start} 位开始，连续取出 ${values.length} 个字符。位数从 1 开始数。`
    }
  }

  if (scenarioId === 'datedif') {
    return {
      scenarioId,
      name: scenario.name,
      formula: `=DATEDIF(${values.startCell},${values.endCell},"D")`,
      explanation: `计算 ${values.startCell} 到 ${values.endCell} 相差的完整天数。把 "D" 换成 "M" 或 "Y" 可以得到整月、整年。`
    }
  }

  return null
}

// —— Excel 报错诊断 ——

const ERROR_CATEGORIES = Object.freeze([
  { id: 'code', name: '报错提示' },
  { id: 'behavior', name: '异常现象' }
])

const ERROR_GUIDES = Object.freeze([
  {
    id: 'value', code: '#VALUE!', category: 'code',
    title: '参与计算的内容类型不对',
    summary: '公式里混进了无法参与运算的文本或错误格式。',
    causes: [
      '数字被存成了文本，直接相加得到文本拼接或报错',
      '日期、数字格式不合法，比如“2026年8月”这类中文日期',
      '区域参数写成了单个单元格，或行数不一致'
    ],
    steps: [
      '双击报错单元格，看参与计算的是不是带引号的文本',
      '选中相关列，看左上角是否有绿色小三角（文本型数字）',
      '用 VALUE 或“分列→完成”把文本数字转成数字后重试',
      '检查 SUMIF/COUNTIFS 的条件区域和求和区域行数是否一致'
    ],
    fixExample: '原公式 =A2+B2 报错，B2 是文本"12元"：先 =SUBSTITUTE(B2,"元","") 再 VALUE 转换，或直接修正源数据。',
    pitfalls: ['用 IFERROR 包住后错误消失，但数据仍然是错的', '复制来的数据带空格，先 TRIM 再转换'],
    sample: '典型场景：=A2+B2，其中 B2 内容是文本“12元”。'
  },
  {
    id: 'na', code: '#N/A', category: 'code',
    title: '查找函数没有找到结果',
    summary: 'VLOOKUP、MATCH 等查找函数查不到目标值。',
    causes: [
      '查找值和表里的值看起来一样，实际有首尾空格或大小写不同',
      '查找值数字被存成文本（或相反），类型不匹配',
      'VLOOKUP 第 4 个参数省略，默认近似匹配导致结果异常',
      '查找值确实不在数据区域首列里'
    ],
    steps: [
      '用 EXACT(查找值, 表内值) 严格比较，确认是否完全一致',
      '对两列分别执行 TRIM 后重试',
      '统一数据类型：都用数字或都用文本',
      '给 VLOOKUP 补上 FALSE 做精确匹配',
      '仍查不到时，用 IFNA 返回“未找到”让报表可读'
    ],
    fixExample: '=IFNA(VLOOKUP(TRIM(A2),D:F,2,FALSE),"未找到")',
    pitfalls: ['近似匹配（省略第 4 参数）会返回一个“看起来对”的错误值', '通配符查找只在文本匹配时生效'],
    sample: '典型场景：VLOOKUP(A2,D:F,2)，A2 是 "S001 "（带尾随空格）。'
  },
  {
    id: 'ref', code: '#REF!', category: 'code',
    title: '引用的单元格已被删除或越界',
    summary: '公式引用的行列不存在了。',
    causes: [
      '删除了公式引用的整行、整列或单元格',
      '合并单元格后再拆分，原引用失效',
      'INDEX/OFFSET 的行号列号超出区域范围'
    ],
    steps: [
      '马上按 Ctrl+Z 撤销删除，改用“清除内容”代替删除行列',
      '点击报错公式，看哪段引用变成了 REF，定位被删区域',
      '重新框选正确区域替换失效引用',
      '涉及合并单元格时，先取消合并再整理数据'
    ],
    fixExample: '原公式 =SUM(B2:B10)，删除 C 列后 B 列错位：撤销删除，改为先清除内容再填新数据。',
    pitfalls: ['删除行列前没有检查右侧/下方是否被引用', '用整列引用（B:B）可以减少这类问题'],
    sample: '典型场景：汇总公式引用了 C 列，后来把 C 列整列删除。'
  },
  {
    id: 'div0', code: '#DIV/0!', category: 'code',
    title: '除数为 0 或为空',
    summary: '除法运算的分母是 0 或空单元格。',
    causes: [
      '分母单元格是 0 或还没有填数',
      '分母引用了空白区域',
      'AVERAGEIF/COUNTIF 结果为 0 时再拿去做除数'
    ],
    steps: [
      '检查分母单元格是否为 0 或空',
      '用 IF 先判断分母：分母为 0 时返回 0 或提示',
      '数据尚未填齐的报表，统一用 IFERROR 兜底显示'
    ],
    fixExample: '=IF(B2=0,0,A2/B2) 或 =IFERROR(A2/B2,"-")',
    pitfalls: ['整列计算时只兜底第一行，其他行照样报错', '空单元格参与除法等价于除以 0'],
    sample: '典型场景：人均成本 =总成本/人数，人数还没填。'
  },
  {
    id: 'name', code: '#NAME?', category: 'code',
    title: '函数名或名称引用写错了',
    summary: 'Excel 不认识公式里的某个名字。',
    causes: [
      '函数名拼写错误，比如 VLOKUP',
      '文本没加英文引号，被当成定义的名称',
      '使用了当前版本不支持的函数（如 XLOOKUP、IFS）',
      '中文标点混进了公式，比如全角引号、全角括号'
    ],
    steps: [
      '对照报错位置，检查函数拼写',
      '给所有文本内容补上英文半角引号',
      '确认 Excel/WPS 版本是否支持该函数',
      '重新手打出错片段，避免复制带入全角符号'
    ],
    fixExample: '错误：=IF(A2=已完成,"好","差")；修正：=IF(A2="已完成","好","差")。',
    pitfalls: ['全角引号“ ”肉眼几乎看不出来', '从聊天软件复制的公式常带全角字符'],
    sample: '典型场景：=IF(A2=已完成,"好","差")，文本没加引号。'
  },
  {
    id: 'num', code: '#NUM!', category: 'code',
    title: '数字超出可计算范围',
    summary: '结果太大、太小，或参数在数学上不成立。',
    causes: [
      '计算结果超过 Excel 数值上限（约 9.99×10^307）',
      '对负数开偶数次方、求对数等非法运算',
      'DATEDIF 开始日期晚于结束日期',
      '迭代函数（如 IRR）找不到解'
    ],
    steps: [
      '检查公式输入是否写错了数量级（多打一个 0）',
      '确认日期先后顺序，必要时用 ABS 或 IF 调整',
      'IRR 类函数补充一个猜测值参数再试',
      '拆分复杂公式，逐步定位出错环节'
    ],
    fixExample: '=DATEDIF(B2,A2,"D") 报 #NUM!：调换为 =DATEDIF(A2,B2,"D")，保证开始在前。',
    pitfalls: ['金额单位混用（元与万元）导致结果爆炸', '日期列实际是文本时，比较结果不可靠'],
    sample: '典型场景：DATEDIF 的结束日期填在了开始日期前面。'
  },
  {
    id: 'spill', code: '#SPILL!', category: 'code',
    title: '溢出区域被挡住',
    summary: '动态数组公式要输出多个结果，但目标区域被占用。',
    causes: [
      '溢出范围内已有内容（文字、空格、合并单元格）',
      '公式位于表格（超级表）内部',
      '溢出范围超出了工作表边界'
    ],
    steps: [
      '点击报错单元格，查看虚线框出的溢出范围',
      '清空该范围内的所有内容（包括看不见的空格）',
      '取消范围内的合并单元格',
      '把公式移出超级表，或改用普通区域'
    ],
    fixExample: 'UNIQUE(A2:A100) 要输出 20 行，但下方 B5 有残留内容：清空 B5 起的一片区域即可自动恢复。',
    pitfalls: ['只删了看得见的内容，空格没删', '旧版本不支持动态数组，会显示 #NAME? 而不是 #SPILL!'],
    sample: '典型场景：=UNIQUE(A2:A100) 下方几行还有旧数据。'
  },
  {
    id: 'no-recalc', code: '公式不自动计算', category: 'behavior',
    title: '改了数据，公式结果不刷新',
    summary: '计算模式被设为手动，或单元格格式问题。',
    causes: [
      '计算选项被切成了“手动”',
      '公式所在单元格格式是“文本”，公式变成普通文字',
      '公式是从别处复制来的，但没有触发重算'
    ],
    steps: [
      '按 F9 强制重算，看结果是否变化',
      '在“公式”选项卡把计算选项改回“自动”',
      '选中公式列，把格式从“文本”改为“常规”',
      '改完格式后双击单元格回车，让公式重新生效',
      '检查是否不小心开启了“显示公式”（Ctrl+`）'
    ],
    fixExample: '单元格显示 “=SUM(A2:A10)” 原文而不是结果：选中该列→格式改为常规→双击回车。',
    pitfalls: ['批量改格式后忘了双击回车，公式仍不生效', '手动模式下跨表引用也可能不刷新'],
    sample: '典型场景：从文本粘贴来的“公式”一直显示为文字。'
  },
  {
    id: 'date-display', code: '数字被显示成日期', category: 'behavior',
    title: '输入的数字变成了奇怪的日期',
    summary: '单元格格式是日期，数字被按日期序列号显示。',
    causes: [
      '该列之前输入过日期，格式被保留',
      '从其他表复制时带入了日期格式'
    ],
    steps: [
      '选中出问题的单元格或整列',
      '在“开始”选项卡把数字格式改为“常规”或“数值”',
      '如果内容已损坏，复制到新列并只粘贴数值'
    ],
    fixExample: '输入 45000 显示成 2023/3/15：把格式改为“常规”即恢复显示 45000。',
    pitfalls: ['改格式不会改变底层数值，只是显示方式', '日期和数字本质是同一个序列，别来回切换格式填数据'],
    sample: '典型场景：在日期列旁边录入数量 45000，变成 2023/3/15。'
  },
  {
    id: 'leading-zero', code: '前导零消失', category: 'behavior',
    title: '编号开头的 0 被自动去掉',
    summary: 'Excel 把编号当数字处理，前导零自动丢失。',
    causes: [
      '单元格格式是“常规”或“数值”，007 被存成 7',
      '从 CSV 直接双击打开，编号列被自动转换'
    ],
    steps: [
      '先把列格式设为“文本”，再输入或粘贴编号',
      '已经丢失的零：用 TEXT 补位，如 =TEXT(A2,"00000")',
      '打开 CSV 时用“数据→从文本导入”，指定该列为文本',
      '也可在输入时先打英文单引号，如 \'007'
    ],
    fixExample: '=TEXT(A2,"000000") 把 1234 补成 001234（六位编号）。',
    pitfalls: ['格式改成文本不会自动把零补回来，需要 TEXT 或重新录入', '导回系统前确认对方要求的是文本还是数字'],
    sample: '典型场景：员工编号 00123 输入后变成 123。'
  },
  {
    id: 'vlookup-miss', code: 'VLOOKUP 查不到结果', category: 'behavior',
    title: '明明有数据，VLOOKUP 却返回 #N/A',
    summary: '肉眼相同但实际不同：类型、空格或区域问题。',
    causes: [
      '查找列与结果列数据类型不一致（文本 vs 数字）',
      '首尾空格或换行符导致不相等',
      '数据区域首列不是查找列（VLOOKUP 只在首列找）',
      '区域未锁定，复制公式后引用整体偏移'
    ],
    steps: [
      '确认数据区域的第一列就是要查找的那一列',
      '对查找值用 TRIM 清理空格后重试',
      '用 TYPE 或观察对齐方式判断两列类型（数字默认右对齐，文本左对齐）',
      '类型不一致时统一：=VLOOKUP(VALUE(A2),...) 或 =VLOOKUP(TEXT(A2,"0"),...)',
      '给数据区域加 $ 锁定：$D$2:$F$100，再复制公式'
    ],
    fixExample: '=VLOOKUP(TRIM(TEXT(A2,"0")),$D$2:$F$100,2,FALSE)',
    pitfalls: ['向左查找 VLOOKUP 做不到，改用 INDEX+MATCH 或 XLOOKUP', '近似匹配模式查数字时要求首列升序排序'],
    sample: '典型场景：A2 是文本 "1001"，D 列是数字 1001。'
  },
  {
    id: 'copy-shift', code: '公式复制后引用错位', category: 'behavior',
    title: '公式一复制，结果就错了',
    summary: '相对引用随位置自动移动，没有锁定关键区域。',
    causes: [
      '引用写成了相对引用（A2），下移/右移后自动变化',
      '查表区域跟着公式一起偏移，查到了别的范围',
      '整行复制时忘了某列需要保持不变'
    ],
    steps: [
      '选中公式，按 F4 给需要固定的部分加 $（如 $A$2、$D$2:$F$100）',
      '明确区分：条件区域、查表区域通常要绝对锁定；逐行变化的值保持相对',
      '复制后抽查前几行结果，和手工核对一次',
      '大范围引用直接用整列写法（D:F）减少错位概率'
    ],
    fixExample: '错误：=VLOOKUP(A2,D2:F100,2,FALSE) 下拉后区域跟着下移；修正：=VLOOKUP(A2,$D$2:$F$100,2,FALSE)。',
    pitfalls: ['F4 要按在正确的位置上，$A2 和 A$2 含义不同', '跨表引用同样需要锁定表名后的区域'],
    sample: '典型场景：公式下拉 100 行，查表区域也跟着下移了 100 行。'
  }
])

function searchErrors(query, categoryId) {
  const terms = String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  return ERROR_GUIDES.filter((guide) => {
    if (categoryId && categoryId !== 'all' && guide.category !== categoryId) return false
    if (!terms.length) return true
    const searchable = `${guide.code} ${guide.title} ${guide.summary} ${guide.causes.join(' ')}`.toLowerCase()
    return terms.every((term) => searchable.includes(term))
  })
}

function getErrorGuide(id) {
  return ERROR_GUIDES.find((guide) => guide.id === id) || null
}

module.exports = {
  FORMULA_CATEGORIES,
  FORMULA_LIBRARY,
  searchFormulas,
  getFormulaByName,
  WIZARD_SCENARIOS,
  generateWizardFormula,
  ERROR_CATEGORIES,
  ERROR_GUIDES,
  searchErrors,
  getErrorGuide
}
