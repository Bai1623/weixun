const MAX_RECORDS = 500;
let cachedCollection = null;

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
  const records = Array.isArray(payload?.records) ? payload.records : [];
  return records.slice(0, MAX_RECORDS);
}

function buildWorksPayload(payload) {
  return {
    version: 1,
    app: "twilight-mixbook",
    type: "work-records",
    records: safeRecords(payload),
  };
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
        recordCount: Number(doc.recordCount || doc.payload?.records?.length || 0),
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
        backupCreatedAt: "",
        payload: buildWorksPayload({ records: [] }),
      });
      return response({ ok: true, status: "created", recordCount: 0 });
    }

    if (method === "POST" && action === "works-put") {
      const { accountNameKey, passwordVerifier, accountName = "", payload } = body;
      if (!validCloudKey(accountNameKey)) return response({ error: "invalid_account_name_key" }, 400);
      if (!validCloudKey(passwordVerifier)) return response({ error: "invalid_password_verifier" }, 400);

      const id = accountDocId(accountNameKey);
      const doc = await getDoc(id).catch(() => null);
      if (doc && doc.passwordVerifier !== passwordVerifier) {
        return response({ ok: false, status: "password_mismatch" });
      }

      const worksPayload = buildWorksPayload(payload);
      const now = new Date().toISOString();
      await saveDoc(id, {
        type: "twilight-account-works",
        accountName: accountName || doc?.accountName || "",
        accountNameKey,
        passwordVerifier,
        recordCount: worksPayload.records.length,
        backupCreatedAt: now,
        payload: worksPayload,
      });
      return response({ ok: true, status: doc ? "updated" : "created", recordCount: worksPayload.records.length });
    }

    if (method === "POST" && action === "works-get") {
      const { accountNameKey, passwordVerifier } = body;
      if (!validCloudKey(accountNameKey)) return response({ error: "invalid_account_name_key" }, 400);
      if (!validCloudKey(passwordVerifier)) return response({ error: "invalid_password_verifier" }, 400);

      const doc = await getDoc(accountDocId(accountNameKey)).catch(() => null);
      if (!doc) return response({ ok: true, status: "account_not_found", payload: buildWorksPayload({ records: [] }) });
      if (doc.passwordVerifier !== passwordVerifier) {
        return response({ ok: false, status: "password_mismatch" });
      }

      return response({
        ok: true,
        status: "matched",
        accountName: doc.accountName || "",
        recordCount: Number(doc.recordCount || doc.payload?.records?.length || 0),
        backupCreatedAt: doc.backupCreatedAt || "",
        payload: buildWorksPayload(doc.payload),
      });
    }

    return response({ name: "twilight-works-api", status: "ok" });
  } catch (error) {
    return response({ error: "server_error", message: error.message }, 500);
  }
};
