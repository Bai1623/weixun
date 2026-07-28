<template>
  <div class="daily-wheel mx-auto max-w-md text-center" :class="{ 'is-spinning': spinning }">
    <div class="wheel-stage relative mx-auto aspect-square w-full max-w-96">
      <div class="wheel-ambient" />
      <div class="wheel-pointer" />
      <div
        class="wheel-disc absolute inset-4 rounded-full transition-transform"
        :style="{
          transform: `rotate(${rotation}deg)`,
          transitionDuration: spinning ? '3200ms' : '300ms',
          background: wheelGradient,
        }"
      >
        <div class="wheel-glass" />
        <div class="wheel-sweep" />
        <div
          v-for="tick in ticks"
          :key="tick"
          class="wheel-tick"
          :style="{ transform: `rotate(${tick * segment}deg)` }"
        />
        <div
          v-for="(item, index) in candidates"
          :key="item.slug"
          class="wheel-label absolute left-1/2 top-1/2 w-1/2 origin-left text-left text-xs text-cream"
          :style="{ transform: `rotate(${index * segment}deg)` }"
        >
          <span class="ml-12 inline-block max-w-28 truncate rounded-md px-2 py-1">
            {{ item.nameZh }}
          </span>
        </div>
        <div class="wheel-center">
          <span>{{ spinning ? 'Shaking' : 'Tonight' }}</span>
        </div>
      </div>
    </div>
    <button
      class="wheel-action mt-6 rounded-md bg-gold px-6 py-3 text-sm font-semibold text-obsidian transition hover:bg-gold/90 focus:outline-none focus:ring-2 focus:ring-cream disabled:cursor-not-allowed disabled:opacity-60"
      type="button"
      :disabled="spinning"
      @click="$emit('spin')"
    >
      {{ spinning ? '正在选择' : '开始选择' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { Cocktail } from '@/types/cocktail'

const props = defineProps<{
  candidates: Cocktail[]
  rotation: number
  spinning: boolean
}>()

defineEmits<{
  spin: []
}>()

const segment = computed(() => 360 / props.candidates.length)
const ticks = computed(() => Array.from({ length: props.candidates.length }, (_, index) => index))
const segmentColors = [
  'rgba(182,108,50,0.92)',
  'rgba(122,62,47,0.92)',
  'rgba(223,199,141,0.88)',
  'rgba(70,46,33,0.96)',
]
const wheelGradient = computed(() => {
  const size = 100 / props.candidates.length
  const stops = props.candidates.flatMap((_item, index) => {
    const start = (index * size).toFixed(3)
    const end = ((index + 1) * size).toFixed(3)
    const color = segmentColors[index % segmentColors.length]
    return [`${color} ${start}%`, `${color} ${end}%`]
  })
  return `conic-gradient(from -90deg, ${stops.join(', ')})`
})
</script>

<style scoped>
.wheel-stage {
  filter: drop-shadow(0 1.5rem 3rem rgba(0, 0, 0, 0.38));
}

.wheel-ambient {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background:
    radial-gradient(circle at 50% 50%, rgba(223, 199, 141, 0.18), transparent 56%),
    conic-gradient(
      from 180deg,
      rgba(223, 199, 141, 0),
      rgba(223, 199, 141, 0.18),
      rgba(122, 62, 47, 0.12),
      rgba(223, 199, 141, 0)
    );
  animation: wheel-aura 6s ease-in-out infinite;
}

.wheel-disc {
  border: 1px solid rgba(223, 199, 141, 0.54);
  box-shadow:
    inset 0 0 0 0.35rem rgba(13, 11, 10, 0.38),
    inset 0 0 2.5rem rgba(13, 11, 10, 0.62),
    0 1.8rem 4rem rgba(0, 0, 0, 0.42);
  transition-timing-function: cubic-bezier(0.12, 0.82, 0.16, 1);
  will-change: transform;
}

.wheel-glass,
.wheel-sweep {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  pointer-events: none;
}

.wheel-glass {
  background:
    radial-gradient(circle at 38% 26%, rgba(243, 235, 221, 0.32), transparent 18%),
    radial-gradient(circle at 50% 50%, transparent 46%, rgba(13, 11, 10, 0.48) 72%),
    linear-gradient(145deg, rgba(243, 235, 221, 0.18), transparent 44%);
  mix-blend-mode: screen;
}

.wheel-sweep {
  opacity: 0;
  background: conic-gradient(
    from 0deg,
    transparent 0 72%,
    rgba(243, 235, 221, 0.42) 76%,
    transparent 82% 100%
  );
}

.is-spinning .wheel-sweep {
  animation: wheel-sweep 1050ms linear infinite;
}

.wheel-tick {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 48%;
  height: 1px;
  transform-origin: left center;
  background: linear-gradient(90deg, rgba(13, 11, 10, 0.54), transparent 58%);
}

.wheel-label {
  transform-origin: left center;
}

.wheel-label span {
  border: 1px solid rgba(243, 235, 221, 0.14);
  background: rgba(13, 11, 10, 0.5);
  box-shadow: 0 0.6rem 1.4rem rgba(0, 0, 0, 0.16);
  backdrop-filter: blur(10px);
}

.wheel-center {
  position: absolute;
  left: 50%;
  top: 50%;
  display: grid;
  width: 6rem;
  height: 6rem;
  place-items: center;
  border: 1px solid rgba(223, 199, 141, 0.56);
  border-radius: 999px;
  background:
    radial-gradient(circle at 36% 24%, rgba(243, 235, 221, 0.28), transparent 28%),
    linear-gradient(145deg, rgba(13, 11, 10, 0.96), rgba(70, 46, 33, 0.88));
  box-shadow:
    inset 0 0 1.2rem rgba(243, 235, 221, 0.08),
    0 1rem 2rem rgba(0, 0, 0, 0.36);
  color: #dfc78d;
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transform: translate(-50%, -50%);
}

.wheel-pointer {
  position: absolute;
  left: 50%;
  top: 0.15rem;
  z-index: 20;
  width: 2.2rem;
  height: 3.6rem;
  border: 1px solid rgba(243, 235, 221, 0.52);
  border-radius: 0 0 999px 999px;
  background:
    linear-gradient(180deg, rgba(243, 235, 221, 0.92), rgba(223, 199, 141, 0.92)), #dfc78d;
  box-shadow: 0 0.9rem 2rem rgba(0, 0, 0, 0.34);
  clip-path: polygon(50% 100%, 7% 0, 93% 0);
  transform: translateX(-50%);
  transform-origin: 50% 12%;
}

.is-spinning .wheel-pointer {
  animation: pointer-kick 420ms ease-in-out infinite;
}

.wheel-action {
  box-shadow: 0 0.8rem 1.8rem rgba(223, 199, 141, 0.16);
}

@keyframes wheel-aura {
  0%,
  100% {
    opacity: 0.66;
    transform: scale(0.98);
  }
  50% {
    opacity: 1;
    transform: scale(1.02);
  }
}

@keyframes wheel-sweep {
  from {
    opacity: 0.86;
    transform: rotate(0deg);
  }
  to {
    opacity: 0.86;
    transform: rotate(360deg);
  }
}

@keyframes pointer-kick {
  0%,
  100% {
    transform: translateX(-50%) rotate(-2deg);
  }
  50% {
    transform: translateX(-50%) rotate(7deg);
  }
}
</style>
