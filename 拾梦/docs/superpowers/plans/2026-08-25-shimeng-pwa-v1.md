# 拾梦 PWA 第一版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个可安装、离线可用、本地保存梦境与录音、自动生成唯美封面并预留安全 AI 接入能力的“拾梦”移动端 PWA 第一版。

**Architecture:** 使用 Vue 3 单页应用和 Hash Router，IndexedDB 是梦境与媒体的唯一长期数据源，Pinia 只编排界面会话状态。离线封面、搜索、备份恢复和长图导出全部在浏览器内执行；AI 功能通过可配置的 `DreamAiGateway` 调用服务端端点，未配置时核心应用仍完整可用。

**Tech Stack:** Node 20.20.2、npm 10.8.2、Vue 3.5.22、TypeScript 5.9.3、Vite 7.1.12、Pinia 3.0.3、Vue Router 4.6.3、IndexedDB/idb 8.0.3、fflate 0.8.3、vite-plugin-pwa 1.1.0、Vitest 3.2.4、Vue Test Utils 2.4.6、Playwright 1.56.1。

**Spec:** `拾梦/docs/superpowers/specs/2026-08-25-shimeng-pwa-design.md`

## Global Constraints

- 只创建或修改 `/Users/a2022-710/Desktop/New project/拾梦` 下的文件；根仓库其他脏改动属于用户，不得改动或纳入提交。
- 每个任务开始前先进入 `/Users/a2022-710/Desktop/New project/拾梦`，再运行 `git status --short --branch -- .`；每次提交使用 `git commit --only -m "<message>" -- .`，只提交当前项目路径。
- 使用 `apply_patch` 创建和编辑源码；`npm install`、格式化和图标等机械生成文件可以由对应命令产生。
- 遵循 `/Users/a2022-710/Desktop/venus-all/rules/Venus开发通用规范.md`：职责归属明确、契约语义一致、最小改动、检查影响面、完成回归。
- 本项目没有 Venus `openqiqi` 或 OpenSpec；本计划与已确认 Spec 是唯一需求基线。
- 使用 Node 20.20.2 与 npm 10.8.2；依赖版本以 `package.json` 和 `package-lock.json` 为准。
- 界面文案使用简体中文；名称固定为“拾梦”。
- 使用 Hash Router，保证静态托管时刷新任意页面不会返回 404。
- IndexedDB 是梦境、媒体、设置的唯一长期数据真源；不得把 Blob 或梦境正文写入 Service Worker 缓存。
- 第一版不包含账号、云同步、社交、订阅、权威解梦、本地数据库加密或前端 AI Key。
- 没有 AI 端点时，记录、录音、搜索、封面、备份恢复和长图导出必须完整可用。
- 最小主要视口宽度为 360px；主要触控目标至少 44×44 CSS 像素；尊重安全区域和 `prefers-reduced-motion`。
- 每个任务遵循 TDD：先写失败测试并确认失败，再做最小实现，再运行局部与相关测试。
- 每个任务提交前至少运行 `git diff --check -- 拾梦`；最终任务运行单测、类型检查、构建和端到端回归。

## File Map

- `src/main.ts`、`src/App.vue`、`src/router/index.ts`、`src/layouts/AppLayout.vue`：应用启动、路由与移动壳。
- `src/styles/tokens.css`、`src/styles/base.css`：视觉令牌、全局样式和减少动态效果。
- `src/features/dreams/model/dream.ts`、`src/features/media/model/media.ts`、`src/features/settings/model/settings.ts`：稳定领域契约。
- `src/core/persistence/db.ts` 与各 feature 的 `data/*Repository.ts`：IndexedDB schema 与持久化。
- `src/features/dreams/cover/*`：固定种子场景和 Canvas 封面。
- `src/features/media/services/*`：录音能力和 Blob 生命周期。
- `src/features/backup/*`、`src/features/export/*`：版本化备份恢复和梦境长图。
- `src/features/ai/*`：AI 契约、HTTP 适配器、确认和结果应用。
- `src/pwa/*`：安装、存储持久化和安全更新。
- `src/pages/*`：首次启动、梦河、记录、详情、档案和设置页面。

---

### Task 1: 工程基础、测试入口与移动应用壳

**Files:**
- Create: `拾梦/package.json`
- Create: `拾梦/package-lock.json`（由 `npm install` 生成）
- Create: `拾梦/index.html`
- Create: `拾梦/tsconfig.json`
- Create: `拾梦/tsconfig.app.json`
- Create: `拾梦/tsconfig.node.json`
- Create: `拾梦/vite.config.ts`
- Create: `拾梦/eslint.config.mjs`
- Create: `拾梦/playwright.config.ts`
- Create: `拾梦/src/vite-env.d.ts`
- Create: `拾梦/src/test/setup.ts`
- Create: `拾梦/src/main.ts`
- Create: `拾梦/src/App.vue`
- Create: `拾梦/src/router/index.ts`
- Create: `拾梦/src/router/routes.test.ts`
- Create: `拾梦/src/layouts/AppLayout.vue`
- Create: `拾梦/src/layouts/AppLayout.test.ts`
- Create: `拾梦/src/styles/tokens.css`
- Create: `拾梦/src/styles/base.css`
- Create: `拾梦/src/pages/HomePage.vue`
- Create: `拾梦/src/pages/RecordPage.vue`
- Create: `拾梦/src/pages/DreamDetailPage.vue`
- Create: `拾梦/src/pages/ArchivePage.vue`
- Create: `拾梦/src/pages/SettingsPage.vue`
- Create: `拾梦/src/pages/OnboardingPage.vue`

