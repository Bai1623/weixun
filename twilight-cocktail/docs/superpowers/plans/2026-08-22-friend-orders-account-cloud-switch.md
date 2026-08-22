# Friend Orders and Cloud Account Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add collapsible friend orders, destructive link-close semantics, cloud-authoritative account switching, and reliable non-blocking photo backup after local work saves.

**Architecture:** Keep the existing Vue/Pinia/CloudBase architecture and make the smallest compatible changes. Account switching becomes a two-phase preview/activate flow so remote data is staged before any local mutation; friend-order deletion remains server-authoritative; photo saves are cached locally first and then sent through one retryable backup orchestrator.

**Tech Stack:** Vue 3, Pinia 3, TypeScript 5.9, Vitest, Node test runner, Tencent CloudBase HTTP functions, Aliyun OSS, IndexedDB.

**Spec:** `docs/superpowers/specs/2026-08-22-friend-orders-account-cloud-switch-design.md`

## Global Constraints

- The cloud is the source of truth for the activated account; never merge records from different accounts.
- Do not create or activate a target account until the user confirms replacement.
- A cancelled or failed preview must leave the current session and local data unchanged.
- Closing a drink-request link deletes all requests; resetting a link preserves requests.
- A cloud backup failure must not be presented as a failed local work save.
- Retry only idempotent CloudBase requests; do not add generic retries to share creation or drink-request submission.
- Preserve existing Vue, Pinia, CloudBase, and test styles; no new runtime dependencies.

---

### Task 1: Make friend-request link closure server-authoritative

**Files:**
- Modify: `cloudbase/twilightWorks/index.test.cjs`
- Modify: `cloudbase/twilightWorks/index.js`

**Interfaces:**
- Consumes: existing `request-share-disable`, `drink-request-submit`, `drink-requests-get`, `saveDoc`, and `disableShareDoc` behavior.
- Produces: `request-share-disable` returns `{ ok: true, enabled: false, requestCount: 0 }` and persists an empty `drinkRequests` array before disabling the share document.

- [ ] **Step 1: Write the failing cloud-function test**

Add a test that creates a share, submits two requests, disables the link, fetches the owner list, and retries submission:

```js
const validDrinkRequest = (cocktailName) => ({
  guestName: "朋友",
  cocktailName,
  ingredientGroups: {
    baseLiquors: ["金酒"],
    flavorLiquors: [],
    beverages: ["汤力水"],
    other: "",
  },
  note: "少甜",
});

test("disabling a drink request share deletes all requests and rejects the old link", async () => {
  const collection = createFakeCollection();
  const api = loadFunction(collection);
  await createAccountAndShare(api);
  await post(api, { action: "drink-request-submit", shareToken, request: validDrinkRequest("第一杯") });
  await post(api, { action: "drink-request-submit", shareToken, request: validDrinkRequest("第二杯") });

  const disabled = await post(api, {
    action: "request-share-disable",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
  });
  const list = await post(api, {
    action: "drink-requests-get",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
  });
  const resubmit = await post(api, {
    action: "drink-request-submit",
    shareToken,
    request: validDrinkRequest("第三杯"),
  });

  assert.equal(disabled.body.requestCount, 0);
  assert.deepEqual(list.body.requests, []);
  assert.equal(resubmit.body.status, "share_disabled");
});
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `node --test cloudbase/twilightWorks/index.test.cjs --test-name-pattern="disabling a drink request share"`

Expected: FAIL because disabling currently preserves `drinkRequests`.

- [ ] **Step 3: Implement the minimal backend change**

Change `request-share-disable` so the account document is disabled and emptied first:

```js
await saveDoc(accountDocId(accountNameKey), {
  requestShareEnabled: false,
  requestShareUpdatedAt: now,
  drinkRequests: [],
  drinkRequestCount: 0,
});
await disableShareDoc(account.doc?.requestShareKey || "");
return response({ ok: true, enabled: false, requestCount: 0 });
```

- [ ] **Step 4: Run the cloud-function test file and verify GREEN**

Run: `node --test cloudbase/twilightWorks/index.test.cjs`

Expected: all cloud-function tests pass, including the existing delete-then-refetch regression.

- [ ] **Step 5: Commit the backend behavior**

```bash
git add cloudbase/twilightWorks/index.js cloudbase/twilightWorks/index.test.cjs
git commit -m "fix: clear drink requests when closing share"
```

### Task 2: Add friend-request collapse and destructive confirmation

**Files:**
- Modify: `frontend/src/pages/WorksPage.test.ts`
- Modify: `frontend/src/pages/WorksPage.vue`

**Interfaces:**
- Consumes: Task 1 response semantics and existing `disableDrinkRequestShare()` service.
- Produces: `isDrinkRequestListExpanded: Ref<boolean>`, `data-testid="drink-request-summary"`, confirmed close behavior, and new-request expansion behavior.

- [ ] **Step 1: Write failing component tests**

Update the existing friend-request test and add focused assertions:

```ts
expect(wrapper.get('[data-testid="drink-request-summary"]').text()).toContain('当前有 1 条朋友点单')
expect(wrapper.text()).not.toContain('冰岛')
await wrapper.get('[data-testid="drink-request-summary"]').trigger('click')
expect(wrapper.text()).toContain('冰岛')
await wrapper.get('[data-testid="drink-request-summary"]').trigger('click')
expect(wrapper.text()).not.toContain('冰岛')
```

For the new-order prompt, click `drink-request-view-new` and assert the card becomes visible. For close-link behavior, mock `window.confirm` first as `false` and assert no API call, then as `true` and assert the API is called and the order card is removed.

- [ ] **Step 2: Run the page test and verify RED**

Run: `pnpm --dir frontend exec vitest run src/pages/WorksPage.test.ts`

Expected: FAIL because the summary control and confirmation do not exist.

- [ ] **Step 3: Implement the collapse and confirmation UI**

Add state and behavior:

```ts
const isDrinkRequestListExpanded = ref(false)

