<template>
  <div class="page-stack">
    <SectionHeading
      eyebrow="Academy"
      title="调酒入门学院"
      :description="`已完成 ${academy.completedCount} / ${academy.lessons.length} 节`"
    />
    <div class="motion-grid grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <article
        v-for="lesson in academy.lessons"
        :key="lesson.slug"
        class="ui-card ui-card-interactive p-5"
      >
        <p class="text-xs text-gold">
          第 {{ lesson.chapter }} 章 · {{ lesson.estimatedMinutes }} 分钟
        </p>
        <h2 class="mt-3 font-display text-2xl">{{ lesson.title }}</h2>
        <p class="mt-2 text-sm leading-6 text-muted">{{ lesson.summary }}</p>
        <button
          class="ui-button-secondary mt-5 min-h-0 px-4 py-2 text-sm"
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
