function parseOptions(value) {
  const seen = new Set()
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false
      seen.add(item)
      return true
    })
}

function shuffleOptions(options, randomValue) {
  const random = typeof randomValue === 'function' ? randomValue : Math.random
  const shuffled = Array.isArray(options) ? options.slice() : []
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    const temporary = shuffled[index]
    shuffled[index] = shuffled[target]
    shuffled[target] = temporary
  }
  return shuffled
}

function groupOptions(options, groupCount, randomValue) {
  const count = Math.floor(Number(groupCount))
  if (!Array.isArray(options) || options.length < 2 || count < 2 || count > options.length) return []

  const groups = Array.from({ length: count }, () => [])
  shuffleOptions(options, randomValue).forEach((item, index) => {
    groups[index % count].push(item)
  })
  return groups
}

module.exports = {
  parseOptions,
  shuffleOptions,
  groupOptions
}
