<template>
  <section>
    <p class="eyebrow">Dream archive</p>
    <h1 class="page-heading">梦的档案</h1>
    <p class="page-intro">按日期、心情与关键词，重新遇见曾经做过的梦。</p>

    <div class="archive-empty glass-card">
      <span class="archive-empty__orb" aria-hidden="true" />
      <div>
        <h2>档案还是空的</h2>
        <p>保存的梦会安静地排列在这里。</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.archive-empty {
  display: flex;
  align-items: center;
  gap: 1.1rem;
  margin-top: 2rem;
  padding: 1.3rem;
}

.archive-empty__orb {
  width: 3.7rem;
  aspect-ratio: 1;
  flex: 0 0 auto;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, var(--color-moon), var(--color-blush) 52%, #757b98);
  box-shadow: 0 0 2rem rgb(215 169 189 / 42%);
}

.archive-empty h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 400;
}

.archive-empty p {
  margin: 0.4rem 0 0;
  color: var(--color-ink-muted);
  font-size: 0.78rem;
}
</style>
