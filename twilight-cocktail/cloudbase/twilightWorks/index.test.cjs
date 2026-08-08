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

function loadFunction(collection) {
  const originalLoad = Module._load;
  const patchedLoad = function patchedLoad(request, parent, isMain) {
    if (request === "@cloudbase/node-sdk") {
      return {
        SYMBOL_CURRENT_ENV: "test",
        init: () => ({
          database: () => ({
            collection: () => collection,
          }),
        }),
      };
    }
    return originalLoad(request, parent, isMain);
  };
  Module._load = patchedLoad;
  delete require.cache[require.resolve("./index.js")];
  const api = require("./index.js");
  Module._load = originalLoad;
  return {
    main: async (event) => {
      Module._load = patchedLoad;
      try {
        return await api.main(event);
      } finally {
        Module._load = originalLoad;
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
