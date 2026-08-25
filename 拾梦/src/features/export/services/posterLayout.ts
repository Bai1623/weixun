export interface PosterPage {
  lines: string[]
  pageNumber: number
  totalPages: number
  fontSize: number
}

export interface PosterLayoutOptions {
  fontSize?: number
  minFontSize?: number
  lineHeight?: number
  maxHeight?: number
  fontFamily?: string
}

export function layoutPosterText(
  context: Pick<CanvasRenderingContext2D, 'font' | 'measureText'>,
  text: string,
  width: number,
  options: PosterLayoutOptions = {},
): PosterPage[] {
  const fontSize = Math.max(options.minFontSize ?? 28, options.fontSize ?? 36)
  const lineHeight = options.lineHeight ?? 1.7
  const maxHeight = options.maxHeight ?? 760
  const maxLines = Math.max(1, Math.floor(maxHeight / (fontSize * lineHeight)))
  context.font = `${fontSize}px ${options.fontFamily ?? 'serif'}`

  const lines: string[] = []
  const paragraphs = text.replace(/\r\n?/g, '\n').split('\n')
  paragraphs.forEach((paragraph, paragraphIndex) => {
    if (paragraphIndex > 0) lines.push('')
    if (!paragraph) return

    let line = ''
    for (const character of Array.from(paragraph)) {
      const candidate = `${line}${character}`
      if (line && context.measureText(candidate).width > width) {
        lines.push(line)
        line = character
      } else {
        line = candidate
      }
    }
    if (line) lines.push(line)
  })
  if (!lines.length) lines.push('')

  const totalPages = Math.ceil(lines.length / maxLines)
  return Array.from({ length: totalPages }, (_, index) => ({
    lines: lines.slice(index * maxLines, (index + 1) * maxLines),
    pageNumber: index + 1,
    totalPages,
    fontSize,
  }))
}
