import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { query } from '@/lib/db';

const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-2';
const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET || '';
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

const hasS3Config = Boolean(
  process.env.AWS_ACCESS_KEY_ID
  && process.env.AWS_SECRET_ACCESS_KEY
  && S3_BUCKET_NAME
);

const hasCloudinaryConfig = Boolean(
  CLOUDINARY_CLOUD_NAME
  && CLOUDINARY_API_KEY
  && CLOUDINARY_API_SECRET
);

const s3Client = hasS3Config
  ? new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

/**
 * DB 저장 방식 (STORAGE_PROVIDER=db)
 *
 * 파일을 외부 저장소가 아니라 DB 의 stored_files 테이블에 넣고, /api/files/<id> 로 내보낸다.
 * 가입할 서비스가 없어 시작하기 쉽지만, 파일이 DB 용량을 쓰고 이미지를 볼 때마다 서버를 거친다.
 * 그래서 파일 하나의 크기와 전체 용량에 한도를 둔다. 사용자가 늘면 cloudinary 나 s3 로 바꾼다
 * (이미 올라간 파일은 그대로 두고, 새 파일부터 바깥에 저장된다).
 */
const DB_MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB. DB 는 행 하나의 크기에 제한이 있다 (TiDB 기본 약 6MB)
const DEFAULT_DB_MAX_TOTAL_MB = 2048; // 무료 DB(5GiB)를 파일이 다 채우지 않게 한다

function getDbMaxTotalBytes() {
  const value = Number(process.env.STORAGE_DB_MAX_TOTAL_MB);
  const megabytes = Number.isFinite(value) && value > 0 ? value : DEFAULT_DB_MAX_TOTAL_MB;
  return megabytes * 1024 * 1024;
}

function createStorageError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function resolveStorageProvider() {
  const explicitProvider = (process.env.STORAGE_PROVIDER || '').trim().toLowerCase();
  if (explicitProvider) {
    return explicitProvider;
  }

  if (hasCloudinaryConfig) {
    return 'cloudinary';
  }

  if (hasS3Config) {
    return 's3';
  }

  return 'none';
}

function splitObjectKey(objectKey) {
  const normalizedKey = String(objectKey || '').replace(/^\/+/, '');
  const pathSegments = normalizedKey.split('/').filter(Boolean);
  const fileName = pathSegments.pop() || 'upload.bin';
  const folder = pathSegments.join('/');
  const publicId = fileName.replace(/\.[^/.]+$/, '');

  return { normalizedKey, folder, fileName, publicId };
}

function buildCloudinarySignature(params) {
  const signatureBase = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(`${signatureBase}${CLOUDINARY_API_SECRET}`)
    .digest('hex');
}

async function uploadWithCloudinary({ buffer, objectKey, contentType }) {
  if (!hasCloudinaryConfig) {
    throw createStorageError(
      'STORAGE_PROVIDER_MISCONFIGURED',
      'CLOUDINARY_* environment variables are required when STORAGE_PROVIDER=cloudinary.'
    );
  }

  const { folder, fileName, publicId } = splitObjectKey(objectKey);
  const timestamp = Math.floor(Date.now() / 1000);

  const signatureParams = {
    public_id: publicId,
    timestamp,
  };

  if (folder) {
    signatureParams.folder = folder;
  }

  const signature = buildCloudinarySignature(signatureParams);
  const formData = new FormData();

  formData.append('file', new Blob([buffer], { type: contentType || 'application/octet-stream' }), fileName);
  formData.append('api_key', CLOUDINARY_API_KEY);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('public_id', publicId);

  if (folder) {
    formData.append('folder', folder);
  }

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.secure_url) {
    const reason = payload?.error?.message || `status ${response.status}`;
    throw createStorageError('CLOUDINARY_UPLOAD_FAILED', `Cloudinary upload failed: ${reason}`);
  }

  return payload.secure_url;
}

async function uploadWithS3({ buffer, objectKey, contentType }) {
  if (!hasS3Config || !s3Client) {
    throw createStorageError(
      'STORAGE_PROVIDER_MISCONFIGURED',
      'AWS_* environment variables are required when STORAGE_PROVIDER=s3.'
    );
  }

  await s3Client.send(new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: objectKey,
    Body: buffer,
    ContentType: contentType,
  }));

  const encodedKey = String(objectKey)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${encodedKey}`;
}

async function uploadWithDatabase({ buffer, objectKey, contentType }) {
  if (buffer.length > DB_MAX_FILE_BYTES) {
    throw createStorageError('FILE_TOO_LARGE', `파일 크기는 ${DB_MAX_FILE_BYTES / 1024 / 1024}MB 를 초과할 수 없습니다.`);
  }

  const [usage] = await query('SELECT COALESCE(SUM(size_bytes), 0) AS total FROM stored_files');
  if (Number(usage.total) + buffer.length > getDbMaxTotalBytes()) {
    throw createStorageError('STORAGE_FULL', '파일 저장 공간이 가득 찼습니다.');
  }

  // 주소를 추측할 수 없도록 무작위 UUID 를 id 로 쓴다.
  const id = crypto.randomUUID();
  await query('INSERT INTO stored_files (id, object_key, content_type, size_bytes, data) VALUES (?, ?, ?, ?, ?)', [
    id,
    String(objectKey).slice(0, 255),
    String(contentType || 'application/octet-stream').slice(0, 100),
    buffer.length,
    buffer,
  ]);

  return `/api/files/${id}`;
}

/** /api/files/<id> 가 내보낼 파일을 읽는다. 없으면 null. */
export async function readStoredFile(id) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(String(id))) return null;
  const [row] = await query('SELECT object_key, content_type, size_bytes, data FROM stored_files WHERE id = ?', [id]);
  if (!row) return null;
  return {
    fileName: String(row.object_key).split('/').pop(),
    contentType: row.content_type,
    size: Number(row.size_bytes),
    data: row.data,
  };
}

/**
 * 지금 저장 방식에서 받을 수 있는 파일 크기. 라우트의 한도(requested)보다 저장소 한도가 작으면 그쪽을 따른다.
 */
export function getMaxUploadBytes(requested) {
  return resolveStorageProvider() === 'db' ? Math.min(requested, DB_MAX_FILE_BYTES) : requested;
}

export function getStorageProvider() {
  return resolveStorageProvider();
}

export async function uploadObject({ buffer, objectKey, contentType }) {
  if (!buffer || !objectKey) {
    throw createStorageError('UPLOAD_INPUT_INVALID', 'buffer and objectKey are required.');
  }

  const provider = resolveStorageProvider();

  if (provider === 'cloudinary') {
    return uploadWithCloudinary({ buffer, objectKey, contentType });
  }

  if (provider === 's3') {
    return uploadWithS3({ buffer, objectKey, contentType });
  }

  if (provider === 'db') {
    return uploadWithDatabase({ buffer, objectKey, contentType });
  }

  if (provider === 'none') {
    throw createStorageError(
      'STORAGE_NOT_CONFIGURED',
      'No storage provider configured. Set STORAGE_PROVIDER=db, or CLOUDINARY_* / AWS_* variables.'
    );
  }

  throw createStorageError(
    'STORAGE_PROVIDER_UNSUPPORTED',
    `Unsupported STORAGE_PROVIDER value: ${provider}`
  );
}
