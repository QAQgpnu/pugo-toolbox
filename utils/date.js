const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Parse a YYYY-MM-DD calendar date into its UTC-midnight timestamp.
 * Returning a UTC value keeps calendar-day arithmetic independent of DST.
 */
function parseDate(value) {
  if (typeof value !== 'string') return null

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  // Set all UTC calendar fields together so years 0-99 and leap days validate correctly.
  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date.getTime()
}

function padNumber(value) {
  return String(value).padStart(2, '0')
}

/** Return the device-local calendar date as YYYY-MM-DD. */
function todayString(now) {
  const date = now === undefined ? new Date() : new Date(now)
  if (Number.isNaN(date.getTime())) return null

  return [
    String(date.getFullYear()).padStart(4, '0'),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate())
  ].join('-')
}

/** Return the absolute number of calendar-day boundaries between two dates. */
function daysBetween(startDate, endDate) {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  if (start === null || end === null) return null

  return Math.abs(Math.round((end - start) / DAY_MS))
}

/**
 * Describe a target date relative to a base date (today by default).
 * signedDays is positive for future dates and negative for past dates.
 */
function countdownFrom(targetDate, baseDate) {
  const base = parseDate(baseDate === undefined ? todayString() : baseDate)
  const target = parseDate(targetDate)
  if (base === null || target === null) return null

  const signedDays = Math.round((target - base) / DAY_MS)
  const days = Math.abs(signedDays)

  if (signedDays === 0) {
    return {
      status: 'today',
      prefix: '就是今天',
      days,
      signedDays,
      text: '就是今天'
    }
  }

  const status = signedDays > 0 ? 'future' : 'past'
  const prefix = signedDays > 0 ? '还有' : '已过去'

  return {
    status,
    prefix,
    days,
    signedDays,
    text: `${prefix} ${days} 天`
  }
}

function addCalendarDays(dateValue, dayOffset) {
  const timestamp = parseDate(dateValue)
  const numericOffset = Number(dayOffset)
  if (timestamp === null || !Number.isFinite(numericOffset)) return null

  const wholeDays = Math.trunc(numericOffset)
  if (Math.abs(wholeDays) > 365000) return null
  const shifted = new Date(timestamp + wholeDays * DAY_MS)
  const year = shifted.getUTCFullYear()
  if (year < 1 || year > 9999) return null

  return [
    String(year).padStart(4, '0'),
    padNumber(shifted.getUTCMonth() + 1),
    padNumber(shifted.getUTCDate())
  ].join('-')
}

module.exports = {
  parseDate,
  todayString,
  daysBetween,
  countdownFrom,
  addCalendarDays
}