**Interfaces:**
- Produces routes `/onboarding`、`/home`、`/record/:id?`、`/dream/:id`、`/archive`、`/settings`。
- Produces CSS tokens `--color-night`、`--color-mist`、`--color-moon`、`--color-blush`、`--safe-bottom`。

- [x] **Step 1: Create package and tool configuration**

Use `apply_patch` to create `package.json` with these exact scripts and dependency versions:

```json
{
  "name": "shimeng-pwa",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "dependencies": {
    "@vitejs/plugin-vue": "^6.0.1",
    "fflate": "^0.8.3",
    "idb": "^8.0.3",
    "@lucide/vue": "^1.34.0",
    "pinia": "^3.0.3",
    "vite": "^7.1.12",
    "vite-plugin-pwa": "^1.1.0",
    "vue": "^3.5.22",
    "vue-router": "^4.6.3"
  },
  "devDependencies": {
    "@playwright/test": "^1.56.1",
    "@types/node": "^24.9.1",
    "@vue/eslint-config-prettier": "^10.2.0",
    "@vue/eslint-config-typescript": "^14.6.0",
    "@vue/test-utils": "^2.4.6",
    "@vue/tsconfig": "^0.8.1",
    "eslint": "^9.38.0",
    "eslint-plugin-vue": "^10.5.1",
    "fake-indexeddb": "^6.2.5",
    "jsdom": "^26.1.0",
    "prettier": "^3.6.2",
    "typescript": "~5.9.3",
    "vitest": "^3.2.4",
    "vue-tsc": "^3.1.1"
  }
}
```

Configure Vitest with `environment: 'jsdom'`, `include: ['src/**/*.test.ts']`, and `setupFiles: ['./src/test/setup.ts']`. Configure Playwright with base URL `http://127.0.0.1:4173`, Desktop Chrome and Pixel 5 projects, and this production web server so Service Worker behavior is testable:

```ts
webServer: {
  command: 'npm run build && npm run preview -- --host 127.0.0.1',
  url: 'http://127.0.0.1:4173',
  reuseExistingServer: false,
}
```

- [x] **Step 2: Install dependencies and capture the lockfile**

Run:

```bash
cd '/Users/a2022-710/Desktop/New project/拾梦'
npm install
```

Expected: exit 0 and `package-lock.json` exists.

- [x] **Step 3: Write failing router and shell tests**

```ts
expect(routes.map((route) => route.path)).toEqual([
  '/', '/onboarding', '/home', '/record/:id?', '/dream/:id', '/archive', '/settings', '/:pathMatch(.*)*',
])
```

`AppLayout.test.ts` mounts router stubs and asserts brand `拾梦`, a `<main>`, and bottom links named `梦河`、`记录`、`档案`、`设置`.

- [x] **Step 4: Run tests and verify the expected failure**

Run `npm test -- src/router/routes.test.ts src/layouts/AppLayout.test.ts`.

Expected: FAIL because `router/index.ts` and `AppLayout.vue` do not exist.

- [x] **Step 5: Implement route table, shell and visual tokens**

```ts
export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/home' },
  { path: '/onboarding', component: () => import('@/pages/OnboardingPage.vue') },
  { path: '/home', component: () => import('@/pages/HomePage.vue') },
  { path: '/record/:id?', component: () => import('@/pages/RecordPage.vue') },
  { path: '/dream/:id', component: () => import('@/pages/DreamDetailPage.vue') },
  { path: '/archive', component: () => import('@/pages/ArchivePage.vue') },
  { path: '/settings', component: () => import('@/pages/SettingsPage.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/home' },
]
```

```css
:root {
  --color-night: #151827;
  --color-mist: #eef0f3;
  --color-moon: #fff8e8;
  --color-blush: #d7a9bd;
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}
button, a, input, textarea, select { min-height: 44px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; } }
```

Each initial page renders its real heading and one-line empty/loading copy; later tasks replace the body without changing routes.

- [x] **Step 6: Verify and commit the foundation**

```bash
npm test -- src/router/routes.test.ts src/layouts/AppLayout.test.ts
npm run build
git diff --check -- .
git add package.json package-lock.json index.html tsconfig*.json vite.config.ts eslint.config.mjs playwright.config.ts src
git commit --only -m "feat: scaffold 拾梦 PWA shell" -- .
```

Expected: tests PASS, build exits 0, commit contains only `拾梦` project files.

### Task 2: Domain contracts and IndexedDB repositories

