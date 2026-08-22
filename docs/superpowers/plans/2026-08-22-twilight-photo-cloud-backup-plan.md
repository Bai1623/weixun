# Twilight Photo Cloud Backup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add private Alibaba OSS backup for original and preview work photos, with full preview restoration after signing in on a new computer.

**Architecture:** The browser stores photo Blobs in IndexedDB and uploads them directly to private OSS through short-lived URLs signed by the existing Tencent CloudBase function. CloudBase keeps only validated Object Keys and photo metadata in collection `bai`; login restores all work metadata first and then downloads every missing preview into IndexedDB.

**Tech Stack:** Vue 3, TypeScript 5.9, Pinia 3, Vitest 3, IndexedDB, Tencent CloudBase Node.js function, Node.js CommonJS tests, `ali-oss` 6.23.0, `fake-indexeddb` 6.2.5.

**Spec:** `docs/superpowers/specs/2026-08-22-twilight-photo-cloud-backup-design.md`

## Global Constraints

- OSS Bucket is private `twilight-cocktail-bai` in `oss-cn-hangzhou`; all objects live under `photos/`.
- New photos store the untouched original plus a JPEG preview with maximum side 1280px and quality 0.82.
- Accept only `image/*` originals up to 50 MB.
- A new-computer login restores all work metadata and automatically downloads every preview; originals download only on explicit request.
- Existing `photoDataUrl` records migrate as `preview-only`; no code may claim an original exists for those records.
- Permanent Alibaba credentials stay only in CloudBase environment variables and never enter frontend code, responses, database documents, tests, logs, or Git.
- Preserve existing CloudBase account verification, metadata sync, JSON compatibility, and unrelated application behavior.
- Follow existing code style and make focused changes; `rule/Venus开发通用规范.md` is not present in the current workspace.

## File Structure

- `cloudbase/twilightWorks/ossPhotos.js`: OSS client construction, photo validation, deterministic keys, signing, HeadObject checks, and deletion.
- `cloudbase/twilightWorks/ossPhotos.test.cjs`: isolated Node tests with a fake OSS client.
- `cloudbase/twilightWorks/index.js`: authenticated photo actions, photo metadata sanitization, metadata patch validation, and cleanup queue orchestration.
- `cloudbase/twilightWorks/index.test.cjs`: HTTP action, account isolation, metadata, and cleanup integration tests.
- `cloudbase/twilightWorks/package.json`: pin `ali-oss` 6.23.0.
- `frontend/src/services/workPhotoCache.ts`: IndexedDB Blob/cache/sync-queue persistence only.
- `frontend/src/services/workPhotoCache.test.ts`: IndexedDB behavior using `fake-indexeddb`.
- `frontend/src/services/workPhotos.ts`: image preparation, signed PUT/GET calls, upload retry, preview restoration, and object URL lifecycle.
- `frontend/src/services/workPhotos.test.ts`: photo preparation and transfer behavior with mocked fetch/canvas/cache.
- `frontend/src/services/cloudWorks.ts`: typed CloudBase photo API calls and response normalization.
- `frontend/src/services/cloudWorks.test.ts`: request/response tests for photo actions.
- `frontend/src/stores/works.ts`: photo metadata, sync state, legacy migration, backup orchestration, and full preview restoration.
- `frontend/src/stores/works.test.ts`: Store state transitions and compatibility tests.
- `frontend/src/pages/WorksPage.vue`: file selection, photo status, progress, retry, and original download UI.
- `frontend/src/pages/WorksPage.test.ts`: user-flow tests.
- `frontend/src/test/setup.ts`, `frontend/package.json`, `frontend/package-lock.json`: IndexedDB test support with `fake-indexeddb` 6.2.5.
- `README.md`, `微醺交接文档.md`: deployment variables, OSS setup, migration behavior, and verification steps.

---

### Task 1: OSS photo module and deterministic security boundary

