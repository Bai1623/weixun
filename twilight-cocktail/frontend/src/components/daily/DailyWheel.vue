<template>
  <div class="daily-oracle text-center" :class="`is-${stageState}`">
    <div class="constellation-stage relative min-h-[31rem] overflow-hidden">
      <div class="constellation-wash" />
      <div class="constellation-ring ring-one" />
      <div class="constellation-ring ring-two" />
      <div class="constellation-comet comet-one" />
      <div class="constellation-comet comet-two" />

      <span
        v-for="node in keywordNodes"
        :key="node.slug"
        class="keyword-star"
        :class="{
          'is-selected': selected?.slug === node.slug,
          'is-labeled': node.showLabel,
          'is-dot-only': !node.showLabel,
        }"
        :style="node.style"
        :aria-label="node.nameZh"
      >
        <span class="keyword-star__glow" />
        <span v-if="node.showLabel" class="keyword-star__label">{{ node.nameZh }}</span>
        <span v-else class="keyword-star__point" />
      </span>

      <div v-if="spinning" class="selection-current" aria-live="polite">
        <span>星屑正在筛选</span>
      </div>

      <Transition name="gift-reveal">
        <div v-if="selected" class="daily-gift" aria-live="polite">
          <div class="daily-gift__aura" />
          <div class="daily-gift__shape" aria-hidden="true">
            <span class="daily-gift__moon" />
            <span class="daily-gift__spark spark-a" />
            <span class="daily-gift__spark spark-b" />
            <span class="daily-gift__spark spark-c" />
          </div>
          <p class="daily-gift__kicker">今日酒单</p>
          <h2>{{ selected.nameZh }}</h2>
          <p>{{ selected.shortDescription }}</p>
          <div class="daily-gift__actions">
            <RouterLink class="daily-gift__link" :to="`/cocktails/${selected.slug}`">
              查看今日酒单
            </RouterLink>
            <button class="daily-gift__reroll" type="button" @click="$emit('reroll')">
              再摇一杯
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <button
      v-if="!selected"
      class="oracle-action ui-button-primary mt-7 px-6 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cream disabled:cursor-not-allowed disabled:opacity-70"
      type="button"
      :disabled="spinning"
      @click="$emit('spin')"
    >
      {{ spinning ? '星屑筛选中' : '开始闪选' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import type { Cocktail } from '@/types/cocktail'

const props = defineProps<{
  candidates: Cocktail[]
  spinning: boolean
  selected?: Cocktail
}>()

defineEmits<{
  spin: []
  reroll: []
}>()

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const MAX_VISIBLE_KEYWORDS = 150
const LABELED_KEYWORDS = 20

const positionForIndex = (index: number, total: number) => {
  const seededIndex = index < LABELED_KEYWORDS ? index * 3 + 10 : index + 34
  const progress = seededIndex / Math.max(total + 42, 1)
  const angle = seededIndex * GOLDEN_ANGLE + Math.sin(index * 1.37) * 0.48
  const radius = 0.16 + Math.sqrt(progress) * 0.49 + ((index * 17) % 7) * 0.006
  const ellipseX = Math.cos(angle) * radius * 88
  const ellipseY = Math.sin(angle) * radius * 68
  const driftX = Math.sin(index * 2.11) * 3.4 + (((index * 29) % 13) - 6) * 0.36
  const driftY = Math.cos(index * 1.71) * 2.8 + (((index * 31) % 13) - 6) * 0.28
  return [
    Math.min(97, Math.max(3, 50 + ellipseX + driftX)),
    Math.min(94, Math.max(8, 52 + ellipseY + driftY)),
  ]
}

const bubbleSizeFor = (item: Cocktail) => {
  const popularityBoost = Math.min(10, Math.max(1, item.popularityWeight || 1)) * 0.12
  const lengthBoost = Math.min(0.36, Math.max(0, item.nameZh.length - 3) * 0.055)
  return 1.88 + popularityBoost + lengthBoost
}

const visibleCandidates = computed(() => {
  const selected = props.selected
  const ranked = [...props.candidates].sort((a, b) => b.popularityWeight - a.popularityWeight)
  const sample = ranked.slice(0, MAX_VISIBLE_KEYWORDS)
  if (selected && sample.length && !sample.some((item) => item.slug === selected.slug)) {
    sample[sample.length - 1] = selected
  }
  return sample
})

const keywordNodes = computed(() =>
  visibleCandidates.value.map((item, index) => {
    const [x, y] = positionForIndex(index, visibleCandidates.value.length)
    return {
      ...item,
      showLabel: index < LABELED_KEYWORDS,
      style: {
        '--x': `${x}%`,
        '--y': `${y}%`,
        '--delay': `${(index % 8) * 0.18}s`,
        '--drift': `${4.2 + (index % 5) * 0.42}s`,
        '--scale': `${0.72 + (index % 7) * 0.046}`,
        '--bubble-size': `${bubbleSizeFor(item).toFixed(2)}rem`,
      },
    }
  }),
)

const stageState = computed(() => {
  if (props.selected) return 'revealed'
  return props.spinning ? 'searching' : 'idle'
})
</script>

<style scoped>
.daily-oracle {
  display: grid;
  min-height: 100%;
  grid-template-rows: 1fr auto;
}

.constellation-stage {
  min-height: clamp(34rem, calc(100vh - 15rem), 56rem);
  background:
    radial-gradient(circle at 48% 43%, rgba(250, 244, 225, 0.12), transparent 22rem),
    radial-gradient(circle at 8% 16%, rgba(216, 166, 147, 0.09), transparent 18rem),
    radial-gradient(circle at 93% 76%, rgba(139, 171, 162, 0.1), transparent 22rem);
  mask-image: linear-gradient(180deg, transparent 0%, #000 6%, #000 92%, transparent 100%);
}

.constellation-wash,
.constellation-ring,
.constellation-comet {
  position: absolute;
  pointer-events: none;
}

.constellation-wash {
  inset: -14%;
  background:
    radial-gradient(circle at 50% 50%, rgba(250, 244, 225, 0.12), transparent 18%),
    conic-gradient(
      from 125deg,
      rgba(223, 199, 141, 0),
      rgba(223, 199, 141, 0.08),
      rgba(244, 205, 187, 0.1),
      rgba(164, 189, 205, 0.06),
      rgba(223, 199, 141, 0)
    );
  filter: blur(12px);
  opacity: 0.58;
  animation: constellation-breathe 8.5s ease-in-out infinite;
}

.constellation-ring {
  left: 50%;
  top: 50%;
  border: 1px solid rgba(250, 244, 225, 0.12);
  border-radius: 999px;
  transform: translate(-50%, -50%);
}

.ring-one {
  width: min(58rem, 88vw);
  height: min(24rem, 42vw);
  rotate: -10deg;
}

.ring-two {
  width: min(38rem, 62vw);
  height: min(48rem, 76vw);
  rotate: 32deg;
}

.constellation-comet {
  width: 8rem;
  height: 1px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(250, 244, 225, 0.7), transparent);
  opacity: 0.48;
  transform: rotate(-18deg);
}

.comet-one {
  left: 12%;
  top: 18%;
  animation: comet-drift 6s ease-in-out infinite;
}

.comet-two {
  bottom: 19%;
  right: 10%;
  animation: comet-drift 7s 1.2s ease-in-out infinite reverse;
}

.keyword-star {
  position: absolute;
  left: var(--x);
  top: var(--y);
  display: inline-grid;
  place-items: center;
  transform: translate(-50%, -50%) scale(var(--scale));
  animation:
    keyword-float var(--drift) ease-in-out infinite,
    keyword-twinkle 2.6s var(--delay) ease-in-out infinite;
  will-change: transform, opacity;
}

.keyword-star__glow {
  position: absolute;
  width: calc(var(--bubble-size) * 0.28);
  height: calc(var(--bubble-size) * 0.28);
  border-radius: 999px;
  background: rgba(249, 237, 208, 0.64);
  box-shadow:
    0 0 0 calc(var(--bubble-size) * 0.18) rgba(249, 237, 208, 0.035),
    0 0 calc(var(--bubble-size) * 0.72) rgba(249, 237, 208, 0.28);
}

.keyword-star__label,
.keyword-star__point {
  position: relative;
  display: inline-flex;
  width: var(--bubble-size);
  height: var(--bubble-size);
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(250, 244, 225, 0.12);
  border-radius: 999px;
  background:
    radial-gradient(circle at 35% 28%, rgba(255, 255, 255, 0.16), transparent 26%),
    rgba(250, 244, 225, 0.058);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 0.8rem 2rem rgba(0, 0, 0, 0.08);
  color: rgba(250, 244, 225, 0.78);
  backdrop-filter: blur(14px);
}

.keyword-star__label {
  font-size: clamp(0.58rem, calc(var(--bubble-size) * 0.16), 0.78rem);
  line-height: 1.12;
  padding: 0.36rem;
  overflow: hidden;
  text-align: center;
  white-space: normal;
  word-break: break-word;
}

.keyword-star__point::after {
  width: calc(var(--bubble-size) * 0.18);
  height: calc(var(--bubble-size) * 0.18);
  border-radius: 999px;
  background: rgba(255, 248, 232, 0.62);
  box-shadow: 0 0 calc(var(--bubble-size) * 0.38) rgba(255, 248, 232, 0.4);
  content: '';
}

.is-labeled .keyword-star__glow {
  opacity: 0.58;
}

.is-dot-only .keyword-star__glow {
  opacity: 0.88;
}

.is-searching .keyword-star {
  animation:
    keyword-search 640ms var(--delay) cubic-bezier(0.2, 0.8, 0.2, 1) infinite alternate,
    keyword-twinkle 920ms var(--delay) ease-in-out infinite;
}

.is-searching .keyword-star__label,
.is-searching .keyword-star__point {
  background: rgba(250, 244, 225, 0.13);
  color: #fff8e8;
}

.selection-current {
  position: absolute;
  left: 50%;
  top: 50%;
  display: grid;
  width: min(18rem, 72vw);
  height: min(18rem, 72vw);
  place-items: center;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(250, 244, 225, 0.12), transparent 66%);
  color: #f7ead0;
  font-size: 0.9rem;
  font-weight: 700;
  transform: translate(-50%, -50%);
  text-shadow: 0 0 2rem rgba(255, 248, 232, 0.42);
}

.selection-current::before,
.selection-current::after {
  position: absolute;
  inset: -0.8rem;
  border: 1px solid rgba(223, 199, 141, 0.08);
  border-radius: inherit;
  content: '';
  animation: selection-pulse 1.5s ease-in-out infinite;
}

.selection-current::after {
  animation-delay: 0.5s;
}

.daily-gift {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 5;
  display: grid;
  width: min(34rem, calc(100% - 2rem));
  min-height: 23rem;
  place-items: center;
  padding: 3.6rem 2rem 2rem;
  text-align: center;
  transform: translate(-50%, -50%);
}

.daily-gift__aura {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background:
    radial-gradient(circle, rgba(250, 244, 225, 0.34), transparent 50%),
    radial-gradient(circle at 48% 36%, rgba(244, 205, 187, 0.22), transparent 42%);
  filter: blur(2px);
  animation: aura-rise 1.2s ease both;
}

.daily-gift__shape {
  position: relative;
  display: grid;
  width: 8.5rem;
  height: 8.5rem;
  place-items: center;
  margin-bottom: 1.1rem;
  border: 1px solid rgba(250, 244, 225, 0.34);
  border-radius: 2.2rem;
  background:
    radial-gradient(circle at 38% 28%, rgba(255, 255, 255, 0.62), transparent 24%),
    linear-gradient(145deg, rgba(250, 244, 225, 0.28), rgba(223, 199, 141, 0.16));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 1.5rem 3.8rem rgba(0, 0, 0, 0.18),
    0 0 4rem rgba(223, 199, 141, 0.24);
  transform: rotate(45deg);
  animation: gift-float 4.8s ease-in-out infinite;
  backdrop-filter: blur(18px);
}

.daily-gift__moon {
  width: 3.7rem;
  height: 3.7rem;
  border-radius: 999px;
  background: #fff6df;
  box-shadow:
    inset -1rem 0 0 rgba(223, 199, 141, 0.34),
    0 0 2rem rgba(255, 246, 223, 0.66);
  transform: rotate(-45deg);
}

.daily-gift__spark {
  position: absolute;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: #fff8e8;
  box-shadow: 0 0 1.4rem rgba(255, 248, 232, 0.74);
}

.spark-a {
  left: 1.3rem;
  top: 1rem;
}

.spark-b {
  bottom: 1.35rem;
  right: 1rem;
}

.spark-c {
  right: 1.35rem;
  top: 2rem;
}

.daily-gift__kicker {
  position: relative;
  color: #dfc78d;
  font-size: 0.72rem;
  font-weight: 700;
}

.daily-gift h2 {
  position: relative;
  margin-top: 0.4rem;
  color: #fff8e8;
  font-family: var(--font-display);
  font-size: clamp(3rem, 9vw, 7.2rem);
  line-height: 1;
  text-shadow: 0 1rem 2.8rem rgba(0, 0, 0, 0.28);
}

.daily-gift p:not(.daily-gift__kicker) {
  position: relative;
  max-width: 30rem;
  color: rgba(250, 244, 225, 0.76);
  font-size: 0.95rem;
  line-height: 1.8;
}

.daily-gift__actions {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1.2rem;
}

.daily-gift__link,
.oracle-action {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 248, 232, 0.22);
  background:
    linear-gradient(135deg, rgba(255, 248, 232, 0.96), rgba(223, 199, 141, 0.92)), #dfc78d;
  box-shadow:
    0 1rem 2.2rem rgba(223, 199, 141, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.42);
  color: #1b1512;
}

