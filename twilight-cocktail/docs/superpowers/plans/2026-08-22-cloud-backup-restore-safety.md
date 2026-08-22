# Cloud Backup and Restore Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make cloud backup state observable on every page load, preview destructive restores, prevent stale-device uploads, and provide one-step restore undo.

**Architecture:** Add a read-only CloudBase account-summary contract and keep it separate from operation status. Stage remote app data before restore, compare snapshot versions before any destructive write, persist one metadata-only local checkpoint, and block uploads when the cloud version no longer matches the local account baseline.

**Tech Stack:** Vue 3, Pinia 3, TypeScript 5.9, Vitest, Node test runner, Tencent CloudBase HTTP functions, Aliyun OSS, IndexedDB.

**Spec:** `docs/superpowers/specs/2026-08-22-cloud-backup-restore-safety-design.md`

## Global Constraints

- CloudBase is the source of truth for the activated account; do not silently merge divergent devices.
- Checking cloud state is read-only and must never mutate local account data.
- Restore must stage and validate remote data before creating a checkpoint or replacing local state.
- Every upload performs a fresh version check.
- No new runtime dependency and no unrelated page refactor.
- Preserve the existing full-account scope: works and photo metadata, pantry, favorites, academy, daily pick, custom options, and auto-backup settings.

---

### Task 1: Add the CloudBase account summary contract

**Files:**
- Modify: `cloudbase/twilightWorks/index.test.cjs`
- Modify: `cloudbase/twilightWorks/index.js`

**Interfaces:**
- Produces: `POST { action: 'account-summary', accountNameKey, passwordVerifier }`.
- Returns: `{ status, accountName, snapshotId, backupCreatedAt, dataLastBackupAt, recordCount, summary }`.

- [x] **Step 1: Write failing cloud-function tests**

Add a test that saves app data containing two works, one preview, one original, pantry, favorites, academy, daily pick, and custom options, then calls `account-summary` and asserts literal counts:

```js
assert.deepEqual(summary.body.summary, {
  works: 2,
  previewPhotos: 1,
  originalPhotos: 1,
  pantry: 2,
  favorites: 1,
  academy: 1,
  dailyPick: 1,
  customCocktails: 1,
  customFlavorLiquors: 1,
  customBeverages: 1,
});
assert.equal(summary.body.dataLastBackupAt, "2026-08-22T10:00:00.000Z");
assert.ok(summary.body.snapshotId);
```

Add password-mismatch and legacy chunked-payload cases.

- [x] **Step 2: Run the targeted test and verify RED**

Run: `node --test cloudbase/twilightWorks/index.test.cjs --test-name-pattern="account summary"`

Expected: FAIL because `account-summary` is not handled.

- [x] **Step 3: Implement summary derivation and the read-only action**

Add `accountPayloadSummary(payload)` beside the existing payload normalization helpers. Count object-key-backed photos and bounded arrays from normalized app data. In `account-summary`, authenticate with `assertAccountPassword`, read `metadataPayload` when present or `readChunkedPayload(doc)` otherwise, and return the version fields without modifying the account document.

- [x] **Step 4: Run the complete cloud-function suite and verify GREEN**

Run: `node --test cloudbase/twilightWorks/index.test.cjs`

Expected: all tests pass.

### Task 2: Add typed cloud snapshot and staged restore services

**Files:**
- Modify: `frontend/src/services/cloudWorks.test.ts`
- Modify: `frontend/src/services/cloudWorks.ts`

**Interfaces:**
- Produces: `CloudAccountDataSummary`, `CloudSnapshotSummary`, and `CloudAppDataSnapshot`.
- Produces: `fetchCloudSnapshotSummary(): Promise<CloudSnapshotSummary>`.
- Produces: `fetchCloudAppDataSnapshot(): Promise<CloudAppDataSnapshot>`.
- Changes: `syncCloudMetadataPatch()` returns `{ snapshotId, recordCount }`.

- [x] **Step 1: Write failing service tests**

Mock complete `account-summary` and `works-get-start` responses. Assert that summary fields and `backupCreatedAt` are preserved, and that the staged app-data call returns both normalized `appData` and the exact `snapshotId`. Add a metadata-patch test asserting its returned snapshot ID.

- [x] **Step 2: Run service tests and verify RED**