**Files:**
- Create: `twilight-cocktail/cloudbase/twilightWorks/ossPhotos.js`
- Create: `twilight-cocktail/cloudbase/twilightWorks/ossPhotos.test.cjs`
- Modify: `twilight-cocktail/cloudbase/twilightWorks/package.json`

**Interfaces:**
- Consumes: `accountNameKey`, `workId`, `photoRevision`, original MIME/name/size, and environment variables.
- Produces: `createOssPhotoService(options)`, `validatePhotoUploadInput(input)`, and photo service methods `prepareUpload`, `prepareDownloads`, `assertObjectsExist`, `deleteObjects`.

- [ ] **Step 1: Add failing validation and key-generation tests**

```js
test("builds keys inside the authenticated account prefix", () => {
  const result = service.prepareUpload({
    accountNameKey: validKey,
    workId: "work-1",
    photoRevision: "rev-1",
    mode: "original-and-preview",
    original: { name: "IMG_0001.HEIC", type: "image/heic", size: 4_000_000 },
    preview: { type: "image/jpeg", size: 240_000 },
  });
  assert.equal(result.original.objectKey, `photos/${validKey}/work-1/rev-1/original.heic`);
  assert.equal(result.preview.objectKey, `photos/${validKey}/work-1/rev-1/preview.jpg`);
});

test("rejects non-images and originals above 50 MB", () => {
  assert.throws(() => service.prepareUpload(overrides({ original: { type: "text/plain", size: 1 } })), /invalid_photo_type/);
  assert.throws(() => service.prepareUpload(overrides({ original: { type: "image/jpeg", size: 50 * 1024 * 1024 + 1 } })), /photo_too_large/);
});
```

- [ ] **Step 2: Run the new Node test and verify failure**

Run: `node --test cloudbase/twilightWorks/ossPhotos.test.cjs`
Expected: FAIL because `ossPhotos.js` does not exist.

- [ ] **Step 3: Implement the focused OSS module**

```js
const MAX_ORIGINAL_BYTES = 50 * 1024 * 1024;
const PREVIEW_MIME = "image/jpeg";

function createOssPhotoService({ OSS = require("ali-oss"), env = process.env, now = Date.now }) {
  const client = new OSS({
    accessKeyId: env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    accessKeySecret: env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
    region: env.ALIYUN_OSS_REGION,
    bucket: env.ALIYUN_OSS_BUCKET,
    authorizationV4: true,
    secure: true,
  });
  return {
    prepareUpload: (input) => prepareUpload(client, env.ALIYUN_OSS_PREFIX || "photos", input, now()),
    prepareDownloads: (accountNameKey, records, kind) =>
      prepareDownloads(client, env.ALIYUN_OSS_PREFIX || "photos", accountNameKey, records, kind, now()),
    assertObjectsExist: (accountNameKey, keys) =>
      assertObjectsExist(client, env.ALIYUN_OSS_PREFIX || "photos", accountNameKey, keys),
    deleteObjects: (accountNameKey, keys) =>
      deleteObjects(client, env.ALIYUN_OSS_PREFIX || "photos", accountNameKey, keys),
  };
}

module.exports = { createOssPhotoService, validatePhotoUploadInput, buildPhotoObjectKeys };
```

Every public method must validate `photos/{accountNameKey}/` before accessing a key. Signed URL responses contain only `objectKey`, `url`, `method`, `expiresAt`, and required `Content-Type`.

- [ ] **Step 4: Pin the server dependency**

Add `"ali-oss": "6.23.0"` beside `@cloudbase/node-sdk` in the cloud function package.

- [ ] **Step 5: Run the module tests**

Run: `node --test cloudbase/twilightWorks/ossPhotos.test.cjs`
Expected: PASS for valid dual upload, preview-only upload, invalid type/size/identifier, account-prefix rejection, HEAD checks, and deletion.

- [ ] **Step 6: Commit Task 1**

```bash
git add cloudbase/twilightWorks/ossPhotos.js cloudbase/twilightWorks/ossPhotos.test.cjs cloudbase/twilightWorks/package.json
git commit -m "feat: add private OSS photo service"
```

