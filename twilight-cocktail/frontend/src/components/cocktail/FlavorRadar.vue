<template>
  <div ref="chartRef" class="h-64 w-full rounded-lg border border-gold/15 bg-obsidian/40" />
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core'
import { RadarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { FlavorProfile } from '@/types/cocktail'

echarts.use([RadarChart, GridComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{
  flavors: FlavorProfile
}>()

const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | undefined

const render = () => {
  if (!chartRef.value) return
  chart ??= echarts.init(chartRef.value)
  chart.setOption({
    radar: {
      indicator: [
        { name: '甜', max: 5 },
        { name: '酸', max: 5 },
        { name: '苦', max: 5 },
        { name: '烈', max: 5 },
        { name: '清爽', max: 5 },
      ],
      splitLine: { lineStyle: { color: 'rgba(200,169,106,0.18)' } },
      axisName: { color: '#f3ebdd' },
      splitArea: { areaStyle: { color: ['rgba(200,169,106,0.04)', 'rgba(122,62,47,0.06)'] } },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: [
              props.flavors.sweet,
              props.flavors.sour,
              props.flavors.bitter,
              props.flavors.strong,
              props.flavors.fresh,
            ],
            areaStyle: { color: 'rgba(200,169,106,0.22)' },
            lineStyle: { color: '#c8a96a' },
            itemStyle: { color: '#dfc78d' },
          },
        ],
      },
    ],
  })
}

onMounted(() => {
  render()
  window.addEventListener('resize', render)
})
watch(() => props.flavors, render)
onBeforeUnmount(() => {
  window.removeEventListener('resize', render)
  chart?.dispose()
})
</script>
