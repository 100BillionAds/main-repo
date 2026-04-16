import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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

  if (provider === 'none') {
    throw createStorageError(
      'STORAGE_NOT_CONFIGURED',
      'No object storage provider configured. Set CLOUDINARY_* for free tier usage.'
    );
  }

  throw createStorageError(
    'STORAGE_PROVIDER_UNSUPPORTED',
    `Unsupported STORAGE_PROVIDER value: ${provider}`
  );
}
