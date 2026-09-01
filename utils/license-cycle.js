const cycle = require('./cycle')

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function anniversaryForYear(initialDate, year) {
  const source = cycle.parseLocalDate(initialDate)
  if (!source) return ''
  const month = source.getMonth()
  const day = Math.min(source.getDate(), daysInMonth(year, month))
  return cycle.formatLocalDate(new Date(year, month, day))
}

function calculateLicenseCycle(initialDate, deductedPoints, today) {
  const initial = cycle.parseLocalDate(initialDate)
  const now = cycle.parseLocalDate(today || cycle.formatLocalDate(new Date()))
  const points = Math.round(Number(deductedPoints))
  if (!initial || !now || initial.getTime() > now.getTime() || !(points >= 0 && points <= 99)) return null
  const thisAnniversary = anniversaryForYear(initialDate, now.getFullYear())
  const onOrAfter = String(today || cycle.formatLocalDate(now)) >= thisAnniversary
  const startYear = onOrAfter ? now.getFullYear() : now.getFullYear() - 1
  const periodStart = anniversaryForYear(initialDate, startYear)
  const nextPeriodStart = anniversaryForYear(initialDate, startYear + 1)
  const periodEnd = cycle.addDays(nextPeriodStart, -1)
  const daysRemaining = Math.max(0, cycle.daysBetween(today || cycle.formatLocalDate(now), nextPeriodStart))
  const remainingPoints = Math.max(0, 12 - points)
  return {
    initialDate,
    deductedPoints: points,
    remainingPoints,
    periodStart,
    periodEnd,
    nextPeriodStart,
    daysRemaining,
    risk: points >= 12 ? '请立即去交管 12123 核验状态和处理要求' : points >= 9 ? '剩余空间较少，请及时通过官方渠道核验' : '仍建议以交管 12123 的实时记录为准'
  }
}

module.exports = {
  daysInMonth,
  anniversaryForYear,
  calculateLicenseCycle
}
