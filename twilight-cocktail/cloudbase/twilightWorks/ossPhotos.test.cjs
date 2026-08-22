const assert = require("node:assert/strict");
const test = require("node:test");

let photoModule = {};
try {
  photoModule = require("./ossPhotos.js");
} catch {
  photoModule = {};
}

const validKey = "a".repeat(64);
const env = {
  ALIBABA_CLOUD_ACCESS_KEY_ID: "test-access-key-id",
  ALIBABA_CLOUD_ACCESS_KEY_SECRET: "test-access-key-secret",
  ALIYUN_OSS_REGION: "oss-cn-hangzhou",
  ALIYUN_OSS_BUCKET: "twilight-cocktail-bai",
  ALIYUN_OSS_PREFIX: "photos",
};

class FakeOssClient {
  static instances = [];

  constructor(options) {
    this.options = options;
    this.signed = [];
    this.headKeys = [];
    this.deletedKeys = [];
    FakeOssClient.instances.push(this);
  }

  async signatureUrlV4(method, expires, options, objectKey) {
    this.signed.push({ method, expires, options, objectKey });
    return `https://signed.example/${encodeURIComponent(objectKey)}?method=${method}`;
  }

  async head(objectKey) {
    this.headKeys.push(objectKey);
    return { res: { status: 200 } };
  }

  async delete(objectKey) {
    this.deletedKeys.push(objectKey);
    return { res: { status: 204 } };
  }
}

const createService = () => {
  assert.equal(typeof photoModule.createOssPhotoService, "function", "OSS photo service is missing");
  FakeOssClient.instances = [];
  return photoModule.createOssPhotoService({
    OSS: FakeOssClient,
    env,
    now: () => Date.parse("2026-08-22T06:00:00.000Z"),
  });
};

const dualInput = (overrides = {}) => ({
  accountNameKey: validKey,
  workId: "work-1",
  photoRevision: "rev-1",
  mode: "original-and-preview",
  original: { name: "IMG_0001.HEIC", type: "image/heic", size: 4_000_000 },
  preview: { type: "image/jpeg", size: 240_000 },
  ...overrides,
});

test("creates private OSS client settings and signed dual-photo object keys", async () => {
  const service = createService();
  const result = await service.prepareUpload(dualInput());
  const client = FakeOssClient.instances[0];

  assert.deepEqual(client.options, {
    accessKeyId: "test-access-key-id",
    accessKeySecret: "test-access-key-secret",
    region: "oss-cn-hangzhou",
    bucket: "twilight-cocktail-bai",
    authorizationV4: true,
    secure: true,
  });
  assert.equal(result.original.objectKey, `photos/${validKey}/work-1/rev-1/original.heic`);
  assert.equal(result.preview.objectKey, `photos/${validKey}/work-1/rev-1/preview.jpg`);
  assert.equal(result.original.method, "PUT");
  assert.equal(result.original.contentType, "image/heic");
  assert.equal(result.preview.contentType, "image/jpeg");
  assert.equal(result.expiresAt, "2026-08-22T06:15:00.000Z");
  assert.deepEqual(client.signed[0].options.headers, { "Content-Type": "image/heic" });
  assert.deepEqual(client.signed[1].options.headers, { "Content-Type": "image/jpeg" });
});

test("creates preview-only upload without claiming an original", async () => {
  const service = createService();
  const result = await service.prepareUpload(
    dualInput({ mode: "preview-only", original: undefined }),
  );

  assert.equal(result.mode, "preview-only");
  assert.equal(result.original, undefined);
  assert.equal(result.preview.objectKey, `photos/${validKey}/work-1/rev-1/preview.jpg`);
  assert.equal(FakeOssClient.instances[0].signed.length, 1);
});

test("rejects non-images, oversized originals, and unsafe identifiers", async () => {
  const service = createService();

  await assert.rejects(
    service.prepareUpload(dualInput({ original: { name: "notes.txt", type: "text/plain", size: 12 } })),
    /invalid_photo_type/,
  );
  await assert.rejects(
    service.prepareUpload(
      dualInput({ original: { name: "large.jpg", type: "image/jpeg", size: 50 * 1024 * 1024 + 1 } }),
    ),
    /photo_too_large/,
  );
  await assert.rejects(service.prepareUpload(dualInput({ workId: "../other" })), /invalid_work_id/);
  await assert.rejects(
    service.prepareUpload(dualInput({ accountNameKey: "b".repeat(63) })),
    /invalid_account_name_key/,
  );
});

test("signs downloads only for keys inside the authenticated account prefix", async () => {
  const service = createService();
  const downloads = await service.prepareDownloads(
    validKey,
    [
      {
        id: "work-1",
        photoPreviewObjectKey: `photos/${validKey}/work-1/rev-1/preview.jpg`,
        photoOriginalObjectKey: `photos/${validKey}/work-1/rev-1/original.heic`,
      },
    ],
    "preview",
  );

  assert.equal(downloads.length, 1);
  assert.deepEqual(downloads[0], {
    workId: "work-1",
    objectKey: `photos/${validKey}/work-1/rev-1/preview.jpg`,
    url: `https://signed.example/${encodeURIComponent(`photos/${validKey}/work-1/rev-1/preview.jpg`)}?method=GET`,
    method: "GET",
    expiresAt: "2026-08-22T06:15:00.000Z",
  });

  await assert.rejects(
    service.prepareDownloads(
      validKey,
      [{ id: "work-2", photoPreviewObjectKey: "photos/other-account/work-2/rev/preview.jpg" }],
      "preview",
    ),
    /invalid_photo_object_key/,
  );
});

test("checks and deletes only authenticated account objects", async () => {
  const service = createService();
  const keys = [
    `photos/${validKey}/work-1/rev-1/original.heic`,
    `photos/${validKey}/work-1/rev-1/preview.jpg`,
  ];

  await service.assertObjectsExist(validKey, keys);
  await service.deleteObjects(validKey, keys);

  assert.deepEqual(FakeOssClient.instances[0].headKeys, keys);
  assert.deepEqual(FakeOssClient.instances[0].deletedKeys, keys);
  await assert.rejects(
    service.deleteObjects(validKey, ["photos/other-account/work/rev/preview.jpg"]),
    /invalid_photo_object_key/,
  );
});