**Files:**
- Create: `拾梦/src/features/dreams/model/dream.ts`
- Create: `拾梦/src/features/media/model/media.ts`
- Create: `拾梦/src/features/settings/model/settings.ts`
- Create: `拾梦/src/core/persistence/db.ts`
- Create: `拾梦/src/features/dreams/data/dreamRepository.ts`
- Create: `拾梦/src/features/media/data/mediaRepository.ts`
- Create: `拾梦/src/features/settings/data/settingsRepository.ts`
- Test: `拾梦/src/features/dreams/data/dreamRepository.test.ts`
- Test: `拾梦/src/features/media/data/mediaRepository.test.ts`
- Test: `拾梦/src/features/settings/data/settingsRepository.test.ts`

**Interfaces:**
- Produces `DreamRecord`, `MediaAsset`, `AppSettings`, `StorageWriteError`, `createDraftDream(id, now)`, `createDreamRepository(db)`, `createMediaRepository(db)`, `createSettingsRepository(db)`.
- All repositories consume `IDBPDatabase<ShimengDb>` from `openShimengDb()`.

- [x] **Step 1: Write repository round-trip and cascade-delete tests**

```ts
const dream = createDraftDream('dream-1', new Date('2026-08-25T00:00:00Z'))
await dreams.put({ ...dream, status: 'saved', rawText: '水面尽头有一扇门' })
await media.put({ id: 'audio-1', dreamId: dream.id, kind: 'audio', mimeType: 'audio/webm', size: 3, createdAt: dream.createdAt, blob: new Blob(['abc']) })
await dreams.deleteWithMedia(dream.id)
expect(await dreams.get(dream.id)).toBeUndefined()
expect(await media.listByDream(dream.id)).toEqual([])
```

- [x] **Step 2: Run tests and verify the expected failure**

Run `npm test -- src/features/dreams/data/dreamRepository.test.ts src/features/media/data/mediaRepository.test.ts src/features/settings/data/settingsRepository.test.ts`.

Expected: FAIL because the models and repositories are not defined.

- [x] **Step 3: Define exact domain types and defaults**

```ts
export type DreamMood = 'calm' | 'joyful' | 'mysterious' | 'sad' | 'anxious' | 'fearful' | 'surreal' | 'neutral'
export type DreamStatus = 'draft' | 'saved'
export type DreamClarity = 1 | 2 | 3 | 4 | 5
```

`createDraftDream` returns `status: 'draft'`, `mood: 'neutral'`, `clarity: 3`, `lucid: false`, empty arrays, and `coverSeed` equal to the ID.

- [x] **Step 4: Implement database and repository contracts**

```ts
interface ShimengDb extends DBSchema {
  dreams: { key: string; value: DreamRecord; indexes: { 'by-status': DreamStatus; 'by-dreamedAt': string } }
  media: { key: string; value: MediaAsset; indexes: { 'by-dreamId': string; 'by-kind': MediaKind } }
  settings: { key: 'app'; value: AppSettings }
}
```

`DreamRepository` exposes `get`、`put`、`listSaved`、`getDrafts`、`deleteWithMedia`; `MediaRepository` exposes `get`、`put`、`listByDream`、`delete`; `SettingsRepository` exposes `get` and `put`. `deleteWithMedia` uses one read-write transaction across `dreams` and `media`.

Map IndexedDB `QuotaExceededError` to `StorageWriteError('本机存储空间不足，请先导出备份或删除较大的录音')`; preserve the original error as `cause`. Repository tests assert this exact mapping and that a failed write is not returned as success.

- [x] **Step 5: Verify and commit persistence**

```bash
npm test -- src/features/dreams/data/dreamRepository.test.ts src/features/media/data/mediaRepository.test.ts src/features/settings/data/settingsRepository.test.ts
npm run build
git diff --check -- .
git add src/core/persistence src/features/dreams/model src/features/dreams/data src/features/media/model src/features/media/data src/features/settings/model src/features/settings/data src/test/setup.ts
git commit --only -m "feat: add local dream persistence" -- .
```

Expected: repository tests PASS and TypeScript build exits 0.

### Task 3: Dream store, editor and autosaved drafts

**Files:**
- Create: `拾梦/src/features/dreams/stores/dreams.ts`
- Create: `拾梦/src/features/dreams/composables/useDraftAutosave.ts`
- Create: `拾梦/src/features/dreams/components/DreamMetaFields.vue`
- Create: `拾梦/src/features/dreams/components/DreamEditor.vue`
- Modify: `拾梦/src/pages/RecordPage.vue`
- Test: `拾梦/src/features/dreams/stores/dreams.test.ts`
- Test: `拾梦/src/pages/RecordPage.test.ts`

**Interfaces:**
- Consumes `DreamRepository`, `DreamRecord`, `createDraftDream` from Task 2.
- Produces store actions `load()`、`openDraft(id?)`、`saveDraft(record)`、`publish(record)`、`updateSaved(record)`.
- Produces `useDraftAutosave(recordRef, save, 400)` with `flush()` and `dispose()`.

- [x] **Step 1: Write failing store and autosave UI tests**

```ts
await wrapper.get('textarea[name="rawText"]').setValue('我沿着水面走向一扇门')
await vi.advanceTimersByTimeAsync(399)
expect(saveDraft).not.toHaveBeenCalled()
await vi.advanceTimersByTimeAsync(1)
expect(saveDraft).toHaveBeenCalledTimes(1)
```

