import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'designer') {
      return NextResponse.json(
        { success: false, error: '디자이너만 이미지를 업로드할 수 있습니다.' },
        { status: 403 }
      );
    }
    
    const formData = await request.formData();
    const files = formData.getAll('files');
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: '업로드할 파일이 없습니다.' },
        { status: 400 }
      );
    }
    
    const uploadedUrls = [];
    
    // public/uploads/portfolios 디렉토리 확인/생성
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'portfolios');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (err) {
      // 디렉토리가 이미 존재하면 무시
    }
    
    for (const file of files) {
      if (!file || typeof file === 'string') continue;
      
      // 파일 유효성 검사
      const fileSize = file.size;
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (fileSize > maxSize) {
        return NextResponse.json(
          { success: false, error: `파일 크기는 10MB를 초과할 수 없습니다: ${file.name}` },
          { status: 400 }
        );
      }
      
      // 허용된 파일 형식 체크
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: `지원하지 않는 파일 형식입니다: ${file.type}` },
          { status: 400 }
        );
      }
      
      // 파일명 생성 (타임스탬프 + 랜덤 문자열)
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = path.extname(file.name);
      const filename = `${timestamp}-${randomStr}${ext}`;
      
      // 파일 저장
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);
      
      // 웹에서 접근 가능한 URL 생성
      const fileUrl = `/uploads/portfolios/${filename}`;
      uploadedUrls.push(fileUrl);
    }
    
    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      message: `${uploadedUrls.length}개의 파일이 업로드되었습니다.`
    });
  } catch (error) {
    console.error('파일 업로드 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 파일 크기 제한 설정 (Next.js 13+)
export const config = {
  api: {
    bodyParser: false,
  },
};