### Task 2: Authenticated CloudBase photo actions and metadata cleanup

**Files:**
- Modify: `twilight-cocktail/cloudbase/twilightWorks/index.js`
- Modify: `twilight-cocktail/cloudbase/twilightWorks/index.test.cjs`

**Interfaces:**
- Consumes: `createOssPhotoService()` from Task 1 and existing `assertAccountPassword()`/`metadata-patch` flow.
- Produces: POST actions `photo-upload-prepare`, `photo-download-prepare`, photo-aware `metadata-patch`, and persisted `photoCleanupKeys`.

- [ ] **Step 1: Extend the test loader with a fake `ali-oss` implementation**

```js
function loadFunction(collection, fakeOss) {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "ali-oss") return fakeOss;
    if (request === "@cloudbase/node-sdk") return createFakeCloudBaseModule(collection);
    return originalLoad(request, parent, isMain);
  };
  delete require.cache[require.resolve("./index.js")];
  delete require.cache[require.resolve("./ossPhotos.js")];
  const api = require("./index.js");
  Module._load = originalLoad;
  return api;
}
```

Add failing tests proving wrong passwords return `password_mismatch`, arbitrary Object Keys are rejected, upload preparation returns two signed URLs, download preparation only signs keys already stored on that account, and preview-only legacy metadata remains valid.

- [ ] **Step 2: Run focused cloud-function tests and verify failure**

Run: `node --test cloudbase/twilightWorks/index.test.cjs --test-name-pattern='photo|metadata patch'`
Expected: FAIL because the new actions and fields do not exist.

- [ ] **Step 3: Extend sanitized work metadata**

Add bounded optional fields to `safeMetadataRecord`:

```js
photoOriginalObjectKey: safeString(source.photoOriginalObjectKey, 500),
photoPreviewObjectKey: safeString(source.photoPreviewObjectKey, 500),
photoOriginalName: safeString(source.photoOriginalName, 255),
photoOriginalMime: safeString(source.photoOriginalMime, 120),
photoOriginalSize: Math.max(0, Math.floor(safeNumber(source.photoOriginalSize))),
photoRevision: safeString(source.photoRevision, 100),
photoBackupMode: ["none", "preview-only", "original-and-preview"].includes(source.photoBackupMode)
  ? source.photoBackupMode
  : "none",
```

Keep `photoDataUrl: ""` so Base64 never enters CloudBase.

- [ ] **Step 4: Implement authenticated photo actions**

```js
if (method === "POST" && action === "photo-upload-prepare") {
  const account = await assertAccountPassword(body.accountNameKey, body.passwordVerifier);
  if (!account.ok) return response({ ok: false, status: "password_mismatch" });
  return response({ ok: true, ...getPhotoService().prepareUpload(body) });
}

if (method === "POST" && action === "photo-download-prepare") {
  const account = await assertAccountPassword(body.accountNameKey, body.passwordVerifier);
  if (!account.ok) return response({ ok: false, status: "password_mismatch" });
  const requestedIds = new Set(safeStringArray(body.workIds, MAX_RECORDS, 128));
  const payload = account.doc?.metadataPayload || account.doc?.payload || buildAppDataPayload({});
  const records = safeRecords(payload).filter((record) => requestedIds.has(record.id));
  const downloads = getPhotoService().prepareDownloads(
    body.accountNameKey,
    records,
    body.kind === "original" ? "original" : "preview",
  );
  return response({ ok: true, downloads });
}
```

Before saving changed photo keys in `metadata-patch`, validate the account prefix and HeadObject both required objects. Compare old and new keys, save metadata first, then delete superseded/deleted keys. Persist failures in deduplicated `photoCleanupKeys` and retry a bounded batch on later authenticated requests.

- [ ] **Step 5: Run all cloud-function tests**

Run: `node --test cloudbase/twilightWorks/*.test.cjs`
Expected: all existing and new tests PASS; no output contains credentials or signed URLs.

- [ ] **Step 6: Commit Task 2**

