// 表格文本整理：粘贴文本的本机清洗、拆分、提取与脱敏。
// 约定：只在本机处理，不保存用户原文到云端，也不进入匿名统计。

const MAX_INPUT_LENGTH = 20000
const MAX_COLUMNS = 20

const OPERATIONS = Object.freeze([
  Object.freeze({ id: 'remove-empty-lines', name: '删除空行', group: '基础清理', hint: '去掉没有任何内容的行' }),
  Object.freeze({ id: 'trim-lines', name: '去首尾空格', group: '基础清理', hint: '每行前后的空格清掉' }),
  Object.freeze({ id: 'merge-spaces', name: '整理连续空格', group: '基础清理', hint: '多个空格合成一个' }),
  Object.freeze({ id: 'dedupe', name: '按行去重', group: '基础清理', hint: '重复的行只保留第一条' }),
  Object.freeze({ id: 'natural-sort', name: '自然排序', group: '基础清理', hint: '项目2 会排在 项目10 前面' }),
  Object.freeze({ id: 'split-tabs', name: '按制表符拆分', group: '拆分与合并', hint: '表格复制来的横向内容拆成多行' }),
  Object.freeze({ id: 'multi-to-single', name: '多列转单列', group: '拆分与合并', hint: '横向多格内容纵向排成一列' }),
  Object.freeze({ id: 'single-to-multi', name: '单列转多列', group: '拆分与合并', hint: '按指定列数横向重新分组' }),
  Object.freeze({ id: 'extract-numbers', name: '提取数字', group: '提取', hint: '把文本里的数字逐行取出' }),
  Object.freeze({ id: 'extract-emails', name: '提取邮箱', group: '提取', hint: '找出所有邮箱地址' }),
  Object.freeze({ id: 'extract-phones', name: '提取手机号', group: '提取', hint: '找出 11 位大陆手机号' }),
  Object.freeze({ id: 'to-csv', name: '转 CSV', group: '格式转换', hint: '制表符转逗号，公式默认按文本处理' }),
  Object.freeze({ id: 'to-tsv', name: '转制表符文本', group: '格式转换', hint: '逗号转制表符，公式默认按文本处理' }),
  Object.freeze({ id: 'mask-phones', name: '手机号脱敏', group: '脱敏', hint: '138****5678' }),
  Object.freeze({ id: 'mask-emails', name: '邮箱脱敏', group: '脱敏', hint: 't***@example.com' }),
  Object.freeze({ id: 'mask-idcards', name: '身份证号脱敏', group: '脱敏', hint: '保留前 6 位和后 4 位' })
])

function splitLines(text) {
  return String(text).split(/\r\n|\r|\n/)
}

function lineCount(text) {
  if (typeof text !== 'string' || text === '') return 0
  return splitLines(text).length
}

function isWithinLimit(text) {
  return typeof text === 'string' && text.length <= MAX_INPUT_LENGTH
}

// 自然排序：按字符与数字块逐段比较，保证 2 < 10。
function naturalCompare(a, b) {
  const left = String(a)
  const right = String(b)
  let i = 0
  let j = 0
  while (i < left.length && j < right.length) {
    const ca = left[i]
    const cb = right[j]
    const digitA = ca >= '0' && ca <= '9'
    const digitB = cb >= '0' && cb <= '9'
    if (digitA && digitB) {
      const blockA = left.slice(i).match(/^\d+/)[0]
      const blockB = right.slice(j).match(/^\d+/)[0]
      const numberA = parseFloat(blockA)
      const numberB = parseFloat(blockB)
      if (numberA !== numberB) return numberA < numberB ? -1 : 1
      if (blockA.length !== blockB.length) return blockA.length < blockB.length ? -1 : 1
      i += blockA.length
      j += blockB.length
      continue
    }
    if (ca !== cb) return ca < cb ? -1 : 1
    i += 1
    j += 1
  }
  return left.length === right.length ? 0 : (left.length < right.length ? -1 : 1)
}

function maskPhone(match) {
  return `${match.slice(0, 3)}****${match.slice(7)}`
}

function maskEmail(match) {
  const atIndex = match.indexOf('@')
  const local = match.slice(0, atIndex)
  const domain = match.slice(atIndex)
  return `${local.slice(0, 1)}***${domain}`
}

function maskIdCard(match) {
  return `${match.slice(0, 6)}********${match.slice(14)}`
}

function extractCells(text) {
  // 以连续数字（可含结尾 X）为单元扫描，避免从长编号中间误提取。
  const tokens = String(text).match(/\d[\dXx]*/g) || []
  return tokens
}

function parseCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells
}