Also assert refresh/loading restores the draft and `保存梦境` changes status to `saved` without requiring a title.
Mock a repository `StorageWriteError` and assert the textarea keeps its content while a persistent `保存失败，内容仍保留在当前页面` warning is shown.

- [x] **Step 2: Run tests and verify the expected failure**

Run `npm test -- src/features/dreams/stores/dreams.test.ts src/pages/RecordPage.test.ts`.

Expected: FAIL because store, composable and editor do not exist.

- [x] **Step 3: Implement store orchestration and autosave**

Store state is `savedDreams: DreamRecord[]` and `activeDraft: DreamRecord | null`; repositories remain persistence owners. `publish` rejects only when both original text and recordings are empty:

```ts
if (!record.rawText.trim() && record.audioAssetIds.length === 0) {
  throw new Error('请写下一点梦境，或先留下一段录音')
}
```

- [x] **Step 4: Implement editor fields and RecordPage**

Render named controls `rawText`、`dreamedAt`、`mood`、`clarity`、`lucid`、`tags`、`favorite`. Split tags on Chinese/English commas, trim, deduplicate, and remove empty values. Keep save visible above the safe-area inset.

- [x] **Step 5: Verify and commit the editor**

```bash
npm test -- src/features/dreams/stores/dreams.test.ts src/pages/RecordPage.test.ts
npm run build
git diff --check -- .
git add src/features/dreams/stores src/features/dreams/composables src/features/dreams/components src/pages/RecordPage.vue
git commit --only -m "feat: add autosaved dream editor" -- .
```

Expected: tests PASS; a text-only dream can be saved and reloaded.

### Task 4: Deterministic offline covers and dream-river home

**Files:**
- Create: `拾梦/src/features/dreams/cover/coverScene.ts`
- Create: `拾梦/src/features/dreams/cover/renderDreamCover.ts`
- Create: `拾梦/src/features/dreams/cover/coverScene.test.ts`
- Create: `拾梦/src/features/dreams/components/DreamCover.vue`
- Create: `拾梦/src/features/dreams/components/DreamCard.vue`
- Modify: `拾梦/src/pages/HomePage.vue`
- Test: `拾梦/src/pages/HomePage.test.ts`

**Interfaces:**
- Consumes `DreamRecord`.
- Produces `createCoverScene(record): CoverScene`, `renderDreamCover(canvas, scene, size): void`, and `<DreamCover :dream :decorative="boolean" />`.

- [ ] **Step 1: Write deterministic-scene tests**

```ts
expect(createCoverScene(dream)).toEqual(createCoverScene(structuredClone(dream)))
expect(createCoverScene({ ...dream, id: 'other', coverSeed: 'other' }).stars)
  .not.toEqual(createCoverScene(dream).stars)
```

Also assert `fearful` selects the dark palette and clarity 1 has higher fog opacity than clarity 5.

- [ ] **Step 2: Run tests and verify the expected failure**

Run `npm test -- src/features/dreams/cover/coverScene.test.ts src/pages/HomePage.test.ts`.

Expected: FAIL because cover modules and final HomePage are absent.

- [ ] **Step 3: Implement seeded parameters and Canvas layers**

Use a local string hash plus Mulberry32 PRNG. `CoverScene` contains palette colors, `fogOpacity`, `light`, `stars`, `ripples`, and `grainSeed`. Draw gradient sky/water, blurred light, horizon haze, stars, ripples, then low-opacity grain. Do not fetch image assets.

```ts
export interface CoverScene {
  sky: [string, string]
  water: [string, string]
  fogOpacity: number
  light: { x: number; y: number; radius: number; color: string }
  stars: Array<{ x: number; y: number; radius: number; alpha: number }>
  ripples: Array<{ x: number; y: number; width: number; alpha: number }>
  grainSeed: number
}
```

- [ ] **Step 4: Implement DreamCover, DreamCard and HomePage**

Use `ResizeObserver` to redraw canvas at device pixel ratio. Home shows an honest empty state when no saved dreams exist; otherwise order by `dreamedAt` then `createdAt` descending. A missing title displays `未命名的梦`, never generated prose.

- [ ] **Step 5: Verify and commit covers**

```bash
npm test -- src/features/dreams/cover/coverScene.test.ts src/pages/HomePage.test.ts
npm run build
git diff --check -- .
git add src/features/dreams/cover src/features/dreams/components/DreamCover.vue src/features/dreams/components/DreamCard.vue src/pages/HomePage.vue
git commit --only -m "feat: add offline dream covers" -- .
```

Expected: tests PASS and HomePage renders empty and populated states.

### Task 5: Local audio recording and playback

**Files:**
- Create: `拾梦/src/features/media/services/mediaRecorder.ts`
- Create: `拾梦/src/features/media/services/mediaRecorder.test.ts`
- Create: `拾梦/src/features/media/composables/useDreamRecorder.ts`
- Create: `拾梦/src/features/media/components/DreamRecorder.vue`
- Create: `拾梦/src/features/media/components/LocalAudioPlayer.vue`
- Modify: `拾梦/src/pages/RecordPage.vue`
- Modify: `拾梦/src/pages/DreamDetailPage.vue`
- Test: `拾梦/src/features/media/components/DreamRecorder.test.ts`

