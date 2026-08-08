const MAX_RECORDS = 500;
const MAX_CHUNK_TEXT_BYTES = 128 * 1024;
const MAX_DRINK_REQUESTS = 200;
const MAX_DRINK_REQUEST_BYTES = 6 * 1024;
const MAX_DRINK_TEXT = {
  guestName: 24,
  cocktailName: 40,
  ingredient: 40,
  other: 200,
  note: 160,
};
let cachedCollection = null;
const crypto = require("crypto");

function getCollection() {
  if (cachedCollection) return cachedCollection;
  const cloudbase = require("@cloudbase/node-sdk");
  const app = cloudbase.init({
    env: cloudbase.SYMBOL_CURRENT_ENV,
  });
  cachedCollection = app.database().collection("works");
  return cachedCollection;
}

function headers() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function response(data, statusCode = 200) {
  return {
    statusCode,
    headers: headers(),
    body: JSON.stringify(data),
  };
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === "object") return body;
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

function validCloudKey(value) {
  return /^[A-Za-z0-9+/=_-]{32,160}$/.test(value || "");
}

function accountDocId(accountNameKey) {
  return `twilight_account_${accountNameKey}`;
}

function accountChunkDocId(accountNameKey, uploadId, chunkIndex) {
  return `twilight_account_${accountNameKey}_${uploadId}_chunk_${chunkIndex}`;
}

function requestShareDocId(shareKey) {
  return `twilight_request_share_${shareKey}`;
}

function legacyAccountChunkDocId(accountNameKey, chunkIndex) {
  return `twilight_account_${accountNameKey}_chunk_${chunkIndex}`;
}

function uploadId() {
  return `up_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function validUploadId(value) {
  return /^[A-Za-z0-9_-]{6,80}$/.test(value || "");
}

function validShareToken(value) {
  return /^[A-Za-z0-9_-]{24,128}$/.test(value || "");
}

function byteLength(value) {
  return Buffer.byteLength(String(value || ""), "utf8");
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function shareKeyFromToken(token) {
  return sha256(`twilight-drink-request-share:v1:${token}`);
}

function createDrinkRequestId() {
  return `drink_req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function getDoc(lookupKey) {
  const result = await getCollection().where({ lookupKey }).limit(1).get();
  return result?.data?.[0] || null;
}

async function saveDoc(lookupKey, data) {
  const oldDoc = await getDoc(lookupKey).catch(() => null);
  const payload = {
    lookupKey,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  if (oldDoc?._id) {
    const { _id, ...updatablePayload } = payload;
    await getCollection().doc(oldDoc._id).update(updatablePayload);
    return;
  }

  await getCollection().add(payload);
}

function safeRecords(payload) {
  const records = Array.isArray(payload?.works)
    ? payload.works
    : Array.isArray(payload?.records)
      ? payload.records
      : [];
  return records.slice(0, MAX_RECORDS);
}

function safeString(value, maxLength = 240) {
  const next = typeof value === "string" ? value.trim() : "";
  return Array.from(next).slice(0, maxLength).join("");
}

function safeStringArray(values, maxItems = 500, maxLength = 80) {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(values.map((item) => safeString(item, maxLength)).filter(Boolean)),
  ).slice(0, maxItems);
}

function safeNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function safeIngredientGroups(value) {
  const groups = value && typeof value === "object" ? value : {};
  return {
    baseLiquors: safeStringArray(groups.baseLiquors, 4, 40),
    flavorLiquors: safeStringArray(groups.flavorLiquors, 12, 40),
    beverages: safeStringArray(groups.beverages, 12, 40),
    other: safeString(groups.other, 500),
  };
}

function safeCustomCocktails(values) {
  if (!Array.isArray(values)) return [];
  return values
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      value: safeString(item.value, 80),
      slug: safeString(item.slug, 80),
      nameZh: safeString(item.nameZh, 80),
      nameEn: safeString(item.nameEn, 80),
      ingredientsText: safeString(item.ingredientsText, 1200),
      ingredientGroups: item.ingredientGroups ? safeIngredientGroups(item.ingredientGroups) : undefined,
      isCustom: true,
      createdAt: safeString(item.createdAt, 40),
    }))
    .filter((item) => item.value && item.slug && item.nameZh && item.nameEn && item.createdAt)
    .slice(0, MAX_RECORDS);
}

