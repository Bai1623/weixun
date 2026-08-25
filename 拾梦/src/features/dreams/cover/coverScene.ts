import type { DreamRecord } from '../model/dream'

export interface CoverScene {
  sky: [string, string]
  water: [string, string]
  fogOpacity: number
  light: { x: number; y: number; radius: number; color: string }
  stars: Array<{ x: number; y: number; radius: number; alpha: number }>
  ripples: Array<{ x: number; y: number; width: number; alpha: number }>
  grainSeed: number
}

interface CoverPalette {
  sky: [string, string]
  water: [string, string]
  light: string
}

const palettes: Record<DreamRecord['mood'], CoverPalette> = {
  neutral: {
    sky: ['#b9bdcd', '#eadfe4'],
    water: ['#858da4', '#cbd0da'],
    light: '#fff8e8',
  },
  calm: {
    sky: ['#899eaa', '#d8ddd9'],
    water: ['#496d78', '#b8cac8'],
    light: '#f4f0d8',
  },
  joyful: {
    sky: ['#d5a9bb', '#f3d8bd'],
    water: ['#9f7690', '#e8c5b7'],
    light: '#fff1c9',
  },
  mysterious: {
    sky: ['#343951', '#9b8fa8'],
    water: ['#1f3040', '#756f8d'],
    light: '#f7e9d3',
  },
  sad: {
    sky: ['#718392', '#bdc4cc'],
    water: ['#425766', '#8b9eaa'],
    light: '#e8edf0',
  },
  anxious: {
    sky: ['#715b6f', '#b68a91'],
    water: ['#493e55', '#866d7b'],
    light: '#f2d6c4',
  },
  fearful: {
    sky: ['#151827', '#393d57'],
    water: ['#25293d', '#090b14'],
    light: '#d5d3c8',
  },
  surreal: {
    sky: ['#786e9d', '#d3a5c5'],
    water: ['#4e557d', '#b18daf'],
    light: '#f7e4d8',
  },
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number) {
  return () => {
    seed += 0x6d2b79f5
    let value = seed
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function rounded(value: number): number {
  return Math.round(value * 10_000) / 10_000
}

export function createCoverScene(record: DreamRecord): CoverScene {
  const seed = hashString(`${record.coverSeed}:${record.mood}`)
  const random = mulberry32(seed)
  const palette = palettes[record.mood]

  return {
    sky: palette.sky,
    water: palette.water,
    fogOpacity: rounded(0.12 + (5 - record.clarity) * 0.1),
    light: {
      x: rounded(0.22 + random() * 0.56),
      y: rounded(0.13 + random() * 0.2),
      radius: rounded(0.08 + random() * 0.08),
      color: palette.light,
    },
    stars: Array.from({ length: 18 }, () => ({
      x: rounded(0.05 + random() * 0.9),
      y: rounded(0.05 + random() * 0.42),
      radius: rounded(0.45 + random() * 1.25),
      alpha: rounded(0.28 + random() * 0.62),
    })),
    ripples: Array.from({ length: 9 }, () => ({
      x: rounded(0.08 + random() * 0.84),
      y: rounded(0.57 + random() * 0.35),
      width: rounded(0.08 + random() * 0.28),
      alpha: rounded(0.08 + random() * 0.2),
    })),
    grainSeed: Math.floor(random() * 0xffffffff),
  }
}
