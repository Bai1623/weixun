<template>
  <div>
    <SectionHeading
      eyebrow="Academy"
      title="调酒入门学院"
      :description="`已完成 ${academy.completedCount} / ${academy.lessons.length} 节`"
    />
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <article
        v-for="lesson in academy.lessons"
        :key="lesson.slug"
        class="rounded-lg border border-gold/15 bg-walnut/70 p-5"
      >
        <p class="text-xs text-gold">
          第 {{ lesson.chapter }} 章 · {{ lesson.estimatedMinutes }} 分钟
        </p>
        <h2 class="mt-3 font-display text-2xl">{{ lesson.title }}</h2>
        <p class="mt-2 text-sm leading-6 text-muted">{{ lesson.summary }}</p>
        <button
          class="mt-5 rounded-md border border-gold/30 px-4 py-2 text-sm text-gold"
          type="button"
          @click="academy.toggle(lesson.slug)"
        >
          {{ academy.completedSlugs.includes(lesson.slug) ? '标记未完成' : '完成本课' }}
        </button>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import SectionHeading from '@/components/common/SectionHeading.vue'
import { useAcademyStore } from '@/stores/academy'

const academy = useAcademyStore()
</script>