Run: `npm test -- --run src/services/cloudWorks.test.ts`

Expected: FAIL because the new types and functions do not exist and response timestamps are currently discarded.

- [x] **Step 3: Implement minimal typed service functions**

Extend `CloudWorksResponse` with `backupCreatedAt`, `metadataUpdatedAt`, `dataLastBackupAt`, `snapshotId`, and `summary`. Extract the current chunk reader to return `{ appData, snapshotId, backupCreatedAt }`; keep `fetchCloudAppData()` as a compatibility wrapper returning `.appData`. Validate every summary number with finite non-negative integer normalization.

- [x] **Step 4: Run service tests and verify GREEN**

Run: `npm test -- --run src/services/cloudWorks.test.ts`

Expected: all cloud service tests pass.

### Task 3: Model real cloud state and protect uploads

**Files:**
- Modify: `frontend/src/stores/works.test.ts`
- Modify: `frontend/src/stores/works.ts`

**Interfaces:**
- Produces: `cloudSnapshot` state with `status`, `relation`, `checkedAt`, `snapshot`, and `message`.
- Produces: `refreshCloudSnapshot(): Promise<CloudSnapshotSummary>`.
- Changes: `pushAllToCloud()` performs a fresh summary check and rejects mismatched cloud baselines before uploading photos or metadata.

- [x] **Step 1: Write failing store tests for cloud refresh**

Assert that a successful refresh stores real counts, backup time, and `checkedAt`; an error keeps the previous successful snapshot while changing status to error; matching `dataLastBackupAt` produces `same-base`; a different value produces `cloud-changed`.

- [x] **Step 2: Run store tests and verify RED**

Run: `npm test -- --run src/stores/works.test.ts`

Expected: FAIL because `cloudSnapshot` and `refreshCloudSnapshot` do not exist.

- [x] **Step 3: Implement the cloud snapshot state**

Add the smallest state and relation helpers in `works.ts`. Do not persist the queried snapshot as truth across reloads; every reload must query again. Derive the local summary through the existing account backup builder so all account categories use identical counting rules.

- [x] **Step 4: Write the failing stale-upload test**

Mock a remote summary whose `dataLastBackupAt` differs from local `autoBackup.lastBackupAt`. Call `pushAllToCloud()` and assert photo upload and metadata patch are not called. Add a matching-version case that reaches metadata sync and records the returned new snapshot.

- [x] **Step 5: Run the targeted test and verify RED**

Run: `npm test -- --run src/stores/works.test.ts`

Expected: FAIL because current uploads never check remote version.

- [x] **Step 6: Implement upload version protection and verify GREEN**

Call `fetchCloudSnapshotSummary()` at the start of every upload. Allow empty cloud or an exact `dataLastBackupAt` match; otherwise throw a typed conflict error with an actionable message. After successful metadata sync, update `lastBackupAt` and refresh the stored snapshot fields from the returned version. Run the full store test file and expect PASS.

### Task 4: Stage restore preview and persist one undo checkpoint

**Files:**
- Modify: `frontend/src/stores/works.test.ts`
- Modify: `frontend/src/stores/works.ts`

**Interfaces:**
- Produces: `CloudRestorePreview` with remote `appData`, `snapshotId`, timestamps, and local/cloud summaries.
- Produces: `prepareCloudRestore(): Promise<CloudRestorePreview>`.
- Produces: `restorePreparedCloudData(preview): Promise<number>`.
- Produces: `undoLastCloudRestore(): Promise<number>` and `hasRestoreCheckpoint`.

- [ ] **Step 1: Write failing restore-preview tests**

Seed local pantry/favorites/academy with zero works, stage a remote snapshot, and assert `prepareCloudRestore` reports all local and cloud counts without mutating stores or localStorage.

- [ ] **Step 2: Run store tests and verify RED**

Run: `npm test -- --run src/stores/works.test.ts`

Expected: FAIL because restore preview is not staged separately.

- [ ] **Step 3: Implement read-only restore preparation**

Use `fetchCloudAppDataSnapshot()` and the shared summary derivation. Return the full preview object but do not call `applyAccountBackupData`.

- [ ] **Step 4: Write failing checkpoint, version-race, and undo tests**

Assert that confirmation rechecks `snapshotId`, rejects a changed version without replacing local data, stores a metadata-only checkpoint before a valid replacement, restores all account categories on undo, preserves IndexedDB photo cache, removes the checkpoint after success, and rejects a checkpoint belonging to another account.

