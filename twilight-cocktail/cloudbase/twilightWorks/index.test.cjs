const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

const validKey = "a".repeat(64);
const validPassword = "b".repeat(64);
const shareToken = "share_token_12345678901234567890";

function createFakeCollection() {
  const docs = [];
  return {
    docs,
    where(query) {
      return {
        limit() {
          return {
            async get() {
              return {
                data: docs.filter((doc) =>
                  Object.entries(query).every(([key, value]) => doc[key] === value),
                ),
              };
            },
          };
        },
      };
    },
    doc(id) {
      return {
        async update(data) {
          const index = docs.findIndex((doc) => doc._id === id);
          if (index >= 0) docs[index] = { ...docs[index], ...data };
        },
      };
    },
    async add(data) {
      docs.push({ _id: `doc-${docs.length + 1}`, ...data });
    },
  };
}

function createFakeOssState() {
  return {
    signed: [],
    headKeys: [],
    deletedKeys: [],
    failDeleteKeys: new Set(),
  };
}

function createFakeOssModule(state) {
  return class FakeOssClient {
    async signatureUrlV4(method, expires, options, objectKey) {
      state.signed.push({ method, expires, options, objectKey });
      return `https://signed.example/${encodeURIComponent(objectKey)}?method=${method}`;
    }

    async head(objectKey) {
      state.headKeys.push(objectKey);
      return { res: { status: 200 } };
    }

    async delete(objectKey) {
      state.deletedKeys.push(objectKey);
      if (state.failDeleteKeys.has(objectKey)) throw new Error("delete_failed");
      return { res: { status: 204 } };
    }
  };
}

function loadFunction(collection, ossState = createFakeOssState()) {
  const originalLoad = Module._load;
  const patchedLoad = function patchedLoad(request, parent, isMain) {
    if (request === "@cloudbase/node-sdk") {
      const database = {
        collection: () => collection,
        runTransaction: async (callback) =>
          callback({
            collection: () => collection,
          }),
      };
      return {
        SYMBOL_CURRENT_ENV: "test",
        init: () => ({
          database: () => database,
        }),
      };
    }
    if (request === "ali-oss") return createFakeOssModule(ossState);
    return originalLoad(request, parent, isMain);
  };
  Module._load = patchedLoad;
  delete require.cache[require.resolve("./index.js")];
  if (require.cache[require.resolve("./ossPhotos.js")]) {
    delete require.cache[require.resolve("./ossPhotos.js")];
  }
  const api = require("./index.js");
  Module._load = originalLoad;
  return {
    ossState,
    main: async (event) => {
      Module._load = patchedLoad;
      const previousEnv = {
        ALIBABA_CLOUD_ACCESS_KEY_ID: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
        ALIBABA_CLOUD_ACCESS_KEY_SECRET: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
        ALIYUN_OSS_REGION: process.env.ALIYUN_OSS_REGION,
        ALIYUN_OSS_BUCKET: process.env.ALIYUN_OSS_BUCKET,
        ALIYUN_OSS_PREFIX: process.env.ALIYUN_OSS_PREFIX,
      };
      Object.assign(process.env, {
        ALIBABA_CLOUD_ACCESS_KEY_ID: "test-id",
        ALIBABA_CLOUD_ACCESS_KEY_SECRET: "test-secret",
        ALIYUN_OSS_REGION: "oss-cn-hangzhou",
        ALIYUN_OSS_BUCKET: "twilight-cocktail-bai",
        ALIYUN_OSS_PREFIX: "photos",
      });
      try {
        return await api.main(event);
      } finally {
        Module._load = originalLoad;
        for (const [key, value] of Object.entries(previousEnv)) {
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        }
      }
    },
  };
}

async function post(api, body) {
  const result = await api.main({
    httpMethod: "POST",
    body: JSON.stringify(body),
  });
  return {
    statusCode: result.statusCode,
    body: JSON.parse(result.body),
  };
}

