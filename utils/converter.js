const CATEGORY_CONFIG = Object.freeze({
  length: Object.freeze({
    id: 'length',
    label: '长度',
    units: Object.freeze([
      Object.freeze({ id: 'millimeter', label: '毫米', symbol: 'mm', factor: 0.001 }),
      Object.freeze({ id: 'centimeter', label: '厘米', symbol: 'cm', factor: 0.01 }),
      Object.freeze({ id: 'meter', label: '米', symbol: 'm', factor: 1 }),
      Object.freeze({ id: 'kilometer', label: '千米', symbol: 'km', factor: 1000 }),
      Object.freeze({ id: 'inch', label: '英寸', symbol: 'in', factor: 0.0254 }),
      Object.freeze({ id: 'foot', label: '英尺', symbol: 'ft', factor: 0.3048 })
    ])
  }),
  weight: Object.freeze({
    id: 'weight',
    label: '重量',
    units: Object.freeze([
      Object.freeze({ id: 'milligram', label: '毫克', symbol: 'mg', factor: 0.000001 }),
      Object.freeze({ id: 'gram', label: '克', symbol: 'g', factor: 0.001 }),
      Object.freeze({ id: 'jin', label: '斤', symbol: '斤', factor: 0.5 }),
      Object.freeze({ id: 'kilogram', label: '千克', symbol: 'kg', factor: 1 }),
      Object.freeze({ id: 'tonne', label: '吨', symbol: 't', factor: 1000 }),
      Object.freeze({ id: 'ounce', label: '盎司', symbol: 'oz', factor: 0.028349523125 }),
      Object.freeze({ id: 'pound', label: '磅', symbol: 'lb', factor: 0.45359237 })
    ])
  }),
  area: Object.freeze({
    id: 'area',
    label: '面积',
    units: Object.freeze([
      Object.freeze({ id: 'squareMillimeter', label: '平方毫米', symbol: 'mm²', factor: 0.000001 }),
      Object.freeze({ id: 'squareCentimeter', label: '平方厘米', symbol: 'cm²', factor: 0.0001 }),
      Object.freeze({ id: 'squareMeter', label: '平方米', symbol: 'm²', factor: 1 }),
      Object.freeze({ id: 'mu', label: '亩', symbol: '亩', factor: 666.6666666666667 }),
      Object.freeze({ id: 'hectare', label: '公顷', symbol: 'ha', factor: 10000 }),
      Object.freeze({ id: 'squareKilometer', label: '平方千米', symbol: 'km²', factor: 1000000 }),
      Object.freeze({ id: 'squareFoot', label: '平方英尺', symbol: 'ft²', factor: 0.09290304 })
    ])
  }),
  volume: Object.freeze({
    id: 'volume',
    label: '体积',
    units: Object.freeze([
      Object.freeze({ id: 'milliliter', label: '毫升', symbol: 'mL', factor: 0.001 }),
      Object.freeze({ id: 'liter', label: '升', symbol: 'L', factor: 1 }),
      Object.freeze({ id: 'cubicMeter', label: '立方米', symbol: 'm³', factor: 1000 }),
      Object.freeze({ id: 'usGallon', label: '美制加仑', symbol: 'gal', factor: 3.785411784 })
    ])
  }),
  speed: Object.freeze({
    id: 'speed',
    label: '速度',
    units: Object.freeze([
      Object.freeze({ id: 'meterPerSecond', label: '米/秒', symbol: 'm/s', factor: 1 }),
      Object.freeze({ id: 'kilometerPerHour', label: '千米/时', symbol: 'km/h', factor: 1 / 3.6 }),
      Object.freeze({ id: 'milePerHour', label: '英里/时', symbol: 'mph', factor: 0.44704 }),
      Object.freeze({ id: 'knot', label: '节', symbol: 'kn', factor: 0.5144444444444445 })
    ])
  }),
  time: Object.freeze({
    id: 'time',
    label: '时间',
    units: Object.freeze([
      Object.freeze({ id: 'second', label: '秒', symbol: 's', factor: 1 }),
      Object.freeze({ id: 'minute', label: '分钟', symbol: 'min', factor: 60 }),
      Object.freeze({ id: 'hour', label: '小时', symbol: 'h', factor: 3600 }),
      Object.freeze({ id: 'day', label: '天', symbol: 'd', factor: 86400 }),
      Object.freeze({ id: 'week', label: '周', symbol: '周', factor: 604800 })
    ])
  }),
  data: Object.freeze({
    id: 'data',
    label: '容量',
    units: Object.freeze([
      Object.freeze({ id: 'byte', label: '字节', symbol: 'B', factor: 1 }),
      Object.freeze({ id: 'kilobyte', label: 'KB', symbol: 'KB', factor: 1024 }),
      Object.freeze({ id: 'megabyte', label: 'MB', symbol: 'MB', factor: 1048576 }),
      Object.freeze({ id: 'gigabyte', label: 'GB', symbol: 'GB', factor: 1073741824 }),
      Object.freeze({ id: 'terabyte', label: 'TB', symbol: 'TB', factor: 1099511627776 })
    ])
  }),
  temperature: Object.freeze({
    id: 'temperature',
    label: '温度',
    units: Object.freeze([
      Object.freeze({ id: 'celsius', label: '摄氏度', symbol: '°C' }),
      Object.freeze({ id: 'fahrenheit', label: '华氏度', symbol: '°F' }),
      Object.freeze({ id: 'kelvin', label: '开尔文', symbol: 'K' })
    ])
  })
})