**Interfaces:**
- Consumes `MediaRepository.put`, `MediaRepository.get`, and active `DreamRecord.id`.
- Produces `chooseRecorderMimeType(MediaRecorder): string | undefined` and states `idle | requesting | recording | paused | saving | ready | error`.

- [ ] **Step 1: Write MIME selection and permission-failure tests**

Preference order is `audio/webm;codecs=opus`、`audio/mp4`、`audio/webm`; undefined lets the browser choose. Reject `getUserMedia` with `NotAllowedError` and assert the editor stays present with `没有麦克风权限，仍可继续文字记录`.

- [ ] **Step 2: Run tests and verify the expected failure**

Run `npm test -- src/features/media/services/mediaRecorder.test.ts src/features/media/components/DreamRecorder.test.ts`.

Expected: FAIL because recording services are undefined.

- [ ] **Step 3: Implement recorder state and resource cleanup**

```ts
export interface SavedRecording {
  blob: Blob
  mimeType: string
  durationMs: number
}
```

Collect `dataavailable` chunks, stop every stream track after completion/cancel/error, save only non-empty blobs, and revoke playback object URLs on replacement or unmount.

- [ ] **Step 4: Persist recordings and connect both pages**

On save, create a `MediaAsset` ID, persist the Blob, append the ID to `DreamRecord.audioAssetIds`, then save the dream. `LocalAudioPlayer` resolves the Blob and renders `<audio controls>`.

If media persistence throws `StorageWriteError`, keep the completed Blob in component memory until the user retries or discards it, do not append an asset ID, and show `录音尚未保存，请先释放空间或导出备份`.

- [ ] **Step 5: Verify and commit recording**

```bash
npm test -- src/features/media
npm test -- src/pages/RecordPage.test.ts
npm run build
git diff --check -- .
git add src/features/media src/pages/RecordPage.vue src/pages/DreamDetailPage.vue
git commit --only -m "feat: add local dream recording" -- .
```

Expected: tests PASS and all fake media tracks receive `stop()`.

### Task 6: Detail, archive, filters, favorite and undoable delete

**Files:**
- Create: `拾梦/src/features/dreams/search/filterDreams.ts`
- Create: `拾梦/src/features/dreams/search/filterDreams.test.ts`
- Create: `拾梦/src/features/dreams/components/DreamFilters.vue`
- Modify: `拾梦/src/features/dreams/stores/dreams.ts`
- Modify: `拾梦/src/pages/DreamDetailPage.vue`
- Modify: `拾梦/src/pages/ArchivePage.vue`
- Test: `拾梦/src/pages/DreamDetailPage.test.ts`
- Test: `拾梦/src/pages/ArchivePage.test.ts`

**Interfaces:**
- Produces `filterDreams(dreams, filters): DreamRecord[]` and store actions `toggleFavorite(id)`、`scheduleDelete(id, 8000)`、`undoDelete(id)`.
- `DreamFilters` emits one immutable `DreamFiltersValue` containing query, moods, clarity, lucid-only and favorite-only.

- [ ] **Step 1: Write filter and delayed-delete tests**

Search title, original text, summary and tags case-insensitively. With fake timers, assert repository deletion occurs at 8000ms, not 7999ms, and `undoDelete` cancels it.

```ts
vi.advanceTimersByTime(7_999)
expect(deleteWithMedia).not.toHaveBeenCalled()
vi.advanceTimersByTime(1)
expect(deleteWithMedia).toHaveBeenCalledWith('dream-1')
```

- [ ] **Step 2: Run tests and verify the expected failure**

Run `npm test -- src/features/dreams/search/filterDreams.test.ts src/pages/DreamDetailPage.test.ts src/pages/ArchivePage.test.ts`.

Expected: FAIL because filter and final pages are not implemented.

- [ ] **Step 3: Implement filtering and month grouping**

Normalize with `toLocaleLowerCase('zh-CN')`; every active filter is conjunctive. Group with local `YYYY年M月` labels and order groups descending.

```ts
export interface DreamFiltersValue {
  query: string
  moods: DreamMood[]
  clarity: DreamClarity[]
  lucidOnly: boolean
  favoriteOnly: boolean
}
```

- [ ] **Step 4: Implement detail and archive actions**

Detail renders original text, optional summary, metadata, recordings, favorite, edit and delete. The undo toast reads `梦境已移入雾中` and keeps `撤销` visible for eight seconds.

- [ ] **Step 5: Verify and commit archive/detail**

```bash
npm test -- src/features/dreams/search src/pages/DreamDetailPage.test.ts src/pages/ArchivePage.test.ts
npm run build
git diff --check -- .
git add src/features/dreams/search src/features/dreams/components/DreamFilters.vue src/features/dreams/stores/dreams.ts src/pages/DreamDetailPage.vue src/pages/ArchivePage.vue
git commit --only -m "feat: add dream archive and detail actions" -- .
```