async function createAccountAndShare(api) {
  await post(api, {
    action: "account-create",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    accountName: "mix",
  });
  return post(api, {
    action: "request-share-reset",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    shareToken,
  });
}

function metadataPatch(overrides = {}) {
  return {
    version: 1,
    app: "twilight-mixbook",
    type: "metadata-patch",
    changedAt: "2026-08-22T06:30:00.000Z",
    worksChanged: [],
    worksDeleted: [],
    pantry: { ingredientSlugs: [] },
    favorites: { cocktailSlugs: [] },
    academy: { completedSlugs: [] },
    dailyPick: { selectedSlug: "", selectedDate: "", reason: "", rerollCount: 0 },
    customOptions: { cocktails: [], flavorLiquors: [], beverages: [] },
    autoBackup: { enabled: false, lastBackupAt: "" },
    ...overrides,
  };
}

function validDrinkRequest(cocktailName) {
  return {
    guestName: "朋友",
    cocktailName,
    ingredientGroups: {
      baseLiquors: ["金酒"],
      flavorLiquors: [],
      beverages: ["汤力水"],
      other: "",
    },
    note: "少甜",
  };
}

test("account backup stores and returns full app data payloads", async () => {
  const collection = createFakeCollection();
  const api = loadFunction(collection);
  await post(api, {
    action: "account-create",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    accountName: "mix",
  });
  const appData = {
    version: 1,
    app: "twilight-mixbook",
    type: "app-data",
    works: [
      {
        id: "work-1",
        madeAt: "2026-08-08",
        cocktailSlug: "mojito",
        cocktailName: "莫吉托",
        photoDataUrl: "",
        ingredientsText: "基酒：朗姆酒",
        createdAt: "2026-08-08T10:00:00.000Z",
      },
    ],
    pantry: { ingredientSlugs: ["gin", "tonic-water"] },
    favorites: { cocktailSlugs: ["mojito"] },
    academy: { completedSlugs: ["tools"] },
    dailyPick: {
      selectedSlug: "negroni",
      selectedDate: "2026-08-08",
      reason: "今晚适合苦甜风味。",
      rerollCount: 2,
    },
    customOptions: {
      cocktails: [],
      flavorLiquors: ["蓝橙力娇酒"],
      beverages: ["水溶C"],
    },
    autoBackup: {
      enabled: true,
      lastBackupAt: "2026-08-08T10:00:00.000Z",
    },
  };

  const start = await post(api, {
    action: "works-put-start",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    accountName: "mix",
    payloadType: "app-data",
    recordCount: 1,
    chunkCount: 1,
  });
  assert.equal(start.statusCode, 200);
  assert.equal(start.body.payloadType, "app-data");

  const chunk = await post(api, {
    action: "works-put-chunk",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    uploadId: start.body.uploadId,
    chunkIndex: 0,
    payloadType: "app-data",
    payloadText: JSON.stringify(appData),
  });
  assert.equal(chunk.statusCode, 200);

  const commit = await post(api, {
    action: "works-put-commit",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    uploadId: start.body.uploadId,
    accountName: "mix",
    payloadType: "app-data",
    recordCount: 1,
    chunkCount: 1,
  });
  assert.equal(commit.statusCode, 200);

  const restored = await post(api, {
    action: "works-get",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
  });

  assert.equal(restored.statusCode, 200);
  assert.equal(restored.body.payload.type, "app-data");
  assert.equal(restored.body.payload.works.length, 1);
  assert.deepEqual(restored.body.payload.pantry.ingredientSlugs, ["gin", "tonic-water"]);
  assert.deepEqual(restored.body.payload.customOptions.beverages, ["水溶C"]);
  assert.equal(restored.body.payload.autoBackup.enabled, true);
});

