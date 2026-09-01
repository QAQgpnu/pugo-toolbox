const MAX_PROCESSING_LONG_EDGE = 900

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value))
}

function median(values) {
  if (!values.length) return 0
  const sorted = values.slice().sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2)
}

function colorDistance(left, right) {
  const red = left[0] - right[0]
  const green = left[1] - right[1]
  const blue = left[2] - right[2]
  return Math.sqrt(red * red + green * green + blue * blue)
}

function readColor(data, pixelIndex) {
  const offset = pixelIndex * 4
  return [data[offset], data[offset + 1], data[offset + 2]]
}

function collectCornerColors(data, width, height) {
  const patchWidth = clamp(Math.round(width * 0.08), 2, 48)
  const patchHeight = clamp(Math.round(height * 0.08), 2, 48)
  const corners = [
    [0, 0],
    [width - patchWidth, 0],
    [0, height - patchHeight],
    [width - patchWidth, height - patchHeight]
  ]
  return corners.map(([startX, startY]) => {
    const red = []
    const green = []
    const blue = []
    for (let y = startY; y < startY + patchHeight; y += 1) {
      for (let x = startX; x < startX + patchWidth; x += 1) {
        const offset = (y * width + x) * 4
        if (data[offset + 3] < 32) continue
        red.push(data[offset])
        green.push(data[offset + 1])
        blue.push(data[offset + 2])
      }
    }
    return [median(red), median(green), median(blue)]
  })
}

function estimateBackground(data, width, height) {
  const corners = collectCornerColors(data, width, height)
  let medoidIndex = 0
  let medoidDistance = Infinity
  corners.forEach((candidate, index) => {
    const total = corners.reduce((sum, item) => sum + colorDistance(candidate, item), 0)
    if (total < medoidDistance) {
      medoidIndex = index
      medoidDistance = total
    }
  })
  const ranked = corners
    .map((color, index) => ({ color, index, distance: colorDistance(color, corners[medoidIndex]) }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 3)
  const color = [
    median(ranked.map((item) => item.color[0])),
    median(ranked.map((item) => item.color[1])),
    median(ranked.map((item) => item.color[2]))
  ]
  const cornerSpread = median(ranked.map((item) => colorDistance(item.color, color)))
  return {
    color,
    tolerance: clamp(Math.round(42 + cornerSpread * 1.5), 42, 78),
    corners
  }
}

function pixelDistance(data, pixelIndex, background) {
  const offset = pixelIndex * 4
  const red = data[offset] - background[0]
  const green = data[offset + 1] - background[1]
  const blue = data[offset + 2] - background[2]
  return Math.sqrt(red * red + green * green + blue * blue)
}

function createConnectedMask(data, width, height, background, tolerance) {
  const total = width * height
  const mask = new Uint8Array(total)
  const queued = new Uint8Array(total)
  const queue = new Int32Array(total)
  let head = 0
  let tail = 0

  function enqueue(pixelIndex) {
    if (pixelIndex < 0 || pixelIndex >= total || queued[pixelIndex]) return
    queued[pixelIndex] = 1
    if (data[pixelIndex * 4 + 3] < 16 || pixelDistance(data, pixelIndex, background) <= tolerance) {
      queue[tail] = pixelIndex
      tail += 1
    }
  }

  for (let x = 0; x < width; x += 1) enqueue(x)
  for (let y = 1; y < height; y += 1) {
    enqueue(y * width)
    enqueue(y * width + width - 1)
  }

  while (head < tail) {
    const pixelIndex = queue[head]
    head += 1
    mask[pixelIndex] = 1
    const x = pixelIndex % width
    if (x > 0) enqueue(pixelIndex - 1)
    if (x < width - 1) enqueue(pixelIndex + 1)
    if (pixelIndex >= width) enqueue(pixelIndex - width)
    if (pixelIndex < total - width) enqueue(pixelIndex + width)
  }
  return { mask, count: tail }
}

function removeConnectedBackground(input, width, height) {
  if (!input || input.length !== width * height * 4 || width < 2 || height < 2) {
    throw Object.assign(new Error('图片像素无效'), { code: 'INVALID_IMAGE_PIXELS' })
  }
  const estimate = estimateBackground(input, width, height)
  const connected = createConnectedMask(input, width, height, estimate.color, estimate.tolerance)
  const coverage = connected.count / (width * height)
  if (coverage < 0.03) {
    throw Object.assign(new Error('没有识别到足够的连通纯色背景'), { code: 'BACKGROUND_NOT_FOUND' })
  }
  if (coverage > 0.94) {
    throw Object.assign(new Error('人物与背景颜色过于接近'), { code: 'FOREGROUND_NOT_FOUND' })
  }

  const output = new Uint8ClampedArray(input)
  const featherWidth = 18
  for (let pixelIndex = 0; pixelIndex < connected.mask.length; pixelIndex += 1) {
    if (!connected.mask[pixelIndex]) continue
    const offset = pixelIndex * 4
    const distance = pixelDistance(input, pixelIndex, estimate.color)
    const opacity = clamp(Math.round(((distance - (estimate.tolerance - featherWidth)) / featherWidth) * 255), 0, 255)
    output[offset + 3] = Math.min(output[offset + 3], opacity)
  }
  return {
    data: output,
    background: estimate.color,
    tolerance: estimate.tolerance,
    backgroundPixels: connected.count,
    coverage
  }
}

module.exports = {
  MAX_PROCESSING_LONG_EDGE,
  collectCornerColors,
  estimateBackground,
  createConnectedMask,
  removeConnectedBackground
}