- [ ] **Step 5: Run store tests and verify RED**

Run: `npm test -- --run src/stores/works.test.ts`

Expected: FAIL because checkpoint and undo behavior do not exist.

- [ ] **Step 6: Implement checkpointed restore and verify GREEN**

Store the checkpoint under an account-keyed localStorage key with `photoDataUrl` stripped from works. Recheck summary version before apply, create the checkpoint, apply the complete package, and rollback from the in-memory snapshot if persistence fails. Keep photo preview restoration retryable. Re-run the store suite and expect PASS.

### Task 5: Replace blind restore UI with cloud summary and preview modal

**Files:**
- Modify: `frontend/src/pages/WorksPage.test.ts`
- Modify: `frontend/src/pages/WorksPage.vue`

**Interfaces:**
- Consumes: Tasks 3 and 4 store state/actions.
- Produces: `data-testid="cloud-summary-refresh"`, `cloud-summary-panel`, `cloud-restore-dialog`, `cloud-restore-confirm`, and `cloud-restore-undo`.

- [ ] **Step 1: Write failing page tests for automatic and manual checking**

Mount with an active account and assert `refreshCloudSnapshot` is called once. Render a ready snapshot and assert the page shows backup time, works, preview/original counts, and every account category. Click the manual refresh button and assert a second call.

- [ ] **Step 2: Run page tests and verify RED**

Run: `npm test -- --run src/pages/WorksPage.test.ts`

Expected: FAIL because the page only renders operation status and does not query the cloud on mount.

- [ ] **Step 3: Implement the summary card**

Call the store refresh on mount when logged in. Render checking, ready, stale-error, empty, changed, and unknown-base copy; show “重新检查” beside the check time. Keep `cloudSync` below it as “最近操作”, not “云端状态”.

- [ ] **Step 4: Write failing restore-dialog tests**

Click restore with zero local works but non-empty pantry/favorites. Assert no native confirm is called, the dialog renders local/cloud summary rows and the complete replacement warning, cancel leaves data unchanged, and confirm invokes `restorePreparedCloudData`. Assert version-race errors keep the dialog open and allow refresh.

- [ ] **Step 5: Run page tests and verify RED**

Run: `npm test -- --run src/pages/WorksPage.test.ts`

Expected: FAIL because restore currently calls a generic native confirmation and immediately replaces data.

- [ ] **Step 6: Implement the modal, conflict feedback, and undo entry**

Add a project-styled dialog with separate Cancel and destructive Confirm buttons. Disable actions during checks, present cloud-change upload errors next to the summary, and show the undo button only for a same-account checkpoint. Re-run the complete WorksPage suite and expect PASS.

### Task 6: Regression verification, documentation, commit, and deployment

**Files:**
- Modify: `docs/HANDOFF.md`
- Modify: this plan's checkboxes as tasks complete.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified CloudBase and GitHub Pages deployment on `codex/twilight-cocktail-prototype`.

- [ ] **Step 1: Run all verification**

Run the CloudBase Node tests, all Vitest tests, ESLint, `vue-tsc -b`, the GitHub Pages production build, and `git diff --check`. Expected: zero failures and no whitespace errors.

- [ ] **Step 2: Update handoff documentation**

Record the new `account-summary` action, UI behavior, conflict rule, checkpoint scope, test counts, deployed function, Pages commit, and online verification results.

- [ ] **Step 3: Review the complete diff**

Confirm no secrets, credentials, unrelated files, old blind restore confirmation, or “尚未同步云端” default status remain.

- [ ] **Step 4: Commit and push the source branch**

Commit the cohesive feature and documentation changes, then push `codex/twilight-cocktail-prototype` to `origin`.

- [ ] **Step 5: Deploy CloudBase and GitHub Pages**

Deploy the actual function backing the `/share` HTTP route, publish the verified Pages build, and avoid displaying or persisting OSS/CloudBase secrets in logs or source.

- [ ] **Step 6: Verify production read-only paths**

Open the deployed works page, confirm automatic summary retrieval and manual refresh, stage a restore preview without confirming it, and verify the cloud function responds to authenticated summary requests through the UI. Do not overwrite or delete the user's production data during verification.