test("account summary reports cloud data and photo coverage without mutating the account", async () => {
  const collection = createFakeCollection();
  const api = loadFunction(collection);
  await post(api, {
    action: "account-create",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    accountName: "mix",
  });
  await post(api, {
    action: "metadata-patch",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    accountName: "mix",
    patch: metadataPatch({
      worksChanged: [
        {
          id: "work-photo",
          madeAt: "2026-08-22",
          cocktailSlug: "",
          cocktailName: "照片作品",
          photoDataUrl: "",
          photoOriginalObjectKey: `photos/${validKey}/work-photo/revision-photo/original.jpg`,
          photoPreviewObjectKey: `photos/${validKey}/work-photo/revision-photo/preview.jpg`,
          photoOriginalName: "original.jpg",
          photoOriginalMime: "image/jpeg",
          photoOriginalSize: 2048,
          photoRevision: "revision-photo",
          photoBackupMode: "original-and-preview",
          ingredientsText: "饮料：苏打水",
          rating: 0,
          mood: "",
          selfReview: "",
          notes: "",
          createdAt: "2026-08-22T09:00:00.000Z",
          updatedAt: "2026-08-22T09:00:00.000Z",
        },
        {
          id: "work-text",
          madeAt: "2026-08-22",
          cocktailSlug: "",
          cocktailName: "文字作品",
          photoDataUrl: "",
          ingredientsText: "饮料：汤力水",
          rating: 0,
          mood: "",
          selfReview: "",
          notes: "",
          createdAt: "2026-08-22T09:30:00.000Z",
          updatedAt: "2026-08-22T09:30:00.000Z",
        },
      ],
      pantry: { ingredientSlugs: ["gin", "tonic-water"] },
      favorites: { cocktailSlugs: ["mojito"] },
      academy: { completedSlugs: ["tools"] },
      dailyPick: {
        selectedSlug: "negroni",
        selectedDate: "2026-08-22",
        reason: "今晚适合苦甜风味。",
        rerollCount: 1,
      },
      customOptions: {
        cocktails: [
          {
            value: "custom-sunset",
            slug: "custom-sunset",
            nameZh: "自定义日落",
            nameEn: "Custom Sunset",
            ingredientsText: "金酒、橙汁",
            isCustom: true,
            createdAt: "2026-08-22T08:00:00.000Z",
          },
        ],
        flavorLiquors: ["蓝橙力娇酒"],
        beverages: ["水溶C"],
      },
      autoBackup: {
        enabled: true,
        lastBackupAt: "2026-08-22T10:00:00.000Z",
      },
    }),
  });

  const before = JSON.stringify(collection.docs);
  const summary = await post(api, {
    action: "account-summary",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
  });
  const mismatch = await post(api, {
    action: "account-summary",
    accountNameKey: validKey,
    passwordVerifier: "c".repeat(64),
  });

  assert.equal(summary.statusCode, 200);
  assert.equal(summary.body.status, "matched");
  assert.equal(summary.body.dataLastBackupAt, "2026-08-22T10:00:00.000Z");
  assert.ok(summary.body.snapshotId);
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
  assert.equal(JSON.stringify(collection.docs), before);
  assert.equal(mismatch.body.status, "password_mismatch");
  assert.equal(mismatch.body.summary, undefined);
});