// 电子表格会把 =、+、-、@ 开头的单元格解释为公式。
// 检查时跳过常见空白、控制字符与零宽字符，输出时在原值最前方加单引号，
// 让 Excel/WPS 等按文本接收，同时保持普通文本和已中和值不变。
function neutralizeSpreadsheetCell(cell) {
  const text = String(cell)
  const comparable = text.replace(/^[\s\u0000-\u001F\u007F-\u009F\u200B-\u200D\u2060\uFEFF\u3000]*/, '')
  if (!/^[=+\-@]/.test(comparable)) return text
  return `'${text}`
}

function neutralizeTabularLine(line) {
  return String(line)
    .split('\t')
    .map(neutralizeSpreadsheetCell)
    .join('\t')
}

function toCsvCell(cell) {
  const text = String(cell)
  if (/[",]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function runOperation(text, operationId, options) {
  if (typeof text !== 'string' || !text.trim()) return null
  if (!isWithinLimit(text)) return null
  const operation = OPERATIONS.find((item) => item.id === operationId)
  if (!operation) return null

  const lines = splitLines(text)
  let outputLines = []

  switch (operationId) {
    case 'remove-empty-lines':
      outputLines = lines.filter((line) => line.trim() !== '')
      break
    case 'trim-lines':
      outputLines = lines.map((line) => line.trim())
      break
    case 'merge-spaces':
      outputLines = lines.map((line) => line.replace(/[ \u3000]{2,}/g, ' '))
      break
    case 'dedupe': {
      const seen = {}
      outputLines = []
      lines.forEach((line) => {
        const key = line.trim()
        if (key === '' || seen[key]) return
        seen[key] = true
        outputLines.push(key)
      })
      break
    }
    case 'natural-sort':
      outputLines = lines
        .filter((line) => line.trim() !== '')
        .map((line) => line.trim())
        .sort(naturalCompare)
      break
    case 'split-tabs':
      outputLines = lines.reduce((acc, line) => acc.concat(line.split('\t')), [])
      break
    case 'multi-to-single':
      outputLines = lines.reduce((acc, line) => {
        line.split('\t').forEach((cell) => {
          const value = cell.trim()
          if (value !== '') acc.push(value)
        })
        return acc
      }, [])
      break
    case 'single-to-multi': {
      const columns = options && parseInt(options.columns, 10)
      if (!columns || columns < 1 || columns > MAX_COLUMNS) return null
      const items = lines.map((line) => line.trim()).filter((line) => line !== '')
      outputLines = []
      for (let start = 0; start < items.length; start += columns) {
        outputLines.push(items.slice(start, start + columns).join('\t'))
      }
      break
    }
    case 'extract-numbers': {
      outputLines = String(text).match(/\d+(?:\.\d+)?/g) || []
      break
    }
    case 'extract-emails': {
      const seen = {}
      outputLines = []
      ;(String(text).match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g) || []).forEach((email) => {
        const key = email.toLowerCase()
        if (seen[key]) return
        seen[key] = true
        outputLines.push(email)
      })
      break
    }
    case 'extract-phones': {
      const seen = {}
      outputLines = []
      extractCells(text).forEach((token) => {
        if (/^1[3-9]\d{9}$/.test(token) && !seen[token]) {
          seen[token] = true
          outputLines.push(token)
        }
      })
      break
    }
    case 'to-csv':
      outputLines = lines
        .filter((line) => line.trim() !== '')
        .map((line) => line.split('\t').map((cell) => toCsvCell(neutralizeSpreadsheetCell(cell))).join(','))
      break
    case 'to-tsv':
      outputLines = lines
        .filter((line) => line.trim() !== '')
        .map((line) => parseCsvLine(line).map((cell) => cell.trim()).join('\t'))
      break
    case 'mask-phones':
      outputLines = lines.map((line) => line.replace(/1[3-9]\d{9}/g, maskPhone))
      break
    case 'mask-emails':
      outputLines = lines.map((line) => line.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g, maskEmail))
      break
    case 'mask-idcards':
      outputLines = lines.map((line) => line.replace(/\d{17}[\dXx]/g, maskIdCard))
      break
    default:
      return null
  }

  // 所有整理结果最终都能被复制回电子表格；统一保护换行/制表符单元格，
  // 避免通过去重、排序、拆列或脱敏等兄弟操作绕过 CSV/TSV 分支。
  const output = outputLines.map(neutralizeTabularLine).join('\n')
  return {
    operationId,
    output,
    inputLines: lineCount(text),
    outputLines: lineCount(output),
    inputChars: text.length,
    outputChars: output.length
  }
}

module.exports = {
  MAX_INPUT_LENGTH,
  MAX_COLUMNS,
  OPERATIONS,
  lineCount,
  isWithinLimit,
  naturalCompare,
  runOperation
}