```bash
git add cloudbase/twilightWorks/index.js cloudbase/twilightWorks/index.test.cjs
git commit -m "feat: add authenticated photo backup actions"
```

### Task 3: IndexedDB photo cache and pending queue

**Files:**
- Create: `twilight-cocktail/frontend/src/services/workPhotoCache.ts`
- Create: `twilight-cocktail/frontend/src/services/workPhotoCache.test.ts`
- Modify: `twilight-cocktail/frontend/src/test/setup.ts`
- Modify: `twilight-cocktail/frontend/package.json`
- Modify: `twilight-cocktail/frontend/package-lock.json`

**Interfaces:**
- Produces: `putWorkPhoto`, `getWorkPhoto`, `deleteWorkPhotos`, `listPendingWorkPhotos`, `setWorkPhotoSyncState`, and `hasCachedPreview`.
- Record type:

```ts
export type CachedWorkPhoto = {
  workId: string
  revision: string
  kind: 'original' | 'preview'
  blob: Blob
  name: string
  mime: string
  size: number
  syncState: 'pending' | 'uploading' | 'synced' | 'failed'
  errorMessage: string
  updatedAt: string
}
```

- [ ] **Step 1: Add `fake-indexeddb` 6.2.5 for tests and write failing cache tests**

```ts
it('stores original and preview blobs without localStorage', async () => {
  await putWorkPhoto(originalRecord)
  await putWorkPhoto(previewRecord)
  expect((await getWorkPhoto('work-1', 'rev-1', 'original'))?.blob.size).toBe(4)
  expect(window.localStorage.length).toBe(0)
})

it('lists only pending and failed records for retry', async () => {
  expect(await listPendingWorkPhotos()).toEqual(
    expect.arrayContaining([expect.objectContaining({ workId: 'work-1' })]),
  )
})
```

- [ ] **Step 2: Run the cache test and verify failure**

Run: `npm test -- --run src/services/workPhotoCache.test.ts`
Expected: FAIL because the cache module does not exist.

- [ ] **Step 3: Implement IndexedDB schema version 1**

Create database `twilight-work-photos`, object store `photos`, composite string key `${workId}:${revision}:${kind}`, and indexes `workId` and `syncState`. Wrap requests in Promises and close failed transactions cleanly. Never fall back to Base64 localStorage.

```ts
const databaseName = 'twilight-work-photos'
const databaseVersion = 1
const photoStoreName = 'photos'

const photoCacheKey = (workId: string, revision: string, kind: CachedWorkPhoto['kind']) =>
  `${workId}:${revision}:${kind}`

export const putWorkPhoto = async (photo: CachedWorkPhoto) =>
  runTransaction('readwrite', (store) => store.put({ ...photo, key: photoCacheKey(photo.workId, photo.revision, photo.kind) }))
```

- [ ] **Step 4: Run cache tests**

Run: `npm test -- --run src/services/workPhotoCache.test.ts`
Expected: PASS for write/read, replacement, deletion, pending filters, version checks, and quota/error propagation.

- [ ] **Step 5: Commit Task 3**

```bash
git add frontend/src/services/workPhotoCache.ts frontend/src/services/workPhotoCache.test.ts frontend/src/test/setup.ts frontend/package.json frontend/package-lock.json
git commit -m "feat: cache work photos in IndexedDB"
```

### Task 4: Frontend CloudBase photo API and transfer service

**Files:**
- Create: `twilight-cocktail/frontend/src/services/workPhotos.ts`
- Create: `twilight-cocktail/frontend/src/services/workPhotos.test.ts`
- Modify: `twilight-cocktail/frontend/src/services/cloudWorks.ts`
- Modify: `twilight-cocktail/frontend/src/services/cloudWorks.test.ts`

