import type { CoverScene } from './coverScene'

export interface DreamCoverSize {
  width: number
  height: number
  pixelRatio?: number
}

function grainRandom(seed: number) {
  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    seed ^= seed + Math.imul(seed ^ (seed >>> 7), 61 | seed)
    return ((seed ^ (seed >>> 14)) >>> 0) / 4294967296
  }
}

export function renderDreamCover(
  canvas: HTMLCanvasElement,
  scene: CoverScene,
  { width, height, pixelRatio = 1 }: DreamCoverSize,
): void {
  const ratio = Math.max(1, pixelRatio)
  canvas.width = Math.max(1, Math.round(width * ratio))
  canvas.height = Math.max(1, Math.round(height * ratio))
  const context = canvas.getContext('2d')
  if (!context) return

  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, width, height)

  const horizon = height * 0.53
  const sky = context.createLinearGradient(0, 0, width, horizon)
  sky.addColorStop(0, scene.sky[0])
  sky.addColorStop(1, scene.sky[1])
  context.fillStyle = sky
  context.fillRect(0, 0, width, horizon)

  const water = context.createLinearGradient(0, horizon, width, height)
  water.addColorStop(0, scene.water[0])
  water.addColorStop(1, scene.water[1])
  context.fillStyle = water
  context.fillRect(0, horizon, width, height - horizon)

  const lightX = scene.light.x * width
  const lightY = scene.light.y * height
  const lightRadius = scene.light.radius * Math.min(width, height)
  const glow = context.createRadialGradient(lightX, lightY, 0, lightX, lightY, lightRadius * 2.8)
  glow.addColorStop(0, scene.light.color)
  glow.addColorStop(0.34, `${scene.light.color}c7`)
  glow.addColorStop(1, `${scene.light.color}00`)
  context.fillStyle = glow
  context.fillRect(lightX - lightRadius * 3, lightY - lightRadius * 3, lightRadius * 6, lightRadius * 6)

  context.fillStyle = scene.light.color
  context.beginPath()
  context.arc(lightX, lightY, lightRadius, 0, Math.PI * 2)
  context.fill()

  for (const star of scene.stars) {
    context.globalAlpha = star.alpha
    context.fillStyle = '#ffffff'
    context.beginPath()
    context.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2)
    context.fill()
  }

  context.lineCap = 'round'
  for (const ripple of scene.ripples) {
    context.globalAlpha = ripple.alpha
    context.strokeStyle = '#ffffff'
    context.lineWidth = Math.max(0.7, width / 420)
    context.beginPath()
    context.ellipse(
      ripple.x * width,
      ripple.y * height,
      ripple.width * width,
      Math.max(1, ripple.width * height * 0.035),
      0,
      0,
      Math.PI * 2,
    )
    context.stroke()
  }

  const haze = context.createLinearGradient(0, horizon - height * 0.12, 0, horizon + height * 0.16)
  haze.addColorStop(0, '#ffffff00')
  haze.addColorStop(0.48, `rgba(255, 255, 255, ${scene.fogOpacity})`)
  haze.addColorStop(1, '#ffffff00')
  context.globalAlpha = 1
  context.fillStyle = haze
  context.fillRect(0, horizon - height * 0.12, width, height * 0.28)

  const random = grainRandom(scene.grainSeed)
  const grains = Math.min(1800, Math.round((width * height) / 130))
  context.fillStyle = '#ffffff'
  for (let index = 0; index < grains; index += 1) {
    context.globalAlpha = 0.025 + random() * 0.045
    context.fillRect(random() * width, random() * height, 0.6, 0.6)
  }
  context.globalAlpha = 1
}