.daily-gift__link {
  border-radius: 0.45rem;
  font-size: 0.9rem;
  font-weight: 800;
  padding: 0.9rem 1.2rem;
}

.daily-gift__reroll {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 248, 232, 0.22);
  border-radius: 0.45rem;
  background: rgba(255, 248, 232, 0.08);
  color: #fff8e8;
  font-size: 0.9rem;
  font-weight: 800;
  padding: 0.9rem 1.2rem;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background 180ms ease;
}

.daily-gift__link {
  transition:
    transform 180ms var(--ease-out-soft),
    box-shadow 180ms ease;
}

.oracle-action:hover,
.daily-gift__link:hover,
.daily-gift__reroll:hover {
  transform: translateY(-1px);
}

.daily-gift__reroll:hover {
  border-color: rgba(255, 248, 232, 0.4);
  background: rgba(255, 248, 232, 0.14);
}

.gift-reveal-enter-active {
  transition:
    opacity 760ms ease,
    transform 900ms cubic-bezier(0.16, 1, 0.3, 1),
    filter 900ms ease;
}

.gift-reveal-enter-from {
  opacity: 0;
  filter: blur(14px);
  transform: translate(-50%, -48%) scale(0.82);
}

@keyframes constellation-breathe {
  0%,
  100% {
    opacity: 0.64;
    transform: scale(0.98) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1.03) rotate(8deg);
  }
}