test("metadata patch atomically rejects a stale snapshot and accepts an idempotent retry", async () => {
  const collection = createFakeCollection();
  const api = loadFunction(collection);
  const work = (id, cocktailName) => ({
    id,
    madeAt: "2026-08-22",
    cocktailSlug: "",
    cocktailName,
    photoDataUrl: "",
    ingredientsText: "苏打水",
    rating: 0,
    mood: "",
    selfReview: "",
    notes: "",
    createdAt: "2026-08-22T10:00:00.000Z",
    updatedAt: "2026-08-22T10:00:00.000Z",
  });
  await post(api, {
    action: "account-create",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    accountName: "mix",
  });

  const first = await post(api, {
    action: "metadata-patch",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    accountName: "mix",
    expectedSnapshotId: "",
    operationId: "operation-first",
    patch: metadataPatch({
      worksChanged: [work("first", "第一杯")],
      autoBackup: { enabled: true, lastBackupAt: "2026-08-22T10:00:00.000Z" },
    }),
  });
  assert.equal(first.body.status, "metadata_saved");

  const second = await post(api, {
    action: "metadata-patch",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    accountName: "mix",
    expectedSnapshotId: first.body.metadataUpdatedAt,
    operationId: "operation-second",
    patch: metadataPatch({
      worksChanged: [work("second", "第二杯")],
      autoBackup: { enabled: true, lastBackupAt: "2026-08-22T10:01:00.000Z" },
    }),
  });
  assert.equal(second.body.status, "metadata_saved");

  const retry = await post(api, {
    action: "metadata-patch",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    accountName: "mix",
    expectedSnapshotId: first.body.metadataUpdatedAt,
    operationId: "operation-second",
    patch: metadataPatch({
      worksChanged: [work("second", "第二杯")],
    }),
  });
  assert.equal(retry.body.status, "metadata_saved");
  assert.equal(retry.body.metadataUpdatedAt, second.body.metadataUpdatedAt);

  const stale = await post(api, {
    action: "metadata-patch",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    accountName: "mix",
    expectedSnapshotId: first.body.metadataUpdatedAt,
    operationId: "operation-stale",
    patch: metadataPatch({
      worksChanged: [work("stale", "过期设备作品")],
    }),
  });
  assert.equal(stale.body.status, "snapshot_conflict");
  assert.equal(stale.body.snapshotId, second.body.metadataUpdatedAt);

  const restored = await post(api, {
    action: "works-get",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
  });
  assert.deepEqual(
    restored.body.payload.works.map((record) => record.id),
    ["first", "second"],
  );
});

test("unknown actions fail instead of returning a successful compatibility response", async () => {
  const api = loadFunction(createFakeCollection());
  const result = await post(api, { action: "future-action" });

  assert.equal(result.statusCode, 400);
  assert.equal(result.body.error, "unknown_action");
});

test("account backup can be restored through bounded download chunks", async () => {
  const collection = createFakeCollection();
  const api = loadFunction(collection);
  await post(api, {
    action: "account-create",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    accountName: "mix",
  });
  const appData = {
    version: 1,
    app: "twilight-mixbook",
    type: "app-data",
    works: [
      {
        id: "large-work",
        madeAt: "2026-08-10",
        cocktailSlug: "",
        cocktailName: "带照片作品",
        photoDataUrl: `data:image/jpeg;base64,${"a".repeat(2000)}`,
        ingredientsText: "饮料：葡萄味气泡水",
        createdAt: "2026-08-10T10:00:00.000Z",
      },
    ],
    pantry: { ingredientSlugs: ["gin"] },
    favorites: { cocktailSlugs: [] },
    academy: { completedSlugs: [] },
    dailyPick: {
      selectedSlug: "",
      selectedDate: "",
      reason: "",
      rerollCount: 0,
    },
    customOptions: {
      cocktails: [],
      flavorLiquors: [],
      beverages: [],
    },
    autoBackup: {
      enabled: false,
      lastBackupAt: "",
    },
  };
  const payloadText = JSON.stringify(appData);
  const chunks = [payloadText.slice(0, 1200), payloadText.slice(1200)];

  const start = await post(api, {
    action: "works-put-start",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    accountName: "mix",
    payloadType: "app-data",
    recordCount: 1,
    chunkCount: chunks.length,
  });
  for (const [index, payloadText] of chunks.entries()) {
    await post(api, {
      action: "works-put-chunk",
      accountNameKey: validKey,
      passwordVerifier: validPassword,
      uploadId: start.body.uploadId,
      chunkIndex: index,
      payloadType: "app-data",
      payloadText,
    });
  }
  await post(api, {
    action: "works-put-commit",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    uploadId: start.body.uploadId,
    accountName: "mix",
    payloadType: "app-data",
    recordCount: 1,
    chunkCount: chunks.length,
  });

  const download = await post(api, {
    action: "works-get-start",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
  });
  const firstChunk = await post(api, {
    action: "works-get-chunk",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    chunkIndex: 0,
  });
  const secondChunk = await post(api, {
    action: "works-get-chunk",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    chunkIndex: 1,
  });
  const restored = JSON.parse(firstChunk.body.payloadText + secondChunk.body.payloadText);

  assert.equal(download.statusCode, 200);
  assert.equal(download.body.status, "chunked");
  assert.equal(download.body.chunkCount, 2);
  assert.equal(download.body.payload, undefined);
  assert.equal(firstChunk.body.chunkIndex, 0);
  assert.equal(secondChunk.body.chunkIndex, 1);
  assert.equal(restored.type, "app-data");
  assert.equal(restored.works[0].photoDataUrl, appData.works[0].photoDataUrl);

  const summary = await post(api, {
    action: "account-summary",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
  });
  assert.equal(summary.body.summary.works, 1);
  assert.equal(summary.body.summary.pantry, 1);
});

