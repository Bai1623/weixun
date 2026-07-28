<template>
  <div class="daily-oracle mx-auto max-w-4xl text-center" :class="`is-${stageState}`">
    <div class="constellation-stage relative mx-auto min-h-[31rem] overflow-hidden rounded-lg">
      <div class="constellation-wash" />
      <div class="constellation-ring ring-one" />
      <div class="constellation-ring ring-two" />
      <div class="constellation-comet comet-one" />
      <div class="constellation-comet comet-two" />

      <span
        v-for="node in keywordNodes"
        :key="node.slug"
        class="keyword-star"
        :class="{ 'is-selected': selected?.slug === node.slug }"
        :style="node.style"
      >
        <span class="keyword-star__glow" />
        <span class="keyword-star__text">{{ node.nameZh }}</span>
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
          <RouterLink class="daily-gift__link" to="/daily/result"> 查看今日酒单 </RouterLink>
        </div>
      </Transition>
    </div>

    <button
      v-if="!selected"
      class="oracle-action mt-7 rounded-md px-6 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cream disabled:cursor-not-allowed disabled:opacity-70"
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
}>()

const positions = [
  [10, 22],
  [25, 12],
  [46, 17],
  [70, 13],
  [86, 28],
  [17, 46],
  [37, 36],
  [60, 38],
  [78, 51],
  [9, 68],
  [30, 75],
  [51, 64],
  [68, 76],
  [89, 70],
  [19, 84],
  [42, 88],
  [57, 8],
  [82, 86],
  [6, 37],
  [94, 45],
  [28, 56],
  [49, 77],
  [73, 63],
  [62, 24],
]

const keywordNodes = computed(() =>
  props.candidates.slice(0, positions.length).map((item, index) => {
    const [x, y] = positions[index] ?? [50, 50]
    return {
      ...item,
      style: {
        '--x': `${x}%`,
        '--y': `${y}%`,
        '--delay': `${(index % 8) * 0.18}s`,
        '--drift': `${4.2 + (index % 5) * 0.42}s`,
        '--scale': `${0.86 + (index % 4) * 0.08}`,
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
.constellation-stage {
  border: 1px solid rgba(223, 199, 141, 0.2);
  background:
    radial-gradient(circle at 50% 46%, rgba(250, 244, 225, 0.26), transparent 20rem),
    radial-gradient(circle at 16% 18%, rgba(244, 205, 187, 0.18), transparent 13rem),
    radial-gradient(circle at 86% 78%, rgba(164, 189, 205, 0.18), transparent 15rem),
    linear-gradient(145deg, rgba(35, 29, 25, 0.78), rgba(18, 17, 18, 0.92));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 1.6rem 4rem rgba(0, 0, 0, 0.22);
}

.constellation-wash,
.constellation-ring,
.constellation-comet {
  position: absolute;
  pointer-events: none;
}

.constellation-wash {
  inset: -18%;
  background:
    radial-gradient(circle at 50% 50%, rgba(250, 244, 225, 0.16), transparent 21%),
    conic-gradient(
      from 125deg,
      rgba(223, 199, 141, 0),
      rgba(223, 199, 141, 0.12),
      rgba(244, 205, 187, 0.14),
      rgba(164, 189, 205, 0.08),
      rgba(223, 199, 141, 0)
    );
  filter: blur(6px);
  opacity: 0.8;
  animation: constellation-breathe 7s ease-in-out infinite;
}

.constellation-ring {
  left: 50%;
  top: 50%;
  border: 1px solid rgba(250, 244, 225, 0.12);
  border-radius: 999px;
  transform: translate(-50%, -50%);
}

.ring-one {
  width: 25rem;
  height: 12rem;
  rotate: -10deg;
}

.ring-two {
  width: 18rem;
  height: 30rem;
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
}

.keyword-star__glow {
  position: absolute;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: #f9edd0;
  box-shadow:
    0 0 0 0.25rem rgba(249, 237, 208, 0.08),
    0 0 1.6rem rgba(249, 237, 208, 0.44);
}

.keyword-star__text {
  position: relative;
  border: 1px solid rgba(250, 244, 225, 0.16);
  border-radius: 999px;
  background: rgba(250, 244, 225, 0.1);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 0.8rem 2rem rgba(0, 0, 0, 0.12);
  color: rgba(250, 244, 225, 0.86);
  font-size: 0.78rem;
  line-height: 1;
  padding: 0.58rem 0.78rem;
  backdrop-filter: blur(14px);
  white-space: nowrap;
}

.is-searching .keyword-star {
  animation:
    keyword-search 640ms var(--delay) cubic-bezier(0.2, 0.8, 0.2, 1) infinite alternate,
    keyword-twinkle 920ms var(--delay) ease-in-out infinite;
}

.is-searching .keyword-star__text {
  background: rgba(250, 244, 225, 0.16);
  color: #fff8e8;
}

.selection-current {
  position: absolute;
  left: 50%;
  top: 50%;
  display: grid;
  width: min(16rem, 70vw);
  height: min(16rem, 70vw);
  place-items: center;
  border: 1px solid rgba(250, 244, 225, 0.18);
  border-radius: 999px;
  background:
    radial-gradient(circle at 40% 32%, rgba(255, 255, 255, 0.24), transparent 20%),
    rgba(250, 244, 225, 0.08);
  color: #f7ead0;
  font-size: 0.86rem;
  font-weight: 700;
  transform: translate(-50%, -50%);
  backdrop-filter: blur(18px);
}

.selection-current::before,
.selection-current::after {
  position: absolute;
  inset: -0.8rem;
  border: 1px solid rgba(223, 199, 141, 0.12);
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
  width: min(24rem, calc(100% - 2rem));
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
  font-size: clamp(2.6rem, 8vw, 5.2rem);
  line-height: 1;
  text-shadow: 0 1rem 2.8rem rgba(0, 0, 0, 0.28);
}

.daily-gift p:not(.daily-gift__kicker) {
  position: relative;
  max-width: 22rem;
  color: rgba(250, 244, 225, 0.76);
  font-size: 0.95rem;
  line-height: 1.8;
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
  margin-top: 1.2rem;
  border-radius: 0.45rem;
  font-size: 0.9rem;
  font-weight: 800;
  padding: 0.9rem 1.2rem;
}

.oracle-action:hover,
.daily-gift__link:hover {
  transform: translateY(-1px);
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

@media (max-width: 640px) {
  .constellation-stage {
    min-height: 28rem;
  }

  .keyword-star__text {
    font-size: 0.7rem;
    padding: 0.48rem 0.6rem;
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
