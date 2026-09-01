function finiteNumber(value) {
  if (typeof value === 'string' && value.trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function percentageOf(partValue, totalValue) {
  const part = finiteNumber(partValue)
  const total = finiteNumber(totalValue)
  if (part === null || total === null || total === 0) return null
  return part / total * 100
}

function discountPrice(priceValue, discountValue) {
  const price = finiteNumber(priceValue)
  const discount = finiteNumber(discountValue)
  if (price === null || discount === null || price < 0 || discount < 0 || discount > 10) return null
  const finalPrice = price * discount / 10
  return { finalPrice, saved: price - finalPrice }
}

function percentageChange(oldValue, newValue) {
  const oldNumber = finiteNumber(oldValue)
  const newNumber = finiteNumber(newValue)
  if (oldNumber === null || newNumber === null || oldNumber === 0) return null
  return (newNumber - oldNumber) / Math.abs(oldNumber) * 100
}

module.exports = {
  finiteNumber,
  percentageOf,
  discountPrice,
  percentageChange
}