**Interfaces:**
- `prepareWorkPhoto(file: File): Promise<PreparedWorkPhoto>` returns original metadata, preview Blob/Data URL, and a revision.
- `uploadPreparedWorkPhoto(workId, prepared): Promise<CloudPhotoMetadata>` uploads direct to signed PUT URLs.
- `restoreAllWorkPreviews(records, options): Promise<PhotoRestoreResult>` downloads every missing preview with bounded concurrency.
- `downloadWorkOriginal(workId): Promise<void>` obtains a signed GET URL and downloads one original.

- [ ] **Step 1: Write failing CloudBase API tests**

```ts
it('requests dual upload URLs with the active cloud session', async () => {
  await prepareCloudPhotoUpload({ workId: 'work-1', photoRevision: 'rev-1', mode: 'original-and-preview', original, preview })
  expect(fetch).toHaveBeenCalledWith(apiUrl, expect.objectContaining({
    body: expect.stringContaining('photo-upload-prepare'),
  }))
})
```

Define strict response types and reject missing URL/key fields with a Chinese user-facing error.

- [ ] **Step 2: Run service tests and verify failure**

Run: `npm test -- --run src/services/cloudWorks.test.ts src/services/workPhotos.test.ts`
Expected: FAIL for missing photo APIs and transfer service.

- [ ] **Step 3: Implement CloudBase photo API functions**

```ts
export const prepareCloudPhotoUpload = async (input: CloudPhotoUploadInput) =>
  postCloudWorksAction({ action: 'photo-upload-prepare', ...getRequiredCloudSession(), ...input })

export const prepareCloudPhotoDownloads = async (
  workIds: string[],
  kind: 'preview' | 'original',
) => postCloudWorksAction({ action: 'photo-download-prepare', ...getRequiredCloudSession(), workIds, kind })
```

Do not expose `postCloudWorksAction` or credentials to callers.

- [ ] **Step 4: Implement image preparation and direct transfers**

Move the existing 1280px/0.82 canvas compression behavior into `prepareWorkPhoto`. Use signed PUT URLs with exactly matching `Content-Type`. Restore previews with concurrency 3, write each successful Blob to IndexedDB immediately, report `{ completed, total, failedWorkIds }`, and support an `AbortSignal` for pause.

```ts
export type PreparedWorkPhoto = {
  revision: string
  original: File
  preview: Blob
  previewDataUrl: string
}

const uploadSignedBlob = async (target: CloudPhotoSignedTarget, blob: Blob) => {
  const response = await fetch(target.url, {
    method: 'PUT',
    headers: { 'Content-Type': target.contentType },
    body: blob,
  })
  if (!response.ok) throw new Error(`照片上传失败（${response.status}）。`)
}
```

- [ ] **Step 5: Run service tests**

Run: `npm test -- --run src/services/cloudWorks.test.ts src/services/workPhotos.test.ts`
Expected: PASS for validation, JPEG preview creation, dual/preview-only upload, content-type matching, expired-signature retry, all-preview restoration, cache skipping, failure isolation, pause, and original download.

- [ ] **Step 6: Commit Task 4**

```bash
git add frontend/src/services/cloudWorks.ts frontend/src/services/cloudWorks.test.ts frontend/src/services/workPhotos.ts frontend/src/services/workPhotos.test.ts
git commit -m "feat: add browser photo transfer service"
```

### Task 5: Work Store metadata, migration, upload orchestration, and full restore

**Files:**
- Modify: `twilight-cocktail/frontend/src/stores/works.ts`
- Modify: `twilight-cocktail/frontend/src/stores/works.test.ts`

**Interfaces:**
- Extends `WorkRecord` with the seven optional cloud-photo fields from the spec.
- Adds `photoSyncByWorkId`, `photoPreviewUrls`, and `photoRestore` state.
- Produces actions `queueWorkPhoto`, `syncPendingPhotos`, `hydrateCachedPreviews`, `restoreAllPreviews`, `pausePhotoRestore`, `retryFailedPhotoRestore`, and `downloadOriginal`.

- [ ] **Step 1: Write failing compatibility and orchestration tests**