function safeDrinkRequests(doc) {
  const requests = Array.isArray(doc?.drinkRequests) ? doc.drinkRequests : [];
  return requests
    .filter((request) => request && typeof request === "object" && typeof request.cocktailName === "string")
    .slice(0, MAX_DRINK_REQUESTS);
}

function buildWorksPayload(payload) {
  return {
    version: 1,
    app: "twilight-mixbook",
    type: "work-records",
    records: safeRecords(payload),
  };
}

function buildAppDataPayload(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const dailyPick = source.dailyPick && typeof source.dailyPick === "object" ? source.dailyPick : {};
  const customOptions = source.customOptions && typeof source.customOptions === "object" ? source.customOptions : {};
  const autoBackup = source.autoBackup && typeof source.autoBackup === "object" ? source.autoBackup : {};

  return {
    version: 1,
    app: "twilight-mixbook",
    type: "app-data",
    works: safeRecords({ works: source.works }),
    pantry: {
      ingredientSlugs: safeStringArray(source.pantry?.ingredientSlugs),
    },
    favorites: {
      cocktailSlugs: safeStringArray(source.favorites?.cocktailSlugs),
    },
    academy: {
      completedSlugs: safeStringArray(source.academy?.completedSlugs),
    },
    dailyPick: {
      selectedSlug: safeString(dailyPick.selectedSlug, 80),
      selectedDate: safeString(dailyPick.selectedDate, 40),
      reason: safeString(dailyPick.reason, 300),
      rerollCount: Math.max(0, Math.floor(safeNumber(dailyPick.rerollCount))),
    },
    customOptions: {
      cocktails: safeCustomCocktails(customOptions.cocktails),
      flavorLiquors: safeStringArray(customOptions.flavorLiquors, 300, 80),
      beverages: safeStringArray(customOptions.beverages, 300, 80),
    },
    autoBackup: {
      enabled: Boolean(autoBackup.enabled),
      lastBackupAt: safeString(autoBackup.lastBackupAt, 40),
    },
  };
}

function buildAccountPayload(payload, payloadType = "") {
  if (payloadType === "app-data" || payload?.type === "app-data") {
    return buildAppDataPayload(payload);
  }
  return buildWorksPayload(payload);
}

function payloadRecordCount(payload) {
  return safeRecords(payload).length;
}

async function assertAccountPassword(accountNameKey, passwordVerifier) {
  const doc = await getDoc(accountDocId(accountNameKey)).catch(() => null);
  if (doc && doc.passwordVerifier !== passwordVerifier) {
    return { ok: false, status: "password_mismatch", doc };
  }
  return { ok: true, doc };
}

function drinkRequestError(error, message, statusCode = 400) {
  const result = new Error(message);
  result.error = error;
  result.statusCode = statusCode;
  return result;
}

function normalizeDrinkText(label, value, maxLength, required = false) {
  const next = typeof value === "string" ? value.trim() : "";
  if (required && !next) throw drinkRequestError("missing_required_field", `请填写${label}。`);
  if (Array.from(next).length > maxLength) {
    throw drinkRequestError("field_too_long", `${label}最多 ${maxLength} 个字。`);
  }
  return next;
}

