import { formatWorkIngredients, type WorkRecord } from '@/stores/works'

export type WorkFilterState = {
  startDate: string
  endDate: string
  baseLiquor: string
  minRating: number
}

export type WorkLongImageOptions = {
  includeSelfReview: boolean
}

const maxRecordsPerImage = 10
const imageWidth = 1080
const horizontalPadding = 56
const topPadding = 60
const bottomPadding = 56
const cardGap = 30
const cardPadding = 24
const photoSize = 176
const lineHeight = 27
const recordBottomBreathingRoom = 34

export const hasActiveWorkFilters = (filters: WorkFilterState) =>
  Boolean(filters.startDate || filters.endDate || filters.baseLiquor || filters.minRating)

const recordIncludesBaseLiquor = (record: WorkRecord, baseLiquor: string) => {
  if (!baseLiquor) return true
  if (record.ingredientGroups?.baseLiquors.includes(baseLiquor)) return true
  return record.ingredientsText.includes(baseLiquor)
}

export const filterWorkRecords = (
  records: readonly WorkRecord[],
  filters: WorkFilterState,
): WorkRecord[] =>
  records.filter((record) => {
    if (filters.startDate && record.madeAt < filters.startDate) return false
    if (filters.endDate && record.madeAt > filters.endDate) return false
    if (!recordIncludesBaseLiquor(record, filters.baseLiquor)) return false
    if (filters.minRating && record.rating < filters.minRating) return false
    return true
  })

export const getWorkExportBatches = (records: readonly WorkRecord[]) => {
  const batches: WorkRecord[][] = []
  for (let index = 0; index < records.length; index += maxRecordsPerImage) {
    batches.push(records.slice(index, index + maxRecordsPerImage))
  }
  return batches
}

export const getWorkLongImageText = (record: WorkRecord, options: WorkLongImageOptions) => {
  const ingredientsText = formatWorkIngredients(record)
  return [ingredientsText, options.includeSelfReview ? record.selfReview.trim() : ''].filter(
    Boolean,
  )
}

const splitTextByWidth = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const lines: string[] = []
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((paragraph) => {
      let current = ''
      Array.from(paragraph).forEach((character) => {
        const next = `${current}${character}`
        if (current && context.measureText(next).width > maxWidth) {
          lines.push(current)
          current = character
          return
        }
        current = next
      })
      if (current) lines.push(current)
    })
  return lines
}

const getRecordTextLines = (
  context: CanvasRenderingContext2D,
  record: WorkRecord,
  includeSelfReview: boolean,
  maxWidth: number,
) => {
  context.font = '28px sans-serif'
  const ingredients = splitTextByWidth(context, formatWorkIngredients(record), maxWidth)
  const selfReview = includeSelfReview ? splitTextByWidth(context, record.selfReview, maxWidth) : []
  return {
    ingredients,
    selfReview,
  }
}

const estimateRecordHeight = (
  context: CanvasRenderingContext2D,
  record: WorkRecord,
  includeSelfReview: boolean,
  contentWidth: number,
) => {
  const textWidth = contentWidth - photoSize - cardPadding
  const lines = getRecordTextLines(context, record, includeSelfReview, textWidth)
  const textHeight =
    96 +
    Math.max(1, lines.ingredients.length) * lineHeight +
    lines.selfReview.length * lineHeight +
    recordBottomBreathingRoom
  return Math.max(photoSize + cardPadding * 2, textHeight + cardPadding * 2)
}

const drawRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + radius)
  context.lineTo(x + width, y + height - radius)
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  context.lineTo(x + radius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
}

const loadImage = (source: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    if (!source) {
      resolve(null)
      return
    }
    const image = new Image()
    image.addEventListener('load', () => resolve(image), { once: true })
    image.addEventListener('error', () => resolve(null), { once: true })
    image.src = source
  })

const drawTextLines = (
  context: CanvasRenderingContext2D,
  lines: readonly string[],
  x: number,
  y: number,
  maxLines: number,
) => {
  lines.slice(0, maxLines).forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight)
  })
  return y + Math.min(lines.length, maxLines) * lineHeight
}

