'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './PortfolioCreateForm.module.css';

const CATEGORIES = [
  '배너 디자인',
  '인스타그램 광고',
  '유튜브 썸네일',
  '카카오톡 광고',
  '네이버 블로그',
  '브랜딩',
  '기타'
];

export default function PortfolioCreateForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    thumbnail_url: '',
    images: []
  });
  
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploadProgress, setUploadProgress] = useState('');
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleImageFilesChange = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(prev => [...prev, ...files]);
    
    // 미리보기 생성
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };
  
  const handleImageRemove = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // 유효성 검사
      if (!formData.title.trim()) {
        throw new Error('제목을 입력해주세요.');
      }
      if (!formData.description.trim()) {
        throw new Error('설명을 입력해주세요.');
      }
      if (!formData.category) {
        throw new Error('카테고리를 선택해주세요.');
      }
      if (!formData.price || formData.price <= 0) {
        throw new Error('가격을 입력해주세요.');
      }
      if (!thumbnailFile) {
        throw new Error('썸네일 이미지를 선택해주세요.');
      }
      
      // 1단계: 썸네일 업로드
      setUploadProgress('썸네일 업로드 중...');
      const thumbnailFormData = new FormData();
      thumbnailFormData.append('files', thumbnailFile);
      
      const thumbnailResponse = await fetch('/api/upload', {
        method: 'POST',
        body: thumbnailFormData
      });
      
      const thumbnailData = await thumbnailResponse.json();
      
      if (!thumbnailData.success) {
        throw new Error(thumbnailData.error || '썸네일 업로드에 실패했습니다.');
      }
      
      const thumbnail_url = thumbnailData.urls[0];
      
      // 2단계: 추가 이미지 업로드 (있는 경우)
      let imageUrls = [];
      if (imageFiles.length > 0) {
        setUploadProgress(`추가 이미지 업로드 중... (${imageFiles.length}개)`);
        const imagesFormData = new FormData();
        imageFiles.forEach(file => {
          imagesFormData.append('files', file);
        });
        
        const imagesResponse = await fetch('/api/upload', {
          method: 'POST',
          body: imagesFormData
        });
        
        const imagesData = await imagesResponse.json();
        
        if (!imagesData.success) {
          throw new Error(imagesData.error || '추가 이미지 업로드에 실패했습니다.');
        }
        
        imageUrls = imagesData.urls;
      }
      
      // 3단계: 포트폴리오 등록
      setUploadProgress('포트폴리오 등록 중...');
      const portfolioData = {
        ...formData,
        thumbnail_url,
        images: imageUrls
      };
      
      const response = await fetch('/api/portfolios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(portfolioData)
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || '포트폴리오 등록에 실패했습니다.');
      }
      
      alert('포트폴리오가 등록되었습니다! 관리자 승인 후 공개됩니다.');
      router.push('/my-portfolios');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setUploadProgress('');
    }
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/my-portfolios" className={styles.backLink}>
          ← 뒤로 가기
        </Link>
        <h1 className={styles.title}>새 포트폴리오 등록</h1>
        <p className={styles.subtitle}>작품을 등록하고 광고주와 연결되세요</p>
      </div>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && (
          <div className={styles.error}>
            ⚠️ {error}
          </div>
        )}
        
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>기본 정보</h2>
          
          <div className={styles.field}>
            <label className={styles.label}>
              제목 <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="예: 고급스러운 브랜드 배너 디자인"
              className={styles.input}
              required
            />
          </div>
          
          <div className={styles.field}>
            <label className={styles.label}>
              카테고리 <span className={styles.required}>*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={styles.select}
              required
            >
              <option value="">카테고리 선택</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.field}>
            <label className={styles.label}>
              가격 <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="0"
              className={styles.input}
              min="0"
              step="1000"
              required
            />
            <p className={styles.hint}>단위: 원</p>
          </div>
          
          <div className={styles.field}>
            <label className={styles.label}>
              설명 <span className={styles.required}>*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="작품에 대한 자세한 설명을 입력해주세요..."
              className={styles.textarea}
              rows={6}
              required
            />
          </div>
        </div>
        
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>이미지</h2>
          
          <div className={styles.field}>
            <label className={styles.label}>
              썸네일 이미지 <span className={styles.required}>*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              className={styles.fileInput}
              required
            />
            <p className={styles.hint}>포트폴리오 대표 이미지 (최대 10MB, JPG/PNG/GIF/WebP)</p>
            
            {thumbnailPreview && (
              <div className={styles.imagePreview}>
                <img src={thumbnailPreview} alt="썸네일 미리보기" />
              </div>
            )}
          </div>
          
          <div className={styles.field}>
            <label className={styles.label}>추가 이미지</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageFilesChange}
              className={styles.fileInput}
            />
            <p className={styles.hint}>작품을 더 자세히 보여줄 추가 이미지 (최대 10MB, 여러 개 선택 가능)</p>
            
            {imagePreviews.length > 0 && (
              <div className={styles.imageGrid}>
                {imagePreviews.map((preview, index) => (
                  <div key={index} className={styles.imagePreviewItem}>
                    <img src={preview} alt={`이미지 ${index + 1}`} />
                    <button
                      type="button"
                      onClick={() => handleImageRemove(index)}
                      className={styles.removeImageButton}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {uploadProgress && (
          <div className={styles.uploadProgress}>
            <div className={styles.spinner}></div>
            <p>{uploadProgress}</p>
          </div>
        )}
        
        <div className={styles.actions}>
          <Link href="/my-portfolios" className={styles.cancelButton}>
            취소
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className={styles.submitButton}
          >
            {isLoading ? '등록 중...' : '포트폴리오 등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
