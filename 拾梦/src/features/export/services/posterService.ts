import type { DreamRecord } from '@/features/dreams/model/dream'
import { openShimengDb } from '@/core/persistence/db'
import { createCoverScene } from '@/features/dreams/cover/coverScene'
import { renderDreamCover } from '@/features/dreams/cover/renderDreamCover'
import { createMediaRepository } from '@/features/media/data/mediaRepository'

import { layoutPosterText } from './posterLayout'

export type PosterMode = 'full' | 'summary'

export async function renderDreamPosters(
  dream: DreamRecord,
  mode: PosterMode = 'full',
): Promise<Blob[]> {
  const width = 1080
  const height = 1440
  const contentWidth = 880
  const measureCanvas = document.createElement('canvas')
  const measureContext = measureCanvas.getContext('2d')
  if (!measureContext) throw new Error('当前浏览器无法生成长图')

  const text = mode === 'summary' ? dream.summary?.trim() || dream.rawText : dream.rawText
  const pages = layoutPosterText(measureContext, text.trim() || '这个梦只留下了声音。', contentWidth, {
    fontSize: 36,
    minFontSize: 28,
    lineHeight: 1.72,
    maxHeight: 530,
    fontFamily: '"Songti SC", serif',
  })
  const cover = await createPosterCover(dream, width, 520)

  return Promise.all(
    pages.map(async (page) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('当前浏览器无法生成长图')

      context.fillStyle = '#efedf1'
      context.fillRect(0, 0, width, height)
      drawPaperGrain(context, width, height, page.pageNumber)

      if (page.pageNumber === 1) {
        context.drawImage(cover, 0, 0, width, 520)
        const fade = context.createLinearGradient(0, 390, 0, 570)
        fade.addColorStop(0, '#efedf100')
        fade.addColorStop(1, '#efedf1')
        context.fillStyle = fade
        context.fillRect(0, 390, width, 190)

        context.fillStyle = '#151827'
        context.font = '52px "Songti SC", serif'
        context.fillText(dream.title?.trim() || '未命名的梦', 100, 590, contentWidth)
        context.fillStyle = '#6f7080'
        context.font = '24px -apple-system, sans-serif'
        context.fillText(`${formattedDate(dream.dreamedAt)} · ${moodLabels[dream.mood]}`, 100, 640)
        if (dream.tags.length) context.fillText(dream.tags.slice(0, 5).map((tag) => `#${tag}`).join('  '), 100, 680)
      } else {
        context.fillStyle = '#151827'
        context.font = '28px "Songti SC", serif'
        context.fillText('拾梦', 100, 110)
        context.fillStyle = '#8b8b98'
        context.font = '20px -apple-system, sans-serif'
        context.textAlign = 'right'
        context.fillText(`${page.pageNumber} / ${page.totalPages}`, width - 100, 108)
        context.textAlign = 'left'
      }

      context.fillStyle = '#292d42'
      context.font = `${page.fontSize}px "Songti SC", serif`
      const startY = page.pageNumber === 1 ? 760 : 190
      const lineHeight = page.fontSize * 1.72
      page.lines.forEach((line, index) => context.fillText(line, 100, startY + index * lineHeight))

      context.fillStyle = '#8b8b98'
      context.font = '18px -apple-system, sans-serif'
      context.fillText(mode === 'summary' ? '梦境摘要 · 拾梦' : '原始梦境 · 拾梦', 100, height - 70)
      context.textAlign = 'right'
      context.fillText(`${page.pageNumber} / ${page.totalPages}`, width - 100, height - 70)
      context.textAlign = 'left'

      return canvasToBlob(canvas)
    }),
  )
}

const moodLabels: Record<DreamRecord['mood'], string> = {
  neutral: '说不清',
  calm: '平静',
  joyful: '欣喜',
  mysterious: '神秘',
  sad: '难过',
  anxious: '焦虑',
  fearful: '害怕',
  surreal: '超现实',
}

function formattedDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
}

async function createPosterCover(dream: DreamRecord, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器无法生成长图')

  if (dream.aiImageAssetId) {
    const repository = createMediaRepository(await openShimengDb())
    const asset = await repository.get(dream.aiImageAssetId)
    if (asset?.kind === 'ai-image') {
      const image = await loadImage(asset.blob)
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
      const drawWidth = image.naturalWidth * scale
      const drawHeight = image.naturalHeight * scale
      context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
      return canvas
    }
  }

  renderDreamCover(canvas, createCoverScene(dream), { width, height, pixelRatio: 1 })
  return canvas
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取本地梦境图片'))
    }
    image.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('长图生成失败'))
    }, 'image/png')
  })
}

function drawPaperGrain(context: CanvasRenderingContext2D, width: number, height: number, seed: number) {
  let value = seed * 9973
  context.fillStyle = '#ffffff'
  for (let index = 0; index < 900; index += 1) {
    value = (value * 1664525 + 1013904223) >>> 0
    const x = (value / 0xffffffff) * width
    value = (value * 1664525 + 1013904223) >>> 0
    const y = (value / 0xffffffff) * height
    context.globalAlpha = 0.035
    context.fillRect(x, y, 1, 1)
  }
  context.globalAlpha = 1
}
