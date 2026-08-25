<template>
  <section class="onboarding-page">
    <div class="onboarding-page__moon" aria-hidden="true" />
    <p class="eyebrow">Welcome to 拾梦</p>
    <h1 class="page-heading">有些梦，<br />值得在醒来后继续发光。</h1>
    <p class="page-intro">拾梦会把文字、录音和画面保存在你的设备里。没有账号，也不会替你解读梦的意义。</p>
    <RouterLink class="primary-button" to="/record">开始拾梦</RouterLink>
  </section>
</template>

<style scoped>
.onboarding-page {
  display: grid;
  min-height: 64dvh;
  align-content: center;
  justify-items: start;
}

.onboarding-page__moon {
  width: 7rem;
  aspect-ratio: 1;
  margin-bottom: 2.4rem;
  border-radius: 50%;
  background:
    radial-gradient(circle at 38% 31%, white 0 4%, transparent 5%),
    linear-gradient(145deg, var(--color-moon), #dcc8d2 60%, #8b91aa);
  box-shadow: 0 0 4rem 1.6rem rgb(255 248 232 / 66%);
}

.onboarding-page .primary-button {
  margin-top: 1.8rem;
}
</style>
