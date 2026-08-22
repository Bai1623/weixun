const MAX_ORIGINAL_BYTES = 50 * 1024 * 1024;
const MAX_PREVIEW_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_SECONDS = 15 * 60;
const validAccountNameKeyPattern = /^[a-f0-9]{64}$/;
const validIdentifierPattern = /^[A-Za-z0-9_-]{1,128}$/;

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function validateAccountNameKey(value) {
  if (!validAccountNameKeyPattern.test(value || "")) fail("invalid_account_name_key");
  return value;
}

function validateIdentifier(value, code) {
  if (!validIdentifierPattern.test(value || "")) fail(code);
  return value;
}

function validateImage(value, maxBytes, sizeCode) {
  const source = value && typeof value === "object" ? value : {};
  if (!String(source.type || "").startsWith("image/")) fail("invalid_photo_type");
  const size = Number(source.size || 0);
  if (!Number.isFinite(size) || size <= 0 || size > maxBytes) fail(sizeCode);
  return {
    name: String(source.name || ""),
    type: String(source.type),
    size: Math.floor(size),
  };
}

function extensionFor(image) {
  const fromName = image.name.match(/\.([A-Za-z0-9]{1,10})$/)?.[1]?.toLowerCase();
  if (fromName) return fromName === "jpeg" ? "jpg" : fromName;
  const subtype = image.type.slice("image/".length).split(/[;+]/)[0].toLowerCase();
  if (!/^[a-z0-9]{1,10}$/.test(subtype)) fail("invalid_photo_type");
  return subtype === "jpeg" ? "jpg" : subtype;
}

function normalizePrefix(value) {
  const prefix = String(value || "photos").replace(/^\/+|\/+$/g, "");
  if (!/^[A-Za-z0-9_-]+$/.test(prefix)) fail("invalid_oss_prefix");
  return prefix;
}

function validatePhotoUploadInput(input) {
  const source = input && typeof input === "object" ? input : {};
  const mode = source.mode === "preview-only" ? "preview-only" : source.mode;
  if (mode !== "preview-only" && mode !== "original-and-preview") fail("invalid_photo_mode");
  const preview = validateImage(source.preview, MAX_PREVIEW_BYTES, "preview_too_large");
  if (preview.type !== "image/jpeg") fail("invalid_preview_type");
  return {
    accountNameKey: validateAccountNameKey(source.accountNameKey),
    workId: validateIdentifier(source.workId, "invalid_work_id"),
    photoRevision: validateIdentifier(source.photoRevision, "invalid_photo_revision"),
    mode,
    original:
      mode === "original-and-preview"
        ? validateImage(source.original, MAX_ORIGINAL_BYTES, "photo_too_large")
        : undefined,
    preview,
  };
}

function buildPhotoObjectKeys(prefix, input) {
  const base = `${normalizePrefix(prefix)}/${input.accountNameKey}/${input.workId}/${input.photoRevision}`;
  return {
    original: input.original ? `${base}/original.${extensionFor(input.original)}` : undefined,
    preview: `${base}/preview.jpg`,
  };
}

function assertPhotoObjectKey(prefix, accountNameKey, objectKey) {
  validateAccountNameKey(accountNameKey);
  const expectedPrefix = `${normalizePrefix(prefix)}/${accountNameKey}/`;
  const value = String(objectKey || "");
  if (!value.startsWith(expectedPrefix) || value.includes("..") || value.includes("\\")) {
    fail("invalid_photo_object_key");
  }
  return value;
}

function expiresAt(now) {
  return new Date(now + SIGNED_URL_SECONDS * 1000).toISOString();
}

async function signedPut(client, objectKey, contentType, expiration) {
  return {
    objectKey,
    url: await client.signatureUrlV4(
      "PUT",
      SIGNED_URL_SECONDS,
      { headers: { "Content-Type": contentType } },
      objectKey,
    ),
    method: "PUT",
    contentType,
    expiresAt: expiration,
  };
}

async function prepareUpload(client, prefix, rawInput, now) {
  const input = validatePhotoUploadInput(rawInput);
  const keys = buildPhotoObjectKeys(prefix, input);
  const expiration = expiresAt(now);
  return {
    mode: input.mode,
    photoRevision: input.photoRevision,
    original:
      input.original && keys.original
        ? await signedPut(client, keys.original, input.original.type, expiration)
        : undefined,
    preview: await signedPut(client, keys.preview, "image/jpeg", expiration),
    expiresAt: expiration,
  };
}

async function prepareDownloads(client, prefix, accountNameKey, records, kind, now) {
  validateAccountNameKey(accountNameKey);
  if (kind !== "preview" && kind !== "original") fail("invalid_photo_download_kind");
  const expiration = expiresAt(now);
  const downloads = [];
  for (const record of Array.isArray(records) ? records : []) {
    const workId = validateIdentifier(record?.id, "invalid_work_id");
    const objectKey =
      kind === "original" ? record?.photoOriginalObjectKey : record?.photoPreviewObjectKey;
    if (!objectKey) continue;
    const safeKey = assertPhotoObjectKey(prefix, accountNameKey, objectKey);
    downloads.push({
      workId,
      objectKey: safeKey,
      url: await client.signatureUrlV4("GET", SIGNED_URL_SECONDS, { headers: {} }, safeKey),
      method: "GET",
      expiresAt: expiration,
    });
  }
  return downloads;
}

async function assertObjectsExist(client, prefix, accountNameKey, keys) {
  for (const key of Array.from(new Set(Array.isArray(keys) ? keys : [])).filter(Boolean)) {
    await client.head(assertPhotoObjectKey(prefix, accountNameKey, key));
  }
}

async function deleteObjects(client, prefix, accountNameKey, keys) {
  for (const key of Array.from(new Set(Array.isArray(keys) ? keys : [])).filter(Boolean)) {
    await client.delete(assertPhotoObjectKey(prefix, accountNameKey, key));
  }
}

function createOssPhotoService({ OSS = require("ali-oss"), env = process.env, now = Date.now } = {}) {
  const accessKeyId = env.ALIBABA_CLOUD_ACCESS_KEY_ID;
  const accessKeySecret = env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;
  const region = env.ALIYUN_OSS_REGION;
  const bucket = env.ALIYUN_OSS_BUCKET;
  if (!accessKeyId || !accessKeySecret || !region || !bucket) fail("missing_oss_configuration");
  const prefix = normalizePrefix(env.ALIYUN_OSS_PREFIX || "photos");
  const client = new OSS({
    accessKeyId,
    accessKeySecret,
    region,
    bucket,
    authorizationV4: true,
    secure: true,
  });
  return {
    prepareUpload: (input) => prepareUpload(client, prefix, input, now()),
    prepareDownloads: (accountNameKey, records, kind) =>
      prepareDownloads(client, prefix, accountNameKey, records, kind, now()),
    assertObjectsExist: (accountNameKey, keys) =>
      assertObjectsExist(client, prefix, accountNameKey, keys),
    deleteObjects: (accountNameKey, keys) => deleteObjects(client, prefix, accountNameKey, keys),
  };
}

module.exports = {
  MAX_ORIGINAL_BYTES,
  buildPhotoObjectKeys,
  createOssPhotoService,
  validatePhotoUploadInput,
};
