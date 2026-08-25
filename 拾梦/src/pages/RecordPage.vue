<template>
  <section class="record-page">
    <p class="eyebrow">Capture a dream</p>
    <h1 class="page-heading">趁梦还在，<br />把它留在这里。</h1>
    <p class="page-intro">不用完整，也不必解释。一个场景、一种颜色，或醒来时残留的情绪，都值得被记住。</p>

    <div class="record-card glass-card">
      <label for="dream-fragment">梦境碎片</label>
      <textarea id="dream-fragment" placeholder="我梦见……" disabled />
      <div class="record-card__footer">
        <span>编辑功能将在下一步接通本地保存</span>
        <button type="button" class="quiet-button" disabled>保存梦境</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.record-page {
  display: grid;
}

.record-card {
  display: grid;
  gap: 0.8rem;
  margin-top: 2rem;
  padding: 1.2rem;
}

.record-card label {
  font-family: var(--font-display);
  font-size: 1rem;
  letter-spacing: 0.08em;
}

.record-card textarea {
  min-height: 12rem;
  resize: vertical;
  border: 0;
  outline: 0;
  color: var(--color-night);
  background: transparent;
  font-family: var(--font-display);
  font-size: 1.08rem;
  line-height: 1.9;
}

.record-card textarea::placeholder {
  color: rgb(111 112 128 / 58%);
}

.record-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--color-line);
}

.record-card__footer span {
  max-width: 12rem;
  color: var(--color-ink-muted);
  font-size: 0.68rem;
  line-height: 1.5;
}
</style>
