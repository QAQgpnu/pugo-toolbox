const DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
const SMALL_UNITS = ['', '拾', '佰', '仟']
const GROUP_UNITS = ['', '万', '亿']
const MAX_INTEGER_DIGITS = 12

function normalizeAmount(input) {
  const value = String(input == null ? '' : input)
    .trim()
    .replace(/[￥¥,，\s]/g, '')

  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null
  const parts = value.split('.')
  const integer = parts[0].replace(/^0+(?=\d)/, '')
  if (integer.length > MAX_INTEGER_DIGITS) return null
  const decimal = (parts[1] || '').padEnd(2, '0')
  return { integer, decimal, normalized: `${integer}.${decimal}` }
}

function convertFourDigits(value) {
  const source = String(Number(value))
  if (source === '0') return ''
  let output = ''
  let pendingZero = false

  for (let index = 0; index < source.length; index += 1) {
    const digit = Number(source[index])
    const position = source.length - index - 1
    if (digit === 0) {
      if (output) pendingZero = true
      continue
    }
    if (pendingZero) output += DIGITS[0]
    output += DIGITS[digit] + SMALL_UNITS[position]
    pendingZero = false
  }
  return output
}

function convertInteger(integer) {
  if (Number(integer) === 0) return DIGITS[0]
  const groups = []
  for (let end = integer.length; end > 0; end -= 4) {
    groups.push(integer.slice(Math.max(0, end - 4), end))
  }

  let output = ''
  let pendingZero = false
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const value = Number(groups[index])
    if (value === 0) {
      if (output) pendingZero = true
      continue
    }
    if (output && (pendingZero || value < 1000)) output += DIGITS[0]
    output += convertFourDigits(groups[index]) + GROUP_UNITS[index]
    pendingZero = false
  }
  return output
}

function toChineseUppercase(input) {
  const amount = normalizeAmount(input)
  if (!amount) return null

  const integerValue = Number(amount.integer)
  const jiao = Number(amount.decimal[0])
  const fen = Number(amount.decimal[1])
  if (integerValue === 0 && jiao === 0 && fen === 0) return '零元整'

  let output = integerValue > 0 ? `${convertInteger(amount.integer)}元` : ''
  if (jiao > 0) output += `${DIGITS[jiao]}角`
  if (fen > 0) {
    if (integerValue > 0 && jiao === 0) output += DIGITS[0]
    output += `${DIGITS[fen]}分`
  }
  if (jiao === 0 && fen === 0) output += '整'
  return output
}

module.exports = {
  MAX_INTEGER_DIGITS,
  normalizeAmount,
  convertFourDigits,
  convertInteger,
  toChineseUppercase
}
