const PENSION_MONTHS_BY_AGE = Object.freeze({
  40: 233, 41: 230, 42: 226, 43: 223, 44: 220, 45: 216, 46: 212, 47: 208,
  48: 204, 49: 199, 50: 195, 51: 190, 52: 185, 53: 180, 54: 175, 55: 170,
  56: 164, 57: 158, 58: 152, 59: 145, 60: 139, 61: 132, 62: 125, 63: 117,
  64: 109, 65: 101, 66: 93, 67: 84, 68: 75, 69: 65, 70: 56
})

function finiteNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : NaN
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

function calculateHousingFund(base, personalRate, employerRate, currentBalance = 0, months = 12) {
  const monthlyBase = finiteNumber(base)
  const personal = finiteNumber(personalRate)
  const employer = finiteNumber(employerRate)
  const balance = finiteNumber(currentBalance)
  const projectionMonths = Math.round(finiteNumber(months))
  if (!(monthlyBase > 0 && monthlyBase <= 10000000)) return null
  if (!(personal >= 0 && personal <= 30 && employer >= 0 && employer <= 30)) return null
  if (!(balance >= 0 && balance <= 1000000000)) return null
  if (!(projectionMonths >= 1 && projectionMonths <= 600)) return null

  // 官方常见口径要求个人与单位月缴存额分别四舍五入到元后再相加。
  const personalMonthly = Math.round(monthlyBase * personal / 100)
  const employerMonthly = Math.round(monthlyBase * employer / 100)
  const totalMonthly = personalMonthly + employerMonthly
  return {
    base: monthlyBase,
    personalRate: personal,
    employerRate: employer,
    personalMonthly,
    employerMonthly,
    totalMonthly,
    personalAnnual: personalMonthly * 12,
    employerAnnual: employerMonthly * 12,
    totalAnnual: totalMonthly * 12,
    currentBalance: balance,
    projectionMonths,
    projectedContribution: totalMonthly * projectionMonths,
    projectedBalance: balance + totalMonthly * projectionMonths
  }
}

function pensionPaymentMonths(age) {
  const roundedAge = Math.round(finiteNumber(age))
  return PENSION_MONTHS_BY_AGE[roundedAge] || 0
}

function calculatePensionEstimate(calculationBase, averageIndex, contributionYears, accountBalance, retirementAge) {
  const base = finiteNumber(calculationBase)
  const index = finiteNumber(averageIndex)
  const years = finiteNumber(contributionYears)
  const balance = finiteNumber(accountBalance)
  const age = Math.round(finiteNumber(retirementAge))
  const paymentMonths = pensionPaymentMonths(age)
  if (!(base > 0 && base <= 1000000)) return null
  if (!(index >= 0.1 && index <= 5)) return null
  if (!(years > 0 && years <= 60)) return null
  if (!(balance >= 0 && balance <= 1000000000)) return null
  if (!paymentMonths) return null

  const indexedMonthlySalary = base * index
  const basicPension = (base + indexedMonthlySalary) / 2 * years * 0.01
  const accountPension = balance / paymentMonths
  return {
    calculationBase: base,
    averageIndex: index,
    contributionYears: years,
    accountBalance: balance,
    retirementAge: age,
    paymentMonths,
    indexedMonthlySalary: roundMoney(indexedMonthlySalary),
    basicPension: roundMoney(basicPension),
    accountPension: roundMoney(accountPension),
    estimatedMonthly: roundMoney(basicPension + accountPension),
    estimatedAnnual: roundMoney((basicPension + accountPension) * 12)
  }
}

module.exports = {
  PENSION_MONTHS_BY_AGE,
  roundMoney,
  calculateHousingFund,
  pensionPaymentMonths,
  calculatePensionEstimate
}
