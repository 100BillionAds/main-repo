import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const formData = await request.formData();
    const file = formData.get('file');
    const files = formData.getAll('files');
    const type = formData.get('type') || 'portfolio'; // 기본값은 portfolio
    
    // 단일 파일 (아바타)
    if (file && !files.length) {
      console.log('📤 단일 파일 업로드 요청:', { type, hasFile: !!file, fileType: file?.type, fileSize: file?.size });
      
      if (typeof file === 'string') {
        return NextResponse.json(
          { success: false, error: '업로드할 파일이 없습니다.' },
          { status: 400 }
        );
      }
      
      // 아바타 업로드는 모든 사용자 가능, 포트폴리오는 디자이너만
      if (type === 'portfolio' && session.user.role !== 'designer') {
        return NextResponse.json(
          { success: false, error: '디자이너만 포트폴리오 이미지를 업로드할 수 있습니다.' },
          { status: 403 }
        );
      }
      
      const uploadDir = path.join(
        process.cwd(), 
        'public', 
        'uploads', 
        type === 'avatar' ? 'avatars' : 'portfolios'
      );
      
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (err) {
        // 디렉토리가 이미 존재하면 무시
      }
      
      const fileSize = file.size;
      const maxSize = type === 'avatar' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
      
      if (fileSize > maxSize) {
        return NextResponse.json(
          { success: false, error: `파일 크기는 ${type === 'avatar' ? '5MB' : '10MB'}를 초과할 수 없습니다.` },
          { status: 400 }
        );
      }
      
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: `지원하지 않는 파일 형식입니다: ${file.type}` },
          { status: 400 }
        );
      }
      
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = path.extname(file.name);
      const filename = `${session.user.id}-${timestamp}-${randomStr}${ext}`;
      
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);
      
      console.log('✅ 단일 파일 업로드 성공:', filename);
      
      const fileUrl = `/uploads/${type === 'avatar' ? 'avatars' : 'portfolios'}/${filename}`;
      
      return NextResponse.json({
        success: true,
        url: fileUrl,
        message: '파일이 업로드되었습니다.'
      });
    }
    
    // 다중 파일 (포트폴리오)
    if (files && files.length > 0) {
      console.log('📤 다중 파일 업로드 요청:', { type, fileCount: files.length });
      
      // 포트폴리오 업로드는 디자이너만 가능
      if (session.user.role !== 'designer') {
        return NextResponse.json(
          { success: false, error: '디자이너만 포트폴리오 이미지를 업로드할 수 있습니다.' },
          { status: 403 }
        );
      }
      
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'portfolios');
      
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (err) {
        // 디렉토리가 이미 존재하면 무시
      }
      
      const uploadedUrls = [];
      
      for (const file of files) {
        if (!file || typeof file === 'string') continue;
        
        const fileSize = file.size;
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (fileSize > maxSize) {
          return NextResponse.json(
            { success: false, error: `파일 크기는 10MB를 초과할 수 없습니다: ${file.name}` },
            { status: 400 }
          );
        }
        
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          return NextResponse.json(
            { success: false, error: `지원하지 않는 파일 형식입니다: ${file.type}` },
            { status: 400 }
          );
        }
        
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const ext = path.extname(file.name);
        const filename = `${session.user.id}-${timestamp}-${randomStr}${ext}`;
        
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);
        
        const fileUrl = `/uploads/portfolios/${filename}`;
        uploadedUrls.push(fileUrl);
      }
      
      console.log(`✅ ${uploadedUrls.length}개 파일 업로드 성공`);
      
      return NextResponse.json({
        success: true,
        urls: uploadedUrls,
        message: `${uploadedUrls.length}개의 파일이 업로드되었습니다.`
      });
    }
    
    // 파일이 없는 경우
    return NextResponse.json(
      { success: false, error: '업로드할 파일이 없습니다.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('파일 업로드 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
