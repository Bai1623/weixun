<template>
  <section>
    <p class="eyebrow">Your quiet space</p>
    <h1 class="page-heading">设置</h1>
    <p class="page-intro">管理本地数据、备份与可选的 AI 功能。</p>

    <div class="settings-list glass-card">
      <div class="settings-item">
        <span>本地存储</span>
        <small>尚无梦境数据</small>
      </div>
      <div class="settings-item">
        <span>备份与恢复</span>
        <small>将在后续步骤启用</small>
      </div>
      <div class="settings-item">
        <span>AI 整理与生图</span>
        <small>关闭 · 需要你主动配置</small>
      </div>
    </div>
  </section>
</template>

<style scoped>
.settings-list {
  margin-top: 2rem;
  padding: 0 1.2rem;
}

.settings-item {
  display: flex;
  min-height: 4.4rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--color-line);
}

.settings-item:last-child {
  border-bottom: 0;
}

.settings-item span {
  font-family: var(--font-display);
}

.settings-item small {
  color: var(--color-ink-muted);
  font-size: 0.7rem;
  text-align: right;
}
</style>