```ts
it('normalizes older records with photoBackupMode none', () => {
  window.localStorage.setItem('cocktail_work_records', JSON.stringify([legacyRecord]))
  expect(useWorkStore().items[0].photoBackupMode).toBe('none')
})

it('uploads pending photos before committing their object keys', async () => {
  await works.syncPendingPhotos()
  expect(cloudWorks.syncCloudMetadataPatch).toHaveBeenCalledWith(
    expect.objectContaining({ worksChanged: [expect.objectContaining({ photoBackupMode: 'original-and-preview' })] }),
  )
})

it('restores all previews after cloud metadata on an empty device', async () => {
  await works.loadFromCloud()
  expect(workPhotos.restoreAllWorkPreviews).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'work-1' })]), expect.any(Object))
})
```

- [ ] **Step 2: Run Store tests and verify failure**

Run: `npm test -- --run src/stores/works.test.ts`
Expected: FAIL for missing metadata and actions.

- [ ] **Step 3: Add backward-compatible record normalization**

Default missing photo fields to empty strings/zero and `photoBackupMode: 'none'`. Keep exports readable by old versions and keep cloud metadata stripping only `photoDataUrl`, not Object Keys.

```ts
export type WorkPhotoBackupMode = 'none' | 'preview-only' | 'original-and-preview'

export type WorkPhotoMetadata = {
  photoOriginalObjectKey: string
  photoPreviewObjectKey: string
  photoOriginalName: string
  photoOriginalMime: string
  photoOriginalSize: number
  photoRevision: string
  photoBackupMode: WorkPhotoBackupMode
}
```

- [ ] **Step 4: Implement cache hydration and legacy migration**

On page startup, load cached previews and create/revoke object URLs. Before a cloud backup, convert legacy `data:image/...` photos to preview Blobs, clear the persisted Base64 only after IndexedDB write succeeds, mark `preview-only`, and queue upload.

- [ ] **Step 5: Implement upload and restore orchestration**

`pushAllToCloud()` must attempt all pending photo uploads first, update successful records, then create one metadata patch. Failed photo uploads keep their local queue entry while text metadata still syncs. `loadFromCloud()` restores metadata, then downloads all missing previews and updates progress after each item. Login on an empty local device automatically calls `loadFromCloud`; a non-empty device retains the explicit restore button to avoid overwriting unsynced local works.

```ts
async syncPendingPhotos() {
  const pending = await listPendingWorkPhotos()
  for (const workId of new Set(pending.map((item) => item.workId))) {
    await this.syncOnePendingPhoto(workId).catch((error) => this.markPhotoSyncFailed(workId, error))
  }
}

async loadFromCloud() {
  const appData = await fetchCloudAppData()
  applyAccountBackupData(appData)
  await this.restoreAllPreviews(appData.works)
  return appData.works.length
}
```

- [ ] **Step 6: Run Store tests**

Run: `npm test -- --run src/stores/works.test.ts`
Expected: PASS for old records, dual uploads, preview-only migration, partial failure, local text preservation, empty-device automatic restore, all-preview progress, pause/retry, deletion, and object URL cleanup.

- [ ] **Step 7: Commit Task 5**

```bash
git add frontend/src/stores/works.ts frontend/src/stores/works.test.ts
git commit -m "feat: orchestrate photo backup and restore"
```

### Task 6: Works page photo experience

**Files:**
- Modify: `twilight-cocktail/frontend/src/pages/WorksPage.vue`
- Modify: `twilight-cocktail/frontend/src/pages/WorksPage.test.ts`

**Interfaces:**
- Consumes Store status/actions from Task 5.
- Produces visible statuses, recovery progress controls, retry actions, and original download.

- [ ] **Step 1: Write failing page tests**

```ts
it('shows full preview restoration progress', () => {
  works.photoRestore = { status: 'running', completed: 38, total: 126, failedWorkIds: [] }
  expect(wrapper.text()).toContain('正在恢复照片 38/126')
})

it('shows original download only when the work has an original key', async () => {
  expect(wrapper.get('[data-testid="download-original-work-1"]').exists()).toBe(true)
})
```