const drawRecord = async (
  context: CanvasRenderingContext2D,
  record: WorkRecord,
  options: WorkLongImageOptions,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  context.save()
  drawRoundedRect(context, x, y, width, height, 24)
  context.fillStyle = 'rgba(43, 30, 22, 0.92)'
  context.fill()
  context.strokeStyle = 'rgba(213, 179, 105, 0.28)'
  context.lineWidth = 1.4
  context.stroke()

  const imageX = x + cardPadding
  const imageY = y + cardPadding
  const image = await loadImage(record.photoDataUrl)
  drawRoundedRect(context, imageX, imageY, photoSize, photoSize, 18)
  context.clip()
  if (image) {
    const scale = Math.max(photoSize / image.naturalWidth, photoSize / image.naturalHeight)
    const drawWidth = image.naturalWidth * scale
    const drawHeight = image.naturalHeight * scale
    context.drawImage(
      image,
      imageX + (photoSize - drawWidth) / 2,
      imageY + (photoSize - drawHeight) / 2,
      drawWidth,
      drawHeight,
    )
  } else {
    context.fillStyle = '#16100d'
    context.fillRect(imageX, imageY, photoSize, photoSize)
    context.fillStyle = '#d5b369'
    context.font = '46px serif'
    context.textAlign = 'center'
    context.fillText('暮调', imageX + photoSize / 2, imageY + photoSize / 2 + 14)
    context.textAlign = 'start'
  }
  context.restore()

  const textX = imageX + photoSize + cardPadding
  const textWidth = width - photoSize - cardPadding * 3
  context.fillStyle = '#d5b369'
  context.font = '24px sans-serif'
  context.fillText(record.madeAt, textX, y + 46)
  context.fillStyle = '#fff8eb'
  context.font = '42px serif'
  context.fillText(record.cocktailName, textX, y + 94)

  context.fillStyle = '#c9beb0'
  context.font = '24px sans-serif'
  const rating = record.rating ? `${record.rating} 星` : '未评分'
  const mood = record.mood || '未记录口感'
  context.fillText(`评分：${rating}`, textX, y + 132)
  context.fillText(`口感：${mood}`, textX + textWidth / 2, y + 132)

  const lines = getRecordTextLines(context, record, options.includeSelfReview, textWidth)
  context.fillStyle = '#d8cec1'
  context.font = '24px sans-serif'
  const nextY = drawTextLines(context, lines.ingredients, textX, y + 160, 4)
  if (options.includeSelfReview && lines.selfReview.length) {
    context.fillStyle = '#fff8eb'
    drawTextLines(context, lines.selfReview, textX, nextY + 16, 3)
  }
}

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
        return
      }
      reject(new Error('无法生成长图，请稍后重试。'))
    }, 'image/png')
  })

export const renderWorkLongImage = async (
  records: readonly WorkRecord[],
  options: WorkLongImageOptions,
) => {
  const measuringCanvas = document.createElement('canvas')
  const measuringContext = measuringCanvas.getContext('2d')
  if (!measuringContext) throw new Error('当前浏览器不支持长图导出。')

  const contentWidth = imageWidth - horizontalPadding * 2
  const cardHeights = records.map((record) =>
    estimateRecordHeight(measuringContext, record, options.includeSelfReview, contentWidth),
  )
  const height =
    topPadding +
    92 +
    cardHeights.reduce((sum, item) => sum + item, 0) +
    Math.max(0, records.length - 1) * cardGap +
    bottomPadding

  const canvas = document.createElement('canvas')
  canvas.width = imageWidth
  canvas.height = Math.max(560, Math.ceil(height))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器不支持长图导出。')

  const gradient = context.createLinearGradient(0, 0, imageWidth, canvas.height)
  gradient.addColorStop(0, '#160f0c')
  gradient.addColorStop(0.42, '#2a1c15')
  gradient.addColorStop(1, '#0d0b0a')
  context.fillStyle = gradient
  context.fillRect(0, 0, imageWidth, canvas.height)

  context.fillStyle = '#d5b369'
  context.font = '24px sans-serif'
  context.fillText('TWILIGHT MIXBOOK', horizontalPadding, topPadding)
  context.fillStyle = '#fff8eb'
  context.font = '56px serif'
  context.fillText('我的调酒作品', horizontalPadding, topPadding + 62)

  let y = topPadding + 108
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    const cardHeight = cardHeights[index] ?? photoSize + cardPadding * 2
    if (!record) continue
    await drawRecord(context, record, options, horizontalPadding, y, contentWidth, cardHeight)
    y += cardHeight + cardGap
  }

  return canvasToBlob(canvas)
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const exportWorkLongImages = async (
  records: readonly WorkRecord[],
  options: WorkLongImageOptions,
  filenamePrefix: string,
) => {
  const batches = getWorkExportBatches(records)
  for (const [index, batch] of batches.entries()) {
    const blob = await renderWorkLongImage(batch, options)
    const suffix = batches.length > 1 ? `-${index + 1}` : ''
    downloadBlob(blob, `${filenamePrefix}${suffix}.png`)
  }
  return batches.length
}