Expected: tests PASS and delete remains reversible for eight seconds.

### Task 7: Versioned backup, validation and non-destructive restore

**Files:**
- Create: `拾梦/src/features/backup/model/backup.ts`
- Create: `拾梦/src/features/backup/services/backupService.ts`
- Create: `拾梦/src/features/backup/services/backupService.test.ts`
- Create: `拾梦/src/features/backup/components/RestorePreviewDialog.vue`
- Modify: `拾梦/src/pages/SettingsPage.vue`
- Modify: `拾梦/src/features/settings/data/settingsRepository.ts`
- Test: `拾梦/src/pages/SettingsPage.test.ts`

**Interfaces:**
- Produces `createBackup(db): Promise<Blob>`, `inspectBackup(blob): Promise<BackupInspection>`, `restoreBackup(db, inspection): Promise<RestoreReport>`.
- `BackupInspection` contains valid dreams/media, warnings and counts; `RestoreReport` contains imported, skipped and conflictCopies.

- [ ] **Step 1: Write round-trip, invalid-file and conflict tests**

Create one dream plus a three-byte audio Blob, export, inspect, restore into a fresh test DB, and compare text and bytes. Invalid `schemaVersion`, missing media and malformed JSON fail before any write. A same-ID different record gets a new ID and tag `恢复副本`.

- [ ] **Step 2: Run tests and verify the expected failure**

Run `npm test -- src/features/backup/services/backupService.test.ts src/pages/SettingsPage.test.ts`.

Expected: FAIL because backup services and settings actions are missing.

- [ ] **Step 3: Implement the archive contract**

Use fflate to write and read:

```text
manifest.json
dreams.json
media/{assetId}.{extension}
```

`manifest.json` has `schemaVersion: 1`, `exportedAt`, `dreamCount`, `mediaCount`. Derive extensions from a known MIME allowlist. Inspection validates all records in memory before opening a write transaction.

- [ ] **Step 4: Implement restore preview and settings actions**

Show an unencrypted-backup warning before download. Import opens `RestorePreviewDialog` with counts and warnings; only `确认恢复` writes. After successful export, save `lastBackupAt`.

- [ ] **Step 5: Verify and commit backup/restore**

```bash
npm test -- src/features/backup src/pages/SettingsPage.test.ts
npm run build
git diff --check -- .
git add src/features/backup src/pages/SettingsPage.vue src/features/settings/data/settingsRepository.ts
git commit --only -m "feat: add local backup and restore" -- .
```

Expected: tests PASS and backup bytes round-trip without loss.

### Task 8: Readable dream-poster export

**Files:**
- Create: `拾梦/src/features/export/services/posterLayout.ts`
- Create: `拾梦/src/features/export/services/posterLayout.test.ts`
- Create: `拾梦/src/features/export/services/posterService.ts`
- Create: `拾梦/src/features/export/components/PosterPreviewDialog.vue`
- Modify: `拾梦/src/pages/DreamDetailPage.vue`
- Test: `拾梦/src/features/export/components/PosterPreviewDialog.test.ts`

**Interfaces:**
- Consumes `DreamRecord`, `MediaRepository`, `createCoverScene`, `renderDreamCover`.
- Produces `layoutPosterText(ctx, text, width, options): PosterPage[]` and `renderDreamPosters(dream): Promise<Blob[]>`.

- [ ] **Step 1: Write wrapping and pagination tests**

Use deterministic mocked `measureText`. Assert short text creates one page, long Chinese text creates multiple pages, no line exceeds content width, and font size never falls below 28px at 1080px export width.

- [ ] **Step 2: Run tests and verify the expected failure**

Run `npm test -- src/features/export`.

Expected: FAIL because poster layout and preview do not exist.

- [ ] **Step 3: Implement poster layout and rendering**

```ts
export interface PosterPage {
  lines: string[]
  pageNumber: number
  totalPages: number
}
```

Export at 1080px width. Use an AI image when present, otherwise render the offline cover. First page includes title/date/mood/tags; subsequent pages repeat a small `拾梦` mark and page number. `导出摘要` uses summary; full export paginates original text.

- [ ] **Step 4: Implement preview and download**

Preview every page. One page downloads `拾梦-{date}-{title}.png`; multiple pages download numbered PNGs after one confirmation. Revoke preview object URLs on close.

- [ ] **Step 5: Verify and commit poster export**

```bash
npm test -- src/features/export
npm run build
git diff --check -- .
git add src/features/export src/pages/DreamDetailPage.vue
git commit --only -m "feat: export dream posters" -- .
```

Expected: tests PASS and long text never uses unreadably small font.

### Task 9: Configurable AI gateway and explicit consent workflows