Also cover photo selection, 50 MB validation, save-while-offline, backup status labels, pause/continue, retry failures, and preview-only copy.

- [ ] **Step 2: Run page tests and verify failure**

Run: `npm test -- --run src/pages/WorksPage.test.ts`
Expected: FAIL because the UI does not expose these states.

- [ ] **Step 3: Replace inline Base64 preparation with the photo service**

Keep the selected prepared photo outside the persisted form. Submit the work text first, call `queueWorkPhoto`, and begin cloud sync immediately when logged in. Editing without a new photo preserves existing keys; replacing a photo creates a new revision.

```ts
const selectedPhoto = ref<PreparedWorkPhoto | null>(null)

const readPhoto = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  selectedPhoto.value = await prepareWorkPhoto(file)
  form.photoDataUrl = selectedPhoto.value.previewDataUrl
}
```

- [ ] **Step 4: Add minimal status and recovery UI**

Use the existing card/button visual language. Change copy that currently says “不含照片”, show per-work labels, add a restore progress block with pause/continue/retry, and add an original-download button only for `original-and-preview` records.

- [ ] **Step 5: Run page tests**

Run: `npm test -- --run src/pages/WorksPage.test.ts`
Expected: PASS for all new and existing Works page flows.

- [ ] **Step 6: Commit Task 6**

```bash
git add frontend/src/pages/WorksPage.vue frontend/src/pages/WorksPage.test.ts
git commit -m "feat: expose photo backup and restore status"
```

### Task 7: Documentation, full regression, and deployment handoff

**Files:**
- Modify: `twilight-cocktail/README.md`
- Modify: `twilight-cocktail/微醺交接文档.md`
- Test: all CloudBase and frontend suites.

**Interfaces:**
- Documents the five CloudBase environment variables and the exact manual deployment order without real secrets.

- [ ] **Step 1: Document environment and migration behavior**

Document the CloudBase console variables without adding them to `.env.example` or any local secret file:

```text
ALIBABA_CLOUD_ACCESS_KEY_ID=<在腾讯 CloudBase 云函数控制台填写>
ALIBABA_CLOUD_ACCESS_KEY_SECRET=<在腾讯 CloudBase 云函数控制台填写>
ALIYUN_OSS_REGION=oss-cn-hangzhou
ALIYUN_OSS_BUCKET=twilight-cocktail-bai
ALIYUN_OSS_PREFIX=photos
```

Clearly state that the first two belong in the CloudBase function console, not frontend `.env`, and that old works migrate as preview-only.

- [ ] **Step 2: Run CloudBase regression tests**

Run: `node --test cloudbase/twilightWorks/*.test.cjs`
Expected: all tests PASS.

- [ ] **Step 3: Run frontend unit tests**

Run: `npm test -- --run`
Expected: all Vitest tests PASS.

- [ ] **Step 4: Run lint and production builds**

Run: `npm run lint && npm run build && npm run build:pages`
Expected: exit 0; no TypeScript, ESLint, Vite, or Pages base-path errors.

- [ ] **Step 5: Run the existing core browser flow**

Run: `npm run test:e2e -- --project=chromium`
Expected: existing core flows PASS with mocked/non-secret cloud dependencies.

- [ ] **Step 6: Inspect secret and generated-artifact hygiene**

Run:

```bash
rg -n "LTAI[A-Za-z0-9]|ALIBABA_CLOUD_ACCESS_KEY_SECRET=." . --glob '!node_modules/**' --glob '!dist/**'
git status --short
```

Expected: no real AccessKey/Secret match; build output and dependencies are not staged.

- [ ] **Step 7: Commit Task 7**

```bash
git add README.md 微醺交接文档.md
git commit -m "docs: add photo backup deployment guide"
```

- [ ] **Step 8: Manual cloud verification checkpoint**

After the user configures the five environment variables in CloudBase and deploys the function package, verify with one non-sensitive test photo: dual objects appear under the authenticated account prefix, another browser restores its preview, original download works, and deleting the work removes both objects. Never request or display the user's AccessKey values.