function normalizeDrinkList(values, maxItems) {
  if (!Array.isArray(values)) return [];
  return values
    .map((item) => normalizeDrinkText("材料", item, MAX_DRINK_TEXT.ingredient))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeDrinkRequest(input) {
  if (input?.photoDataUrl) {
    throw drinkRequestError("photo_not_allowed", "朋友点单不支持上传图片。");
  }

  const groups = input?.ingredientGroups || {};
  const request = {
    id: createDrinkRequestId(),
    guestName: normalizeDrinkText("称呼", input?.guestName, MAX_DRINK_TEXT.guestName),
    cocktailName: normalizeDrinkText("酒名", input?.cocktailName, MAX_DRINK_TEXT.cocktailName, true),
    ingredientGroups: {
      baseLiquors: normalizeDrinkList(groups.baseLiquors, 4),
      flavorLiquors: normalizeDrinkList(groups.flavorLiquors, 8),
      beverages: normalizeDrinkList(groups.beverages, 8),
      other: normalizeDrinkText("其他材料", groups.other, MAX_DRINK_TEXT.other),
    },
    note: normalizeDrinkText("备注", input?.note, MAX_DRINK_TEXT.note),
    createdAt: new Date().toISOString(),
  };

  if (byteLength(JSON.stringify(request)) > MAX_DRINK_REQUEST_BYTES) {
    throw drinkRequestError("request_too_large", "点单内容过长，请减少材料或备注。", 413);
  }
  return request;
}

async function disableShareDoc(shareKey) {
  if (!shareKey) return;
  const shareDoc = await getDoc(requestShareDocId(shareKey)).catch(() => null);
  if (!shareDoc) return;
  await saveDoc(requestShareDocId(shareKey), {
    enabled: false,
    disabledAt: new Date().toISOString(),
  });
}

async function readChunkedPayload(doc) {
  const chunkCount = Number(doc?.chunkCount || 0);
  if (!chunkCount) return buildAccountPayload(doc?.payload, doc?.payloadType);

  const textChunks = [];
  const legacyRecords = [];
  let appDataChunk = null;
  let textMode = false;
  const activeUploadId = doc.activeUploadId || "";
  for (let index = 0; index < chunkCount; index += 1) {
    const chunk = activeUploadId
      ? await getDoc(accountChunkDocId(doc.accountNameKey, activeUploadId, index)).catch(() => null)
      : await getDoc(legacyAccountChunkDocId(doc.accountNameKey, index)).catch(() => null);
    if (!chunk) throw new Error("missing_upload_chunk");
    if (typeof chunk.payloadText === "string") {
      if (legacyRecords.length) throw new Error("mixed_upload_chunk_format");
      textMode = true;
      textChunks.push(chunk.payloadText);
      continue;
    }
    if (textMode) throw new Error("mixed_upload_chunk_format");
    if (chunk?.payload?.type === "app-data") {
      appDataChunk = chunk.payload;
      continue;
    }
    legacyRecords.push(...safeRecords(chunk?.payload));
  }

  if (textMode) {
    const parsed = JSON.parse(textChunks.join(""));
    return buildAccountPayload(parsed, parsed?.type || doc.payloadType);
  }

  if (appDataChunk) return buildAppDataPayload(appDataChunk);
  return buildWorksPayload({ records: legacyRecords });
}

exports.main = async (event = {}) => {
  const method = event.httpMethod || event.method || event.requestContext?.http?.method || "GET";
  const body = parseBody(event.body);

  if (method === "OPTIONS") return response({ ok: true });

  try {
    const action = body.action || "";

    if (method === "POST" && action === "account-login") {
      const { accountNameKey, passwordVerifier } = body;
      if (!validCloudKey(accountNameKey)) return response({ error: "invalid_account_name_key" }, 400);
      if (!validCloudKey(passwordVerifier)) return response({ error: "invalid_password_verifier" }, 400);

      const doc = await getDoc(accountDocId(accountNameKey)).catch(() => null);
      if (!doc) return response({ ok: true, status: "account_not_found", recordCount: 0 });
      if (doc.passwordVerifier !== passwordVerifier) {
        return response({ ok: false, status: "password_mismatch" });
      }

      return response({
        ok: true,
        status: "matched",
        accountName: doc.accountName || "",
        recordCount: Number(doc.recordCount || payloadRecordCount(doc.payload)),
        backupCreatedAt: doc.backupCreatedAt || "",
      });
    }

    if (method === "POST" && action === "account-create") {
      const { accountNameKey, passwordVerifier, accountName = "" } = body;
      if (!validCloudKey(accountNameKey)) return response({ error: "invalid_account_name_key" }, 400);
      if (!validCloudKey(passwordVerifier)) return response({ error: "invalid_password_verifier" }, 400);

      const id = accountDocId(accountNameKey);
      const doc = await getDoc(id).catch(() => null);
      if (doc) {
        if (doc.passwordVerifier !== passwordVerifier) {
          return response({ ok: false, status: "password_mismatch" });
        }
        return response({ ok: true, status: "exists", recordCount: Number(doc.recordCount || 0) });
      }

      await saveDoc(id, {
        type: "twilight-account-works",
        accountName,
        accountNameKey,
        passwordVerifier,
        recordCount: 0,
        payloadType: "app-data",
        backupCreatedAt: "",
        payload: buildAppDataPayload({}),
      });
      return response({ ok: true, status: "created", recordCount: 0 });
    }

    if (method === "POST" && action === "works-put") {
      const { accountNameKey, passwordVerifier, accountName = "", payload, payloadType = "" } = body;
      if (!validCloudKey(accountNameKey)) return response({ error: "invalid_account_name_key" }, 400);
      if (!validCloudKey(passwordVerifier)) return response({ error: "invalid_password_verifier" }, 400);

      const id = accountDocId(accountNameKey);
      const doc = await getDoc(id).catch(() => null);
      if (doc && doc.passwordVerifier !== passwordVerifier) {
        return response({ ok: false, status: "password_mismatch" });
      }

      const accountPayload = buildAccountPayload(payload, payloadType);
      const now = new Date().toISOString();
      await saveDoc(id, {
        type: "twilight-account-works",
        accountName: accountName || doc?.accountName || "",
        accountNameKey,
        passwordVerifier,
        recordCount: payloadRecordCount(accountPayload),
        payloadType: accountPayload.type,
        chunkCount: 0,
        activeUploadId: "",
        backupCreatedAt: now,
        payload: accountPayload,
      });
      return response({ ok: true, status: doc ? "updated" : "created", recordCount: payloadRecordCount(accountPayload) });
    }

    if (method === "POST" && action === "works-put-start") {
      const { accountNameKey, passwordVerifier, accountName = "", recordCount = 0, chunkCount = 0, payloadType = "work-records" } = body;
      if (!validCloudKey(accountNameKey)) return response({ error: "invalid_account_name_key" }, 400);
      if (!validCloudKey(passwordVerifier)) return response({ error: "invalid_password_verifier" }, 400);

      const account = await assertAccountPassword(accountNameKey, passwordVerifier);
      if (!account.ok) return response({ ok: false, status: "password_mismatch" });

      return response({
        ok: true,
        status: "started",
        uploadId: uploadId(),
        accountName: accountName || account.doc?.accountName || "",
        payloadType,
        recordCount: Number(recordCount || 0),
        chunkCount: Number(chunkCount || 0),
      });
    }

    if (method === "POST" && action === "works-put-chunk") {
      const {
        accountNameKey,
        passwordVerifier,
        uploadId: currentUploadId = "",
        chunkIndex = 0,
        payload,
        payloadText = "",
        payloadType = "",
      } = body;
      if (!validCloudKey(accountNameKey)) return response({ error: "invalid_account_name_key" }, 400);
      if (!validCloudKey(passwordVerifier)) return response({ error: "invalid_password_verifier" }, 400);
      if (!validUploadId(currentUploadId)) return response({ error: "invalid_upload_id" }, 400);

      const account = await assertAccountPassword(accountNameKey, passwordVerifier);
      if (!account.ok) return response({ ok: false, status: "password_mismatch" });

      const index = Number(chunkIndex || 0);
      if (!Number.isInteger(index) || index < 0 || index > 999) return response({ error: "invalid_chunk_index" }, 400);

      if (typeof payloadText === "string" && payloadText) {
        const textBytes = byteLength(payloadText);
        if (textBytes > MAX_CHUNK_TEXT_BYTES) return response({ error: "chunk_too_large" }, 413);
        await saveDoc(accountChunkDocId(accountNameKey, currentUploadId, index), {
          type: "twilight-account-works-chunk",
          accountNameKey,
          uploadId: currentUploadId,
          chunkIndex: index,
          payloadType,
          recordCount: 0,
          payloadText,
          textLength: payloadText.length,
          textBytes,
        });
        return response({
          ok: true,
          status: "chunk_saved",
          chunkIndex: index,
          textLength: payloadText.length,
          textBytes,
        });
      }

      const accountPayload = buildAccountPayload(payload, payloadType);
      await saveDoc(accountChunkDocId(accountNameKey, currentUploadId, index), {
        type: "twilight-account-works-chunk",
        accountNameKey,
        uploadId: currentUploadId,
        chunkIndex: index,
        payloadType: accountPayload.type,
        recordCount: payloadRecordCount(accountPayload),
        payload: accountPayload,
      });
      return response({ ok: true, status: "chunk_saved", chunkIndex: index, recordCount: payloadRecordCount(accountPayload) });
    }

    if (method === "POST" && action === "works-put-commit") {
      const { accountNameKey, passwordVerifier, uploadId: currentUploadId = "", accountName = "", recordCount = 0, chunkCount = 0, payloadType = "work-records" } = body;
      if (!validCloudKey(accountNameKey)) return response({ error: "invalid_account_name_key" }, 400);
      if (!validCloudKey(passwordVerifier)) return response({ error: "invalid_password_verifier" }, 400);
      if (!validUploadId(currentUploadId)) return response({ error: "invalid_upload_id" }, 400);

      const account = await assertAccountPassword(accountNameKey, passwordVerifier);
      if (!account.ok) return response({ ok: false, status: "password_mismatch" });

      const now = new Date().toISOString();
      await saveDoc(accountDocId(accountNameKey), {
        type: "twilight-account-works",
        accountName: accountName || account.doc?.accountName || "",
        accountNameKey,
        passwordVerifier,
        recordCount: Number(recordCount || 0),
        chunkCount: Number(chunkCount || 0),
        activeUploadId: currentUploadId,
        payloadType,
        backupCreatedAt: now,
        payload: payloadType === "app-data" ? buildAppDataPayload({}) : buildWorksPayload({ records: [] }),
      });
      return response({ ok: true, status: "saved", recordCount: Number(recordCount || 0), chunkCount: Number(chunkCount || 0) });
    }

    if (method === "POST" && action === "works-get") {
      const { accountNameKey, passwordVerifier } = body;
      if (!validCloudKey(accountNameKey)) return response({ error: "invalid_account_name_key" }, 400);
      if (!validCloudKey(passwordVerifier)) return response({ error: "invalid_password_verifier" }, 400);

      const doc = await getDoc(accountDocId(accountNameKey)).catch(() => null);
      if (!doc) return response({ ok: true, status: "account_not_found", payload: buildAppDataPayload({}) });
      if (doc.passwordVerifier !== passwordVerifier) {
        return response({ ok: false, status: "password_mismatch" });
      }

      return response({
        ok: true,
        status: "matched",
        accountName: doc.accountName || "",
        recordCount: Number(doc.recordCount || payloadRecordCount(doc.payload)),
        backupCreatedAt: doc.backupCreatedAt || "",
        payload: await readChunkedPayload(doc),
      });
    }

    if (method === "POST" && action === "request-share-get") {
      const { accountNameKey, passwordVerifier } = body;
      if (!validCloudKey(accountNameKey)) return response({ error: "invalid_account_name_key" }, 400);
      if (!validCloudKey(passwordVerifier)) return response({ error: "invalid_password_verifier" }, 400);

      const account = await assertAccountPassword(accountNameKey, passwordVerifier);
      if (!account.ok) return response({ ok: false, status: "password_mismatch" });

      const enabled = Boolean(account.doc?.requestShareEnabled && account.doc?.requestShareKey);
      return response({
        ok: true,
        enabled,
        requestCount: safeDrinkRequests(account.doc).length,
        updatedAt: account.doc?.requestShareUpdatedAt || "",
      });
    }

    if (method === "POST" && action === "request-share-reset") {
      const { accountNameKey, passwordVerifier, shareToken = "" } = body;
      if (!validCloudKey(accountNameKey)) return response({ error: "invalid_account_name_key" }, 400);
      if (!validCloudKey(passwordVerifier)) return response({ error: "invalid_password_verifier" }, 400);
      if (!validShareToken(shareToken)) return response({ error: "invalid_share_token" }, 400);

      const account = await assertAccountPassword(accountNameKey, passwordVerifier);
      if (!account.ok) return response({ ok: false, status: "password_mismatch" });

      const now = new Date().toISOString();
      const previousShareKey = account.doc?.requestShareKey || "";
      const shareKey = shareKeyFromToken(shareToken);
      if (previousShareKey && previousShareKey !== shareKey) {
        await disableShareDoc(previousShareKey);
      }

      await saveDoc(requestShareDocId(shareKey), {
        type: "twilight-drink-request-share",
        accountNameKey,
        shareKey,
        enabled: true,
        requestShareUpdatedAt: now,
      });
      await saveDoc(accountDocId(accountNameKey), {
        type: "twilight-account-works",
        accountNameKey,
        passwordVerifier,
        requestShareEnabled: true,
        requestShareKey: shareKey,
        requestShareUpdatedAt: now,
        drinkRequestCount: safeDrinkRequests(account.doc).length,
      });
      return response({
        ok: true,
        enabled: true,
        requestCount: safeDrinkRequests(account.doc).length,
        updatedAt: now,
      });
    }

    if (method === "POST" && action === "request-share-disable") {
      const { accountNameKey, passwordVerifier } = body;
      if (!validCloudKey(accountNameKey)) return response({ error: "invalid_account_name_key" }, 400);
      if (!validCloudKey(passwordVerifier)) return response({ error: "invalid_password_verifier" }, 400);

      const account = await assertAccountPassword(accountNameKey, passwordVerifier);
      if (!account.ok) return response({ ok: false, status: "password_mismatch" });

      await disableShareDoc(account.doc?.requestShareKey || "");
      await saveDoc(accountDocId(accountNameKey), {
        requestShareEnabled: false,
        requestShareUpdatedAt: new Date().toISOString(),
      });
      return response({ ok: true, enabled: false });
    }

    if (method === "POST" && action === "drink-request-submit") {
      const { shareToken = "", request } = body;
      if (!validShareToken(shareToken)) return response({ error: "invalid_share_token" }, 400);
      if (byteLength(JSON.stringify(request || {})) > MAX_DRINK_REQUEST_BYTES) {
        return response({ error: "request_too_large", message: "点单内容过长，请减少材料或备注。" }, 413);
      }

      const shareKey = shareKeyFromToken(shareToken);
      const shareDoc = await getDoc(requestShareDocId(shareKey)).catch(() => null);
      if (!shareDoc?.enabled || !shareDoc.accountNameKey) {
        return response({ ok: false, status: "share_disabled", message: "这个点单链接已经关闭。" }, 403);
      }

      const accountDoc = await getDoc(accountDocId(shareDoc.accountNameKey)).catch(() => null);
      if (
        !accountDoc?.requestShareEnabled ||
        accountDoc.requestShareKey !== shareKey ||
        accountDoc.accountNameKey !== shareDoc.accountNameKey
      ) {
        return response({ ok: false, status: "share_disabled", message: "这个点单链接已经关闭。" }, 403);
      }

      let drinkRequest;
      try {
        drinkRequest = normalizeDrinkRequest(request);
      } catch (error) {
        return response(
          { error: error.error || "invalid_drink_request", message: error.message },
          error.statusCode || 400,
        );
      }

      const nextRequests = [drinkRequest, ...safeDrinkRequests(accountDoc)].slice(0, MAX_DRINK_REQUESTS);
      await saveDoc(accountDocId(accountDoc.accountNameKey), {
        drinkRequests: nextRequests,
        drinkRequestCount: nextRequests.length,
      });
      return response({ ok: true, status: "created", requestId: drinkRequest.id });
    }

    if (method === "POST" && action === "drink-requests-get") {
      const { accountNameKey, passwordVerifier } = body;
      if (!validCloudKey(accountNameKey)) return response({ error: "invalid_account_name_key" }, 400);
      if (!validCloudKey(passwordVerifier)) return response({ error: "invalid_password_verifier" }, 400);

      const account = await assertAccountPassword(accountNameKey, passwordVerifier);
      if (!account.ok) return response({ ok: false, status: "password_mismatch" });

      return response({
        ok: true,
        requestCount: safeDrinkRequests(account.doc).length,
        requests: safeDrinkRequests(account.doc),
      });
    }

    return response({ name: "twilight-works-api", status: "ok" });
  } catch (error) {
    return response({ error: "server_error", message: error.message }, 500);
  }
};