test("metadata patches merge lightweight work changes and deletions", async () => {
  const collection = createFakeCollection();
  const api = loadFunction(collection);
  await post(api, {
    action: "account-create",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    accountName: "mix",
  });

  const firstPatch = await post(api, {
    action: "metadata-patch",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    accountName: "mix",
    patch: {
      version: 1,
      app: "twilight-mixbook",
      type: "metadata-patch",
      changedAt: "2026-08-10T10:00:00.000Z",
      worksChanged: [
        {
          id: "work-1",
          madeAt: "2026-08-09",
          cocktailSlug: "",
          cocktailName: "第一杯",
          photoDataUrl: "data:image/jpeg;base64,should-not-store",
          ingredientsText: "饮料：苏打水",
          rating: 0,
          mood: "",
          selfReview: "",
          notes: "",
          createdAt: "2026-08-09T10:00:00.000Z",
          updatedAt: "2026-08-09T10:00:00.000Z",
        },
        {
          id: "work-2",
          madeAt: "2026-08-10",
          cocktailSlug: "",
          cocktailName: "第二杯",
          photoDataUrl: "",
          ingredientsText: "饮料：汤力水",
          rating: 0,
          mood: "",
          selfReview: "",
          notes: "",
          createdAt: "2026-08-10T10:00:00.000Z",
          updatedAt: "2026-08-10T10:00:00.000Z",
        },
      ],
      worksDeleted: [],
      pantry: { ingredientSlugs: ["gin"] },
      favorites: { cocktailSlugs: ["mojito"] },
      academy: { completedSlugs: ["tools"] },
      dailyPick: { selectedSlug: "", selectedDate: "", reason: "", rerollCount: 0 },
      customOptions: { cocktails: [], flavorLiquors: [], beverages: ["水溶C"] },
      autoBackup: { enabled: false, lastBackupAt: "2026-08-10T10:00:00.000Z" },
    },
  });

  const secondPatch = await post(api, {
    action: "metadata-patch",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    accountName: "mix",
    patch: {
      version: 1,
      app: "twilight-mixbook",
      type: "metadata-patch",
      changedAt: "2026-08-10T11:00:00.000Z",
      worksChanged: [
        {
          id: "work-2",
          madeAt: "2026-08-10",
          cocktailSlug: "",
          cocktailName: "第二杯改良",
          photoDataUrl: "",
          ingredientsText: "饮料：汤力水",
          rating: 5,
          mood: "清爽",
          selfReview: "",
          notes: "",
          createdAt: "2026-08-10T10:00:00.000Z",
          updatedAt: "2026-08-10T11:00:00.000Z",
        },
      ],
      worksDeleted: [{ id: "work-1", deletedAt: "2026-08-10T11:00:00.000Z" }],
      pantry: { ingredientSlugs: ["gin", "tonic-water"] },
      favorites: { cocktailSlugs: [] },
      academy: { completedSlugs: ["tools"] },
      dailyPick: { selectedSlug: "", selectedDate: "", reason: "", rerollCount: 0 },
      customOptions: { cocktails: [], flavorLiquors: [], beverages: ["水溶C"] },
      autoBackup: { enabled: false, lastBackupAt: "2026-08-10T11:00:00.000Z" },
    },
  });
  const restored = await post(api, {
    action: "works-get-start",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
  });

  assert.equal(firstPatch.body.status, "metadata_saved");
  assert.equal(secondPatch.body.changedCount, 1);
  assert.equal(secondPatch.body.deletedCount, 1);
  assert.equal(restored.body.payload.type, "app-data");
  assert.equal(restored.body.payload.works.length, 1);
  assert.equal(restored.body.payload.works[0].id, "work-2");
  assert.equal(restored.body.payload.works[0].cocktailName, "第二杯改良");
  assert.equal(restored.body.payload.works[0].photoDataUrl, "");
  assert.deepEqual(restored.body.payload.pantry.ingredientSlugs, ["gin", "tonic-water"]);
});

