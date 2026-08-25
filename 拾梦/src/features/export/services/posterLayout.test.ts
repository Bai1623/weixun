import { describe, expect, it } from 'vitest'

import { layoutPosterText } from './posterLayout'

function contextWithCharacterWidth(width: number) {
  return {
    font: '',
    measureText: (text: string) => ({ width: Array.from(text).length * width }) as TextMetrics,
  }
}

describe('layoutPosterText', () => {
  it('keeps a short dream on one page with readable type', () => {
    const pages = layoutPosterText(contextWithCharacterWidth(30), '月亮落在水面上。', 840, {
      maxHeight: 760,
      fontSize: 36,
      minFontSize: 28,
    })

    expect(pages).toHaveLength(1)
    expect(pages[0]!.fontSize).toBeGreaterThanOrEqual(28)
  })

  it('wraps long Chinese text across pages without exceeding the content width', () => {
    const context = contextWithCharacterWidth(30)
    const pages = layoutPosterText(context, '雾里的水面有一扇门。'.repeat(90), 840, {
      maxHeight: 420,
      fontSize: 36,
      minFontSize: 28,
      lineHeight: 1.7,
    })

    expect(pages.length).toBeGreaterThan(1)
    for (const page of pages) {
      expect(page.fontSize).toBeGreaterThanOrEqual(28)
      expect(page.totalPages).toBe(pages.length)
      for (const line of page.lines) expect(context.measureText(line).width).toBeLessThanOrEqual(840)
    }
  })

  it('preserves explicit paragraph breaks', () => {
    const pages = layoutPosterText(contextWithCharacterWidth(20), '第一段。\n第二段。', 840)
    expect(pages[0]!.lines).toContain('')
  })
})