**Files:**
- Create: `拾梦/src/features/ai/model/ai.ts`
- Create: `拾梦/src/features/ai/services/DreamAiGateway.ts`
- Create: `拾梦/src/features/ai/services/HttpDreamAiGateway.ts`
- Create: `拾梦/src/features/ai/services/HttpDreamAiGateway.test.ts`
- Create: `拾梦/src/features/ai/composables/useDreamAi.ts`
- Create: `拾梦/src/features/ai/components/AiConsentDialog.vue`
- Create: `拾梦/src/features/ai/components/AiActionPanel.vue`
- Modify: `拾梦/src/features/settings/model/settings.ts`
- Modify: `拾梦/src/features/settings/stores/settings.ts`
- Modify: `拾梦/src/pages/SettingsPage.vue`
- Modify: `拾梦/src/pages/DreamDetailPage.vue`
- Test: `拾梦/src/features/ai/components/AiActionPanel.test.ts`

**Interfaces:**
- Produces `DreamAiGateway` methods `organizeDream`、`transcribeAudio`、`generateDreamImage`.
- HTTP routes are `POST {endpoint}/organize` JSON, `POST {endpoint}/transcribe` multipart field `audio`, and `POST {endpoint}/image` JSON returning an image Blob.

- [ ] **Step 1: Write unconfigured, canceled, timeout and success tests**

Assert an empty endpoint renders `尚未配置 AI 服务`; canceling consent makes zero fetch calls; organize timeout is 45 seconds; image/transcription timeout is 120 seconds; malformed mood or non-image response is rejected without mutating the dream.

- [ ] **Step 2: Run tests and verify the expected failure**

Run `npm test -- src/features/ai`.

Expected: FAIL because gateway and AI UI are not defined.

- [ ] **Step 3: Define and validate gateway contracts**

```ts
export interface DreamAiGateway {
  organizeDream(input: OrganizeDreamInput, signal: AbortSignal): Promise<OrganizeDreamResult>
  transcribeAudio(audio: Blob, signal: AbortSignal): Promise<{ transcript: string }>
  generateDreamImage(input: GenerateDreamImageInput, signal: AbortSignal): Promise<Blob>
}
```

Validate response keys, lengths, mood union, keyword array and image MIME. Allow HTTPS endpoints, plus HTTP only for `localhost` and `127.0.0.1` development.

- [ ] **Step 4: Implement consent and non-destructive application**

Consent enumerates `梦境正文与已选元数据`、`所选录音` or `摘要、情绪与关键词`. Organize returns a candidate preview; applying updates title/summary/mood/keywords but never `rawText`. Transcription inserts candidate text only after confirmation. AI image saves a new `MediaAsset`, then updates `aiImageAssetId`; remove the old AI image only after the new one persists.

`恢复氛围封面` clears `aiImageAssetId` only after explicit confirmation and then deletes the former AI image asset. `清除 AI 整理` clears title、summary、keywords and `aiUpdatedAt` without changing original text or user-entered metadata.

- [ ] **Step 5: Verify and commit AI boundaries**

```bash
npm test -- src/features/ai src/pages/DreamDetailPage.test.ts src/pages/SettingsPage.test.ts
npm run build
git diff --check -- .
git add src/features/ai src/features/settings src/pages/SettingsPage.vue src/pages/DreamDetailPage.vue
git commit --only -m "feat: add optional AI gateway" -- .
```

Expected: tests PASS; with no endpoint there are no network requests and offline features remain enabled.

### Task 10: Onboarding, storage persistence, install and safe PWA updates

**Files:**
- Create: `拾梦/public/icons/app-icon.svg`
- Create: `拾梦/public/apple-touch-icon.svg`
- Create: `拾梦/src/pwa/installPrompt.ts`
- Create: `拾梦/src/pwa/installPrompt.test.ts`
- Create: `拾梦/src/pwa/storagePersistence.ts`
- Create: `拾梦/src/pwa/storagePersistence.test.ts`
- Create: `拾梦/src/pwa/registerServiceWorker.ts`
- Create: `拾梦/src/pwa/registerServiceWorker.test.ts`
- Modify: `拾梦/vite.config.ts`
- Modify: `拾梦/index.html`
- Modify: `拾梦/src/main.ts`
- Modify: `拾梦/src/router/index.ts`
- Modify: `拾梦/src/pages/OnboardingPage.vue`
- Modify: `拾梦/src/pages/SettingsPage.vue`
- Modify: `拾梦/src/features/settings/stores/settings.ts`
- Test: `拾梦/src/pages/OnboardingPage.test.ts`

**Interfaces:**
- Produces `requestPersistentStorage(): Promise<PersistenceStatus>`, `estimateStorage(): Promise<StorageSummary>`, `useInstallPrompt()`, and `registerServiceWorker(canReload): UpdateController`.
- `canReload()` is false while a draft is dirty or recorder state is not `idle | ready`.

- [ ] **Step 1: Write onboarding, install and update-gating tests**

Assert first launch redirects from `/home` to `/onboarding`; accepting saves settings and routes home. Android `beforeinstallprompt` is invoked only on click. iOS without that event displays `分享 → 添加到主屏幕`. `onNeedRefresh` exposes refresh but does not call updater while `canReload()` is false.

- [ ] **Step 2: Run tests and verify the expected failure**

Run `npm test -- src/pwa src/pages/OnboardingPage.test.ts src/router/routes.test.ts`.

Expected: FAIL because install/storage/update helpers are missing.

- [ ] **Step 3: Implement manifest and local SVG icon**