test("legacy work-record chunk backups still restore as work records", async () => {
  const collection = createFakeCollection();
  const api = loadFunction(collection);
  await post(api, {
    action: "account-create",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    accountName: "mix",
  });
  const legacyPayload = {
    version: 1,
    app: "twilight-mixbook",
    type: "work-records",
    records: [{ id: "legacy-work", cocktailName: "旧作品" }],
  };
  const start = await post(api, {
    action: "works-put-start",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    recordCount: 1,
    chunkCount: 1,
  });
  await post(api, {
    action: "works-put-chunk",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    uploadId: start.body.uploadId,
    chunkIndex: 0,
    payloadText: JSON.stringify(legacyPayload),
  });
  await post(api, {
    action: "works-put-commit",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    uploadId: start.body.uploadId,
    recordCount: 1,
    chunkCount: 1,
  });

  const restored = await post(api, {
    action: "works-get",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
  });

  assert.equal(restored.body.payload.type, "work-records");
  assert.equal(restored.body.payload.records[0].id, "legacy-work");
});

test("drink request share link accepts one bounded no-photo request", async () => {
  const collection = createFakeCollection();
  const api = loadFunction(collection);
  const share = await createAccountAndShare(api);

  assert.equal(share.statusCode, 200);
  assert.equal(share.body.enabled, true);

  const submit = await post(api, {
    action: "drink-request-submit",
    shareToken,
    request: {
      guestName: "朋友",
      cocktailName: "冰岛",
      ingredientGroups: {
        baseLiquors: ["伏特加"],
        flavorLiquors: [],
        beverages: ["葡萄味气泡水"],
        other: "",
      },
      note: "少甜",
    },
  });
  const list = await post(api, {
    action: "drink-requests-get",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
  });

  assert.equal(submit.statusCode, 200);
  assert.equal(submit.body.status, "created");
  assert.equal(list.body.requests.length, 1);
  assert.equal(list.body.requests[0].cocktailName, "冰岛");
});

test("owner can delete one drink request after reviewing it", async () => {
  const collection = createFakeCollection();
  const api = loadFunction(collection);
  await createAccountAndShare(api);
  const submit = await post(api, {
    action: "drink-request-submit",
    shareToken,
    request: {
      guestName: "朋友",
      cocktailName: "冰岛",
      ingredientGroups: {
        baseLiquors: ["伏特加"],
        flavorLiquors: [],
        beverages: ["葡萄味气泡水"],
        other: "",
      },
      note: "少甜",
    },
  });
  const beforeDelete = await post(api, {
    action: "drink-requests-get",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
  });

  const deleted = await post(api, {
    action: "drink-request-delete",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    requestId: submit.body.requestId,
  });
  const afterDelete = await post(api, {
    action: "drink-requests-get",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
  });

  assert.equal(beforeDelete.body.requests.length, 1);
  assert.equal(deleted.statusCode, 200);
  assert.equal(deleted.body.requestCount, 0);
  assert.equal(afterDelete.body.requests.length, 0);
});