@keyframes keyword-float {
  0%,
  100% {
    translate: 0 0;
  }
  50% {
    translate: 0 -0.7rem;
  }
}

@keyframes keyword-twinkle {
  0%,
  100% {
    opacity: 0.62;
    filter: blur(0);
  }
  50% {
    opacity: 1;
    filter: blur(0.2px);
  }
}

@keyframes keyword-search {
  from {
    translate: -0.25rem 0.35rem;
    scale: 0.94;
  }
  to {
    translate: 0.28rem -0.42rem;
    scale: 1.08;
  }
}

@keyframes selection-pulse {
  from {
    opacity: 0.72;
    transform: scale(0.94);
  }
  to {
    opacity: 0;
    transform: scale(1.18);
  }
}

@keyframes comet-drift {
  0%,
  100% {
    opacity: 0.18;
    translate: -1rem 0;
  }
  50% {
    opacity: 0.72;
    translate: 1rem 0.6rem;
  }
}

@keyframes aura-rise {
  from {
    opacity: 0;
    scale: 0.7;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}

@keyframes gift-float {
  0%,
  100% {
    translate: 0 0;
  }
  50% {
    translate: 0 -0.42rem;
  }
}

@media (max-width: 640px) {
  .constellation-stage {
    min-height: 26rem;
  }

  .keyword-star__label {
    font-size: 0.7rem;
    padding: 0.32rem;
  }

  .ring-one {
    width: 20rem;
  }

  .ring-two {
    height: 24rem;
  }

  .daily-gift {
    min-height: 21rem;
    padding-inline: 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .constellation-wash,
  .constellation-comet,
  .keyword-star,
  .daily-gift__shape,
  .selection-current::before,
  .selection-current::after,
  .daily-gift__aura {
    animation: none;
  }

  .gift-reveal-enter-active {
    transition: opacity 180ms ease;
  }
}
</style>
