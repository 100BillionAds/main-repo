/** @jest-environment node */

/**
 * 파일 DB 저장 통합 테스트 (실제 MySQL / TiDB)
 */

const defaults = {
  DATABASE_HOST: '127.0.0.1',
  DATABASE_PORT: '3306',
  DATABASE_USER: 'root',
  DATABASE_PASSWORD: 'root',
  DATABASE_NAME: '10badv_test',
};
for (const [key, value] of Object.entries(defaults)) {
  if (process.env[key] === undefined) process.env[key] = value;
}
process.env.STORAGE_PROVIDER = 'db';

const db = require('@/lib/db');
const { uploadObject, getMaxUploadBytes, getStorageProvider } = require('@/lib/storage');
const { GET: serveFile } = require('@/app/api/files/[id]/route');

jest.setTimeout(60000);

// 1x1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

async function fetchStored(url) {
  const id = url.split('/').pop();
  return serveFile(new Request(`http://localhost${url}`), { params: Promise.resolve({ id }) });
}

describe('파일 DB 저장', () => {
  const savedTotal = process.env.STORAGE_DB_MAX_TOTAL_MB;

  beforeAll(async () => {
    expect(await db.initializeDatabase()).toBe(true);
  });

  afterEach(() => {
    if (savedTotal === undefined) delete process.env.STORAGE_DB_MAX_TOTAL_MB;
    else process.env.STORAGE_DB_MAX_TOTAL_MB = savedTotal;
  });

  afterAll(async () => {
    await db.query("DELETE FROM stored_files WHERE object_key LIKE 'test/%'");
    await db.closeDatabasePool();
  });

  it('저장 방식이 db 이고, 파일 크기 한도는 2MB 로 줄어든다', () => {
    expect(getStorageProvider()).toBe('db');
    expect(getMaxUploadBytes(10 * 1024 * 1024)).toBe(2 * 1024 * 1024);
    expect(getMaxUploadBytes(1024)).toBe(1024);
  });

  it('이미지를 저장하고 같은 내용을 그대로 내보낸다', async () => {
    const url = await uploadObject({ buffer: PNG, objectKey: 'test/portfolios/1-sample.png', contentType: 'image/png' });

    expect(url).toMatch(/^\/api\/files\/[0-9a-f-]{36}$/);

    const response = await fetchStored(url);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toContain('immutable');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-disposition')).toBeNull();
    expect(Buffer.from(await response.arrayBuffer()).equals(PNG)).toBe(true);
  });

  it('이미지가 아닌 파일(HTML, SVG)은 실행되지 않도록 내려받기로만 내보낸다', async () => {
    const html = Buffer.from('<script>alert(1)</script>');
    const url = await uploadObject({ buffer: html, objectKey: 'test/chat/1/악성 파일.html', contentType: 'text/html' });
    const svgUrl = await uploadObject({ buffer: Buffer.from('<svg onload="alert(1)"/>'), objectKey: 'test/chat/1/a.svg', contentType: 'image/svg+xml' });

    const response = await fetchStored(url);
    expect(response.headers.get('content-type')).toBe('application/octet-stream');
    expect(response.headers.get('content-disposition')).toBe(
      `attachment; filename*=UTF-8''${encodeURIComponent('악성 파일.html')}`
    );
    expect((await fetchStored(svgUrl)).headers.get('content-type')).toBe('application/octet-stream');
  });

  it('2MB 를 넘는 파일은 저장하지 않는다', async () => {
    const big = Buffer.alloc(2 * 1024 * 1024 + 1);
    await expect(uploadObject({ buffer: big, objectKey: 'test/big.png', contentType: 'image/png' })).rejects.toMatchObject({
      code: 'FILE_TOO_LARGE',
    });
  });

  it('전체 용량 한도를 넘으면 저장을 거부한다', async () => {
    await uploadObject({ buffer: Buffer.alloc(600 * 1024), objectKey: 'test/fill-1.png', contentType: 'image/png' });
    process.env.STORAGE_DB_MAX_TOTAL_MB = '1';

    await expect(
      uploadObject({ buffer: Buffer.alloc(600 * 1024), objectKey: 'test/fill-2.png', contentType: 'image/png' })
    ).rejects.toMatchObject({ code: 'STORAGE_FULL' });
  });

  it('없는 파일과 형식이 틀린 id 는 404', async () => {
    const missing = await serveFile(new Request('http://localhost/api/files/x'), {
      params: Promise.resolve({ id: '00000000-0000-4000-8000-000000000000' }),
    });
    expect(missing.status).toBe(404);

    const invalid = await serveFile(new Request('http://localhost/api/files/x'), {
      params: Promise.resolve({ id: "1' OR '1'='1" }),
    });
    expect(invalid.status).toBe(404);
  });
});