test("disabling a drink request share deletes all requests and rejects the old link", async () => {
  const collection = createFakeCollection();
  const api = loadFunction(collection);
  await createAccountAndShare(api);
  await post(api, {
    action: "drink-request-submit",
    shareToken,
    request: validDrinkRequest("第一杯"),
  });
  await post(api, {
    action: "drink-request-submit",
    shareToken,
    request: validDrinkRequest("第二杯"),
  });

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

test("drink request share link rejects photo payloads and disabled links", async () => {
  const collection = createFakeCollection();
  const api = loadFunction(collection);
  await createAccountAndShare(api);

  const photoSubmit = await post(api, {
    action: "drink-request-submit",
    shareToken,
    request: {
      cocktailName: "带图点单",
      photoDataUrl: "data:image/jpeg;base64,abc",
      ingredientGroups: {
        baseLiquors: [],
        flavorLiquors: [],
        beverages: [],
        other: "",
      },
    },
  });
  assert.equal(photoSubmit.statusCode, 400);
  assert.equal(photoSubmit.body.error, "photo_not_allowed");

  await post(api, {
    action: "request-share-disable",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
  });
  const closedSubmit = await post(api, {
    action: "drink-request-submit",
    shareToken,
    request: {
      cocktailName: "冰岛",
      ingredientGroups: {
        baseLiquors: [],
        flavorLiquors: [],
        beverages: [],
        other: "",
      },
    },
  });
  assert.equal(closedSubmit.statusCode, 403);
  assert.equal(closedSubmit.body.status, "share_disabled");
});

test("photo upload preparation requires the account password and returns scoped signed URLs", async () => {
  const collection = createFakeCollection();
  const api = loadFunction(collection);
  await post(api, {
    action: "account-create",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    accountName: "mix",
  });
  const photo = {
    workId: "work-photo-1",
    photoRevision: "rev-1",
    mode: "original-and-preview",
    original: { name: "IMG_1.JPG", type: "image/jpeg", size: 4_000_000 },
    preview: { type: "image/jpeg", size: 200_000 },
  };

  const denied = await post(api, {
    action: "photo-upload-prepare",
    accountNameKey: validKey,
    passwordVerifier: "c".repeat(64),
    ...photo,
  });
  assert.equal(denied.body.status, "password_mismatch");

  const prepared = await post(api, {
    action: "photo-upload-prepare",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    ...photo,
  });
  assert.equal(prepared.statusCode, 200);
  assert.equal(prepared.body.original.objectKey, `photos/${validKey}/work-photo-1/rev-1/original.jpg`);
  assert.equal(prepared.body.preview.objectKey, `photos/${validKey}/work-photo-1/rev-1/preview.jpg`);
  assert.equal(prepared.body.original.method, "PUT");
});

test("photo metadata is verified before save and only stored records can be downloaded", async () => {
  const collection = createFakeCollection();
  const api = loadFunction(collection);
  await post(api, {
    action: "account-create",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    accountName: "mix",
  });
  const originalKey = `photos/${validKey}/work-photo-1/rev-1/original.jpg`;
  const previewKey = `photos/${validKey}/work-photo-1/rev-1/preview.jpg`;
  const photoWork = {
    id: "work-photo-1",
    madeAt: "2026-08-22",
    cocktailSlug: "",
    cocktailName: "照片作品",
    photoDataUrl: "data:image/jpeg;base64,never-store",
    photoOriginalObjectKey: originalKey,
    photoPreviewObjectKey: previewKey,
    photoOriginalName: "IMG_1.JPG",
    photoOriginalMime: "image/jpeg",
    photoOriginalSize: 4_000_000,
    photoRevision: "rev-1",
    photoBackupMode: "original-and-preview",
    ingredientsText: "金酒、汤力水",
    rating: 4,
    mood: "",
    selfReview: "",
    notes: "",
    createdAt: "2026-08-22T06:00:00.000Z",
    updatedAt: "2026-08-22T06:30:00.000Z",
  };

  const saved = await post(api, {
    action: "metadata-patch",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    patch: metadataPatch({ worksChanged: [photoWork] }),
  });
  assert.equal(saved.statusCode, 200);
  assert.deepEqual(api.ossState.headKeys, [originalKey, previewKey]);

  const restored = await post(api, {
    action: "works-get",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
  });
  assert.equal(restored.body.payload.works[0].photoDataUrl, "");
  assert.equal(restored.body.payload.works[0].photoOriginalObjectKey, originalKey);
  assert.equal(restored.body.payload.works[0].photoPreviewObjectKey, previewKey);

  const downloads = await post(api, {
    action: "photo-download-prepare",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    workIds: ["work-photo-1", "not-owned"],
    kind: "preview",
  });
  assert.equal(downloads.statusCode, 200);
  assert.equal(downloads.body.downloads.length, 1);
  assert.equal(downloads.body.downloads[0].objectKey, previewKey);

  const unsafe = await post(api, {
    action: "metadata-patch",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    patch: metadataPatch({
      worksChanged: [
        {
          ...photoWork,
          photoPreviewObjectKey: `photos/${"d".repeat(64)}/work-photo-1/rev-1/preview.jpg`,
          updatedAt: "2026-08-22T07:00:00.000Z",
        },
      ],
    }),
  });
  assert.equal(unsafe.statusCode, 400);
  assert.equal(unsafe.body.error, "invalid_photo_object_key");
});

test("photo deletion saves metadata first and retries failed OSS cleanup", async () => {
  const collection = createFakeCollection();
  const api = loadFunction(collection);
  await post(api, {
    action: "account-create",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    accountName: "mix",
  });
  const previewKey = `photos/${validKey}/legacy-work/rev-1/preview.jpg`;
  await post(api, {
    action: "metadata-patch",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    patch: metadataPatch({
      worksChanged: [
        {
          id: "legacy-work",
          madeAt: "2026-08-22",
          cocktailName: "旧照片",
          photoPreviewObjectKey: previewKey,
          photoRevision: "rev-1",
          photoBackupMode: "preview-only",
          ingredientsText: "朗姆酒",
          createdAt: "2026-08-22T06:00:00.000Z",
          updatedAt: "2026-08-22T06:30:00.000Z",
        },
      ],
    }),
  });

  api.ossState.failDeleteKeys.add(previewKey);
  const removed = await post(api, {
    action: "metadata-patch",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
    patch: metadataPatch({
      changedAt: "2026-08-22T07:00:00.000Z",
      worksDeleted: [{ id: "legacy-work", deletedAt: "2026-08-22T07:00:00.000Z" }],
    }),
  });
  assert.equal(removed.statusCode, 200);
  const accountDoc = collection.docs.find((doc) => doc.lookupKey === `twilight_account_${validKey}`);
  assert.deepEqual(accountDoc.metadataPayload.works, []);
  assert.deepEqual(accountDoc.photoCleanupKeys, [previewKey]);

  api.ossState.failDeleteKeys.clear();
  await post(api, {
    action: "account-login",
    accountNameKey: validKey,
    passwordVerifier: validPassword,
  });
  const refreshedAccountDoc = collection.docs.find(
    (doc) => doc.lookupKey === `twilight_account_${validKey}`,
  );
  assert.deepEqual(refreshedAccountDoc.photoCleanupKeys, []);
  assert.equal(api.ossState.deletedKeys.filter((key) => key === previewKey).length, 2);
});