Configure `VitePWA({ registerType: 'prompt' })`, name/short name `拾梦`, `display: 'standalone'`, theme `#151827`, background `#eef0f3`, start URL `./#/home`, and SVG icons with `sizes: 'any'`. The icon uses one crescent, one narrow door and two water ripples with a consistent stroke; no remote assets or fonts.

Use `workbox: { cleanupOutdatedCaches: true, navigateFallback: 'index.html', runtimeCaching: [] }`. Only compiled app-shell assets enter the precache; no rule may runtime-cache AI requests, IndexedDB content, media Blobs or exported files.

- [ ] **Step 4: Implement onboarding, persistence and safe update**

Call `navigator.storage.persist()` after onboarding explanation. Store `granted | denied | unsupported` for session display. Use `navigator.storage.estimate()` plus IndexedDB counts to show used bytes, quota, dream count, audio count and image count. Settings exposes `system | reduce | allow`; `system` follows `prefers-reduced-motion`, while the other values explicitly override it. Register SW only in production. On refresh acceptance, flush autosave and finish/cancel recording before `updateServiceWorker(true)`.

- [ ] **Step 5: Verify and commit PWA behavior**

```bash
npm test -- src/pwa src/pages/OnboardingPage.test.ts src/router/routes.test.ts
npm run build
test -f dist/manifest.webmanifest
git diff --check -- .
git add public index.html vite.config.ts src/pwa src/main.ts src/router src/pages/OnboardingPage.vue src/pages/SettingsPage.vue src/features/settings/stores/settings.ts
git commit --only -m "feat: make 拾梦 installable offline" -- .
```

Expected: tests PASS and production build contains manifest and service worker.

### Task 11: End-to-end regression, accessibility and mobile handoff

**Files:**
- Create: `拾梦/e2e/core-flow.spec.ts`
- Create: `拾梦/e2e/offline-flow.spec.ts`
- Create: `拾梦/e2e/backup-flow.spec.ts`
- Create: `拾梦/e2e/ai-boundary.spec.ts`
- Create: `拾梦/docs/qa/v1-mobile-checklist.md`
- Modify: `拾梦/src/styles/base.css`
- Modify: only files under `拾梦/src` that fail the checks below.

**Interfaces:**
- Consumes all prior public routes and visible labels.
- Produces a reproducible QA checklist and clean release build; no new product scope.

- [ ] **Step 1: Write E2E tests for accepted flows**

```ts
test('creates, edits, favorites, searches and deletes a local dream', async ({ page }) => {
  await page.goto('/#/record')
  await page.getByLabel('梦境内容').fill('湖面尽头出现一扇门')
  await page.getByRole('button', { name: '保存梦境' }).click()
  await expect(page.getByText('湖面尽头出现一扇门')).toBeVisible()
})
```

Add separate tests for backup/media restore, offline core flow, and zero AI calls before consent. Create data through visible UI. The offline test first loads the production preview, waits for `navigator.serviceWorker.ready`, then switches the context offline and reloads. At 360×800 assert `document.documentElement.scrollWidth === 360`.

- [ ] **Step 2: Run E2E and capture concrete failures**

```bash
npx playwright install chromium
npm run test:e2e
```

Expected: each failure maps to a named accepted flow; fix only those failures and the defined accessibility issues.

- [ ] **Step 3: Fix verified integration and accessibility failures**

Every icon-only control gets an accessible name; labels connect to controls; focus rings remain visible; normal text meets WCAG AA contrast; dialogs trap focus and restore it on close. Do not add unrelated features or redesign accepted screens.

- [ ] **Step 4: Write the manual mobile checklist**

`docs/qa/v1-mobile-checklist.md` lists pass/fail checks for Android Chrome and iPhone Safari/Add to Home Screen: safe areas, keyboard, microphone permission, playback after restart, backup download/import, reduced motion, install instructions, storage warning and update while editing.

- [ ] **Step 5: Run the complete verification suite**

```bash
npm run lint
npm test
npm run build
npm run test:e2e
git diff --check -- .
rg -n "TODO|TBD|console\.log|API_KEY|sk-[A-Za-z0-9]" src public e2e docs package.json vite.config.ts || true
```

Expected: lint, unit tests, build and E2E exit 0; scan shows no unfinished markers, debug logs or embedded secrets.

- [ ] **Step 6: Commit the verified V1**

```bash
git add e2e docs/qa src public package.json package-lock.json vite.config.ts playwright.config.ts
git commit --only -m "test: verify 拾梦 PWA first release" -- .
git status --short --branch
```

Expected: commit contains only `拾梦` files; unrelated root worktree changes remain untouched.

## Completion Report

The final handoff must state:

- The new project path and exact commit list.
- The files and feature areas implemented.
- That no Venus `openqiqi` or OpenSpec applied; the confirmed Spec and this plan were used.
- Whether interfaces, local data schema, configuration, i18n, errors, logs and permissions changed.
- Exact results for lint, unit tests, build and E2E.
- Manual Android/iPhone checks that still require a physical device.
- That real AI activation remains optional and requires a separately configured server endpoint and server-side key.
