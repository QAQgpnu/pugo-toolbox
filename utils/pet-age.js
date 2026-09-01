const PET_TYPES = Object.freeze([
  { id: 'cat', name: '猫咪' },
  { id: 'dog', name: '狗狗' }
])

const DOG_SIZES = Object.freeze([
  { id: 'small', name: '小型犬', annualRate: 4, seniorMonths: 120, hint: '成年体重通常小于 10 kg' },
  { id: 'medium', name: '中型犬', annualRate: 5, seniorMonths: 108, hint: '成年体重约 10–25 kg' },
  { id: 'large', name: '大型犬', annualRate: 6, seniorMonths: 84, hint: '成年体重约 25–40 kg' },
  { id: 'giant', name: '巨型犬', annualRate: 7, seniorMonths: 72, hint: '成年体重通常大于 40 kg' }
])

function validMonths(value) {
  const months = Number(value)
  return Number.isFinite(months) && months >= 1 && months <= 360 ? months : 0
}

function humanAgeForMonths(months, annualRate) {
  if (months <= 12) return months / 12 * 15
  if (months <= 24) return 15 + (months - 12) / 12 * 9
  return 24 + (months - 24) / 12 * annualRate
}

function lifeStage(type, size, months) {
  if (months < 6) return { id: 'baby', name: '幼崽期', note: '成长很快，注意按年龄安排饮食、免疫与活动。' }
  if (months < 18) return { id: 'young', name: '少年期', note: '精力旺盛，适合建立稳定的运动和行为习惯。' }
  const seniorMonths = type === 'cat' ? 132 : ((DOG_SIZES.find((item) => item.id === size) || DOG_SIZES[1]).seniorMonths)
  if (months >= seniorMonths) return { id: 'senior', name: '熟龄期', note: '可更留意体重、牙齿、关节和定期健康检查。' }
  if (months >= seniorMonths - 36) return { id: 'mature', name: '成熟期', note: '保持稳定体重和规律活动，观察日常状态变化。' }
  return { id: 'adult', name: '成年期', note: '身体相对稳定，继续保持规律饮食和活动。' }
}

function calculatePetAge(type, years, months = 0, dogSize = 'medium') {
  const wholeYears = Math.floor(Number(years))
  const extraMonths = Math.floor(Number(months))
  if (!(wholeYears >= 0 && wholeYears <= 30 && extraMonths >= 0 && extraMonths <= 11)) return null
  const totalMonths = wholeYears * 12 + extraMonths
  if (!validMonths(totalMonths)) return null
  const safeType = type === 'dog' ? 'dog' : type === 'cat' ? 'cat' : ''
  if (!safeType) return null
  const dog = DOG_SIZES.find((item) => item.id === dogSize) || DOG_SIZES[1]
  const annualRate = safeType === 'cat' ? 4 : dog.annualRate
  const humanAge = humanAgeForMonths(totalMonths, annualRate)
  const stage = lifeStage(safeType, dog.id, totalMonths)
  return {
    type: safeType,
    typeName: safeType === 'cat' ? '猫咪' : '狗狗',
    dogSize: dog.id,
    dogSizeName: dog.name,
    totalMonths,
    petAgeText: wholeYears ? `${wholeYears} 岁${extraMonths ? ` ${extraMonths} 个月` : ''}` : `${extraMonths} 个月`,
    humanAge: Math.max(1, Math.round(humanAge)),
    stage
  }
}

module.exports = {
  PET_TYPES,
  DOG_SIZES,
  validMonths,
  humanAgeForMonths,
  lifeStage,
  calculatePetAge
}
