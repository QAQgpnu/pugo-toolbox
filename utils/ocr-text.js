function cleanIngredientOcrText(value) {
  return String(value || '')
    .replace(/\r/g, '\n')
    .replace(/(?:全)?成分(?:表)?\s*[:：]?/gi, '')
    .replace(/ingredients?\s*[:：]?/gi, '')
    .replace(/[|丨]/g, '、')
    .replace(/[，,；;\n]+/g, '、')
    .replace(/\s*、\s*/g, '、')
    .replace(/、{2,}/g, '、')
    .replace(/^、|、$/g, '')
    .trim()
    .slice(0, 4000)
}

function pickOcrText(anchors) {
  const list = Array.isArray(anchors) ? anchors : []
  const candidates = list
    .map((anchor) => {
      const text = String(anchor && anchor.text || '').trim()
      const subtext = String(anchor && anchor.subtext || '').trim()
      return cleanIngredientOcrText(text || subtext)
    })
    .filter(Boolean)
  if (!candidates.length) return ''
  const unique = candidates.filter((text, index) => candidates.indexOf(text) === index)
  return cleanIngredientOcrText(unique.join('、'))
}

module.exports = { cleanIngredientOcrText, pickOcrText }