const viewNewDrinkRequests = () => {
  newDrinkRequestPrompt.value = null
  isDrinkRequestListExpanded.value = true
  drinkRequestPanelEl.value?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}
```

Render a summary button with `aria-expanded`, `ChevronDown`/`ChevronUp`, and condition the cards on `isDrinkRequestListExpanded`. Before disabling, call:

```ts
const requestCount = drinkRequests.value.length
if (!window.confirm(`关闭后当前链接立即失效，并永久删除该链接下全部 ${requestCount} 条点单，是否继续？`)) return
```

On success, clear `drinkRequests`, close the list, reset the share state, and reset the seen count.

- [ ] **Step 4: Run the page test and verify GREEN**

Run: `pnpm --dir frontend exec vitest run src/pages/WorksPage.test.ts`

Expected: all WorksPage tests pass.

- [ ] **Step 5: Commit the friend-order UI**

```bash
git add frontend/src/pages/WorksPage.vue frontend/src/pages/WorksPage.test.ts
git commit -m "feat: collapse and clear friend drink requests"
```

### Task 3: Introduce two-phase cloud account preview and activation

**Files:**
- Modify: `frontend/src/services/cloudWorks.test.ts`
- Modify: `frontend/src/services/cloudWorks.ts`

**Interfaces:**
- Produces:
  - `CloudAccountPreview = { session: CloudWorksSession; status: 'matched' | 'new'; appData: CloudAppData; recordCount: number }`
  - `previewCloudWorksAccount(accountName: string, password: string): Promise<CloudAccountPreview>`
  - `activateCloudWorksAccount(preview: CloudAccountPreview): Promise<CloudWorksSession>`
  - `replaceCloudWorksSession(session: CloudWorksSession | null): void`
- Consumes: existing account identity, `account-login`, `account-create`, and chunked account-data fetch actions.

- [ ] **Step 1: Write failing service tests**

Add tests proving preview has no persistence or creation side effect:

```ts
const preview = await previewCloudWorksAccount('target', 'pass')
expect(preview.status).toBe('new')
expect(getCloudWorksSession()).toBeNull()
expect(fetchMock).toHaveBeenCalledTimes(1)
```

Add a matched-account test whose mocked calls return `account-login`, `works-get-start`, and the remote app payload, then assert `preview.appData` is populated while the current session is unchanged. Add activation tests proving a new account is created only during activation and the target session is then stored.

- [ ] **Step 2: Run service tests and verify RED**

Run: `pnpm --dir frontend exec vitest run src/services/cloudWorks.test.ts`

Expected: FAIL because the preview and activation APIs do not exist.

- [ ] **Step 3: Implement the service boundary**

Extract `fetchCloudAppDataForSession(session)` from `fetchCloudAppData()`. Implement preview using `buildCloudWorksIdentity` plus `account-login`; return empty app data for `account_not_found` without calling `account-create`. Implement activation so only `status === 'new'` calls `account-create`, then save the session. Keep `loginCloudWorksAccount` as a compatibility wrapper implemented through preview plus activation.

- [ ] **Step 4: Run service tests and verify GREEN**

Run: `pnpm --dir frontend exec vitest run src/services/cloudWorks.test.ts`

Expected: all cloudWorks service tests pass.

- [ ] **Step 5: Commit the staged account service**

```bash
git add frontend/src/services/cloudWorks.ts frontend/src/services/cloudWorks.test.ts
git commit -m "feat: stage cloud account activation"
```

### Task 4: Replace the complete local account package after confirmation

**Files:**
- Modify: `frontend/src/services/workPhotoCache.test.ts`
- Modify: `frontend/src/services/workPhotoCache.ts`
- Modify: `frontend/src/stores/works.test.ts`
- Modify: `frontend/src/stores/works.ts`
- Modify: `frontend/src/pages/WorksPage.test.ts`
- Modify: `frontend/src/pages/WorksPage.vue`

**Interfaces:**
- Consumes: `CloudAccountPreview`, `previewCloudWorksAccount`, `activateCloudWorksAccount`, and `replaceCloudWorksSession` from Task 3.
- Produces:
  - `clearAllWorkPhotos(): Promise<void>`
  - `works.previewCloudAccount(accountName, password): Promise<CloudAccountPreview>`
  - `works.activateCloudAccount(preview): Promise<number>`

- [ ] **Step 1: Write the failing photo-cache clear test**

Store photos for two work IDs, call `clearAllWorkPhotos()`, and assert both are absent.

- [ ] **Step 2: Run the photo-cache test and verify RED**

Run: `pnpm --dir frontend exec vitest run src/services/workPhotoCache.test.ts`

Expected: FAIL because `clearAllWorkPhotos` does not exist.

- [ ] **Step 3: Implement photo-cache clearing and verify GREEN**

Use one IndexedDB read-write transaction and `objectStore(photoStoreName).clear()`, awaiting transaction completion. Re-run the targeted test and expect PASS.

- [ ] **Step 4: Write failing store tests for full replacement**

Seed local works, pantry, favorites, academy, daily pick, custom options, auto-backup state, and deletion records. Preview a target payload and activate it. Assert every local domain equals the target payload, deletion records are empty, the target session is active, all old cached photos are cleared, and all target previews are requested.

Add separate tests for:

```ts
await works.activateCloudAccount(emptyNewAccountPreview)
expect(works.items).toEqual([])
expect(pantry.ingredientSlugs).toEqual([])
expect(favorites.slugs).toEqual([])
```

and for preview failure/cancellation leaving the current session and local data unchanged.

- [ ] **Step 5: Run store tests and verify RED**

Run: `pnpm --dir frontend exec vitest run src/stores/works.test.ts`

Expected: FAIL because the staged store actions and unconditional empty-cloud replacement do not exist.

- [ ] **Step 6: Implement transactional account replacement**

Add an `applyAccountBackupData(appData, { preserveLocalPhotos })` option. The account-switch path uses `false`, writes the complete target app data even when empty, clears deletion records, activates the target session only after confirmation, and restores the previous app-data/session snapshot if synchronous persistence fails. After successful replacement, clear all photo cache and call `restorePhotoPreviews`; preview failures remain retryable without rolling the account back.

- [ ] **Step 7: Run store tests and verify GREEN**

Run: `pnpm --dir frontend exec vitest run src/stores/works.test.ts`

Expected: all work-store tests pass.

- [ ] **Step 8: Write failing WorksPage account-switch tests**

Mock a target preview, seed local data, click login, cancel `window.confirm`, and assert `activateCloudAccount` is not called. Repeat with confirmation and assert activation occurs, old friend-order UI is cleared, and the target panel is loaded. Assert the confirmation text includes both local and cloud work counts and explicitly warns that the complete local account data is replaced.

- [ ] **Step 9: Implement the page switch flow and verify GREEN**

Replace direct `loginCloudAccount` with preview, count-aware confirmation, then activation. Clear password after success, reset old friend-share UI before loading the target panel, and preserve the current UI when the user cancels. Run `pnpm --dir frontend exec vitest run src/pages/WorksPage.test.ts` and expect PASS.

- [ ] **Step 10: Commit full account switching**

```bash
git add frontend/src/services/workPhotoCache.ts frontend/src/services/workPhotoCache.test.ts frontend/src/stores/works.ts frontend/src/stores/works.test.ts frontend/src/pages/WorksPage.vue frontend/src/pages/WorksPage.test.ts
git commit -m "feat: replace local data on cloud account switch"
```

### Task 5: Make photo cloud backup non-blocking and retryable

**Files:**
- Modify: `frontend/src/services/cloudWorks.test.ts`
- Modify: `frontend/src/services/cloudWorks.ts`
- Modify: `frontend/src/stores/works.test.ts`
- Modify: `frontend/src/stores/works.ts`
- Modify: `frontend/src/pages/WorksPage.test.ts`
- Modify: `frontend/src/pages/WorksPage.vue`

**Interfaces:**
- Consumes: existing IndexedDB `pending`/`failed` photo states and `pushAllToCloud()` orchestration.
- Produces: per-action `{ retryOnNetworkError: true }` support for idempotent CloudBase actions and local-success/cloud-pending save messaging.

- [ ] **Step 1: Write failing retry tests**

Mock the first `fetch` for `photo-upload-prepare` or `metadata-patch` to reject with `TypeError`, and the second to return a valid response. Assert the operation succeeds after exactly two attempts. Add a control test that a non-idempotent action does not receive automatic retry behavior.

- [ ] **Step 2: Run cloud service tests and verify RED**

Run: `pnpm --dir frontend exec vitest run src/services/cloudWorks.test.ts`

Expected: FAIL because network errors are not retried.

- [ ] **Step 3: Implement targeted one-retry behavior**

Extend the private request helper:

```ts
const postCloudWorksAction = async (
  body: Record<string, unknown>,
  options: { retryOnNetworkError?: boolean } = {},
) => {
  const maxAttempts = options.retryOnNetworkError ? 2 : 1
  // retry only a thrown TypeError before parsing a response
}
```

Enable it only for `photo-upload-prepare`, `photo-download-prepare`, and `metadata-patch`.

- [ ] **Step 4: Run service tests and verify GREEN**

Run: `pnpm --dir frontend exec vitest run src/services/cloudWorks.test.ts`

Expected: all cloud service tests pass.

- [ ] **Step 5: Write failing cache-first save tests**

Change the store expectation so `attachPreparedPhoto` caches and marks the record pending without calling `uploadCachedWorkPhoto`. Add a page test where `pushAllToCloud` rejects after local save; assert the record remains, the dialog contains “作品已保存到本机，云备份待重试”, and it does not contain “保存失败”.

- [ ] **Step 6: Run store and page tests and verify RED**

Run: `pnpm --dir frontend exec vitest run src/stores/works.test.ts src/pages/WorksPage.test.ts`

Expected: FAIL because attachment currently uploads immediately and the dialog uses the error state.

- [ ] **Step 7: Implement the single backup orchestration**

Remove the implicit upload from `attachPreparedPhoto`; keep original and preview in IndexedDB as pending. In page submit, call `pushAllToCloud()` once after local attachment. If it succeeds, show “作品已保存并完成云备份。” If it fails, reset the form but show a success/notice dialog containing the pending-backup message and error detail. Manual backup remains unchanged and retries pending photos.

- [ ] **Step 8: Run store and page tests and verify GREEN**

Run: `pnpm --dir frontend exec vitest run src/stores/works.test.ts src/pages/WorksPage.test.ts`

Expected: all targeted tests pass.

- [ ] **Step 9: Commit save reliability changes**

```bash
git add frontend/src/services/cloudWorks.ts frontend/src/services/cloudWorks.test.ts frontend/src/stores/works.ts frontend/src/stores/works.test.ts frontend/src/pages/WorksPage.vue frontend/src/pages/WorksPage.test.ts
git commit -m "fix: keep photo saves pending after cloud failure"
```

### Task 6: Verify, deploy, and validate production

**Files:**
- Modify if deployment instructions change: `docs/HANDOFF.md`

**Interfaces:**
- Consumes: all earlier tasks.
- Produces: deployed CloudBase function and GitHub Pages build from the same verified commit.

- [ ] **Step 1: Run complete local verification**

Run:

```bash
node --test cloudbase/twilightWorks/index.test.cjs
pnpm --dir frontend exec vitest run
pnpm --dir frontend exec eslint .
pnpm --dir frontend run build:pages
```

Expected: zero test failures, zero lint errors, and successful production build.

- [ ] **Step 2: Inspect the final diff and plan coverage**

Run `git diff HEAD~5..HEAD --check`, `git status --short`, and compare every spec requirement against the implemented tests. Resolve any gap through a new RED/GREEN cycle before deployment.

- [ ] **Step 3: Deploy the routed CloudBase function**

Deploy local `cloudbase/twilightWorks` code to the function currently mapped to the public `/share` route (`scfnodejshelloworld11`) in environment `bai-d0g23uiiz96a4f50d`. Verify function status and make unauthenticated OPTIONS/validation requests to the public URL.

- [ ] **Step 4: Publish GitHub Pages**

Commit any final generated deployment source required by the repository, push `codex/twilight-cocktail-prototype`, and update the branch used by the GitHub Pages deployment workflow. Wait for the Pages deployment to complete.

- [ ] **Step 5: Run production smoke tests**

Verify on `https://bai1623.github.io/weixun-Twilight-Mixbook/`:

- orders start collapsed and can expand/collapse;
- deleting an order remains deleted after refresh;
- closing a link confirms and clears all orders;
- canceling account replacement preserves local data;
- confirming an existing or empty target account replaces the complete local package;
- target previews restore automatically;
- a simulated/reproducible cloud interruption leaves a local work and pending photo available for manual backup.

- [ ] **Step 6: Record deployment evidence and final commit**

Update `docs/HANDOFF.md` only with verified route/function/commit details, commit documentation if changed, push, and report exact test counts, deployed commit, route, and any remaining limitation.