function findUnit(category, unitId) {
  if (!category) return null
  return category.units.find((unit) => unit.id === unitId) || null
}

function temperatureToCelsius(value, unitId) {
  if (unitId === 'celsius') return value
  if (unitId === 'fahrenheit') return (value - 32) * 5 / 9
  if (unitId === 'kelvin') return value - 273.15
  return NaN
}

function celsiusToTemperature(value, unitId) {
  if (unitId === 'celsius') return value
  if (unitId === 'fahrenheit') return value * 9 / 5 + 32
  if (unitId === 'kelvin') return value + 273.15
  return NaN
}

function convertValue(value, categoryId, fromUnitId, toUnitId) {
  if (typeof value === 'string' && value.trim() === '') return NaN
  const numericValue = Number(value)
  const category = CATEGORY_CONFIG[categoryId]
  const fromUnit = findUnit(category, fromUnitId)
  const toUnit = findUnit(category, toUnitId)

  if (!Number.isFinite(numericValue) || !fromUnit || !toUnit) return NaN
  if (fromUnitId === toUnitId) return numericValue

  if (categoryId === 'temperature') {
    const celsius = temperatureToCelsius(numericValue, fromUnitId)
    return celsiusToTemperature(celsius, toUnitId)
  }

  return numericValue * fromUnit.factor / toUnit.factor
}

function trimTrailingZeros(value) {
  const parts = value.split('e')
  const coefficient = parts[0]
    .replace(/(\.\d*?[1-9])0+$/, '$1')
    .replace(/\.0+$/, '')
  if (parts.length === 1) return coefficient
  return `${coefficient}e${Number(parts[1])}`
}

function formatNumber(value) {
  if (typeof value === 'string' && value.trim() === '') return ''
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return ''
  if (Object.is(numericValue, -0) || Math.abs(numericValue) < 1e-12) return '0'

  const absoluteValue = Math.abs(numericValue)
  if (absoluteValue >= 1e12 || absoluteValue < 1e-8) {
    return trimTrailingZeros(numericValue.toExponential(8))
  }

  return String(Number(numericValue.toPrecision(12)))
}

module.exports = {
  CATEGORY_CONFIG,
  convertValue,
  formatNumber
}
