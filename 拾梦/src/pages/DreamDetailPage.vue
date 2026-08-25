<template>
  <section>
    <p class="eyebrow">Dream fragment</p>
    <h1 class="page-heading">梦境详情</h1>
    <div class="empty-detail glass-card">
      <p>这段梦境还没有被记录。</p>
      <RouterLink class="quiet-button" to="/home">回到梦河</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.empty-detail {
  display: grid;
  justify-items: start;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1.5rem;
}

.empty-detail p {
  margin: 0;
  color: var(--color-ink-muted);
}
</style>
