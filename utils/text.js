const OPERATION_IDS = Object.freeze({
  REMOVE_EMPTY_LINES: 'remove-empty-lines',
  DEDUPE_LINES: 'dedupe-lines',
  MERGE_SPACES: 'merge-spaces',
  TRIM_LINES: 'trim-lines',
  SORT_LINES: 'sort-lines',
  NUMBER_LINES: 'number-lines',
  EXTRACT_LINKS: 'extract-links'
})

function normalizeText(value) {
  if (value === undefined || value === null) return ''
  return String(value).replace(/\r\n?/g, '\n')
}

function countText(value) {
  const text = normalizeText(value)
  return {
    characterCount: Array.from(text).length,
    lineCount: text ? text.split('\n').length : 0
  }
}

function extractLinks(value) {
  const matches = normalizeText(value).match(/https?:\/\/[^\s<>"'，。！？；：、）\]]+/gi) || []
  return Array.from(new Set(matches))
}

function processText(value, selectedOperations) {
  const operations = Array.isArray(selectedOperations) ? selectedOperations : []
  let lines = normalizeText(value).split('\n')

  if (operations.includes(OPERATION_IDS.MERGE_SPACES)) {
    lines = lines.map((line) => line.replace(/[\t\f\v ]+/g, ' '))
  }

  if (operations.includes(OPERATION_IDS.TRIM_LINES)) {
    lines = lines.map((line) => line.trim())
  }

  if (operations.includes(OPERATION_IDS.REMOVE_EMPTY_LINES)) {
    lines = lines.filter((line) => line.trim() !== '')
  }

  if (operations.includes(OPERATION_IDS.DEDUPE_LINES)) {
    const seen = new Set()
    lines = lines.filter((line) => {
      if (seen.has(line)) return false
      seen.add(line)
      return true
    })
  }

  if (operations.includes(OPERATION_IDS.SORT_LINES)) {
    lines = lines.slice().sort((left, right) => left.localeCompare(right, 'zh-CN', {
      numeric: true,
      sensitivity: 'base'
    }))
  }

  if (operations.includes(OPERATION_IDS.EXTRACT_LINKS)) {
    lines = extractLinks(lines.join('\n'))
  }

  if (operations.includes(OPERATION_IDS.NUMBER_LINES)) {
    let number = 0
    lines = lines.map((line) => {
      if (!line.trim()) return line
      number += 1
      return `${number}. ${line}`
    })
  }

  return lines.join('\n')
}

module.exports = {
  OPERATION_IDS,
  countText,
  extractLinks,
  processText
}
