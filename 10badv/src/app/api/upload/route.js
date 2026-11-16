import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { v4 as uuidv4 } from 'uuid';
import { checkRateLimit } from '@/lib/rateLimit';
import { getMaxUploadBytes, uploadObject } from '@/lib/storage';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

const megabytes = (bytes) => `${Math.round((bytes / 1024 / 1024) * 10) / 10}MB`;

export async function POST(request) {
  try {
    // Rate Limiting: 분당 30회 (S3 비용 방지)
    const { allowed, headers: rlHeaders } = await checkRateLimit(request, { name: 'upload', limit: 30, windowMs: 60 * 1000 });
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: '업로드 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: rlHeaders }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const files = formData.getAll('files');
    const type = formData.get('type') || 'portfolio';

    // 단일 파일 업로드 (아바타 등)
    if (file && typeof file !== 'string') {
      // 포트폴리오 이미지는 디자이너만
      if (type === 'portfolio' && session.user.role !== 'designer') {
        return NextResponse.json({ success: false, error: '디자이너만 포트폴리오 이미지를 업로드할 수 있습니다.' }, { status: 403 });
      }

      // 저장 방식에 따라 한도가 더 작을 수 있다 (DB 저장은 2MB)
      const maxSize = getMaxUploadBytes(type === 'avatar' ? 5 * 1024 * 1024 : 10 * 1024 * 1024);
      if (file.size > maxSize) {
        return NextResponse.json(
          { success: false, error: `파일 크기는 ${megabytes(maxSize)}를 초과할 수 없습니다.` },
          { status: 400 }
        );
      }

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: `지원하지 않는 파일 형식입니다: ${file.type}` },
          { status: 400 }
        );
      }

      const ext = file.name.split('.').pop();
      const folder = type === 'avatar' ? 'avatars' : 'portfolios';
      const key = `uploads/${folder}/${session.user.id}-${uuidv4()}.${ext}`;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileUrl = await uploadObject({
        buffer,
        objectKey: key,
        contentType: file.type,
      });

      return NextResponse.json({
        success: true,
        url: fileUrl,
        message: '파일이 업로드되었습니다.',
      });
    }

    // 다중 파일 업로드 (포트폴리오)
    if (files && files.length > 0 && typeof files[0] !== 'string') {
      if (session.user.role !== 'designer') {
        return NextResponse.json({ success: false, error: '디자이너만 포트폴리오 이미지를 업로드할 수 있습니다.' }, { status: 403 });
      }

      const uploadedUrls = [];

      for (const f of files) {
        if (!f || typeof f === 'string') continue;

        const maxSize = getMaxUploadBytes(10 * 1024 * 1024);
        if (f.size > maxSize) {
          return NextResponse.json(
            { success: false, error: `파일 크기는 ${megabytes(maxSize)}를 초과할 수 없습니다: ${f.name}` },
            { status: 400 }
          );
        }

        if (!ALLOWED_IMAGE_TYPES.includes(f.type)) {
          return NextResponse.json(
            { success: false, error: `지원하지 않는 파일 형식입니다: ${f.type}` },
            { status: 400 }
          );
        }

        const ext = f.name.split('.').pop();
        const key = `uploads/portfolios/${session.user.id}-${uuidv4()}.${ext}`;

        const bytes = await f.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadedUrl = await uploadObject({
          buffer,
          objectKey: key,
          contentType: f.type,
        });

        uploadedUrls.push(uploadedUrl);
      }

      return NextResponse.json({
        success: true,
        urls: uploadedUrls,
        message: `${uploadedUrls.length}개의 파일이 업로드되었습니다.`,
      });
    }

    return NextResponse.json({ success: false, error: '업로드할 파일이 없습니다.' }, { status: 400 });
  } catch (error) {
    console.error('파일 업로드 실패:', error);

    if (error?.code === 'FILE_TOO_LARGE') {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (error?.code === 'STORAGE_FULL') {
      return NextResponse.json({ success: false, error: error.message }, { status: 507 });
    }

    if (
      error?.code === 'STORAGE_NOT_CONFIGURED'
      || error?.code === 'STORAGE_PROVIDER_MISCONFIGURED'
      || error?.code === 'STORAGE_PROVIDER_UNSUPPORTED'
    ) {
      return NextResponse.json(
        { success: false, error: '파일 저장소 설정이 필요합니다. STORAGE_PROVIDER 환경변수를 확인해주세요.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: false, error: '파일 업로드에 실패했습니다.' }, { status: 500 });
  }
}
