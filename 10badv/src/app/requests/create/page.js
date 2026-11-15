'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
// [AI 초안 작성 숨김] import { readSse } from '@/lib/sse';
// [AI 초안 작성 숨김] import { parseDraft } from '@/domain/ai/requestDraft';
import styles from './CreateRequestPage.module.css';

export default function CreateRequestPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    budget: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  // ── AI 초안 작성 기능은 잠시 숨겨 둔다. 다시 켜려면 이 파일의 [AI 초안 작성 숨김] 주석 3곳을 푼다. ──
  // const [brief, setBrief] = useState('');
  // const [drafting, setDrafting] = useState(false);
  // const [draftError, setDraftError] = useState('');
  //
  // // AI 초안: 서버가 글자를 보내는 대로(SSE) 제목·설명 칸에 채워 넣는다.
  // const handleDraft = async () => {
  //   if (!session) {
  //     alert('로그인이 필요합니다.');
  //     router.push('/login');
  //     return;
  //   }
  //
  //   setDrafting(true);
  //   setDraftError('');
  //   try {
  //     const response = await fetch('/api/ai/request-draft', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ brief, category: formData.category, budget: formData.budget }),
  //     });
  //
  //     // 입력 오류·한도 초과는 스트림이 시작되기 전에 일반 JSON 으로 온다.
  //     if (!response.ok) {
  //       const data = await response.json().catch(() => ({}));
  //       throw new Error(data.error || 'AI 초안 작성에 실패했습니다.');
  //     }
  //
  //     let text = '';
  //     for await (const { event, data } of readSse(response)) {
  //       const payload = JSON.parse(data);
  //       if (event === 'error') throw new Error(payload.error);
  //
  //       if (event === 'delta') text += payload.text;
  //       const draft = event === 'done' ? payload : parseDraft(text);
  //       setFormData((prev) => ({
  //         ...prev,
  //         title: draft.title || prev.title,
  //         description: draft.description || prev.description,
  //       }));
  //     }
  //   } catch (error) {
  //     setDraftError(error.message || 'AI 초안 작성에 실패했습니다.');
  //   } finally {
  //     setDrafting(false);
  //   }
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!session) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }

    if (!formData.title || !formData.description) {
      alert('제목과 설명을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        alert('의뢰가 등록되었습니다!');
        router.push(`/requests/${data.id}`);
      } else {
        const error = await response.json();
        alert(error.error || '의뢰 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('의뢰 등록 오류:', error);
      alert('의뢰 등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && formData.tags.length < 10) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (index) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index)
    });
  };

  const categories = [
    '치킨집', '커피숍', '음식점', '미용실', '네일샵',
    '병원', '약국', '편의점', '주점', '기타'
  ];

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>✍️ 디자인 의뢰하기</h1>
          <p className={styles.subtitle}>
            디자이너에게 원하는 간판 디자인을 의뢰하세요
          </p>
        </div>

        {/* [AI 초안 작성 숨김] 다시 켜려면 이 주석 블록을 푼다.
        <section className={styles.aiPanel}>
          <h2 className={styles.aiTitle}>🤖 AI로 초안 작성</h2>
          <p className={styles.aiHint}>
            원하는 간판을 한두 줄로 적으면 의뢰서 형태로 다듬어 드립니다. 결과는 아래 칸에 채워지며, 등록 전에 자유롭게 고칠 수 있습니다.
          </p>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="예: 동네 카페 간판. 따뜻하고 아늑한 느낌, 나무 소재, 밤에도 잘 보였으면 좋겠어요."
            className={styles.textarea}
            rows={3}
            maxLength={500}
            disabled={drafting}
          />
          <div className={styles.aiActions}>
            <span className={styles.aiCount}>{brief.length} / 500</span>
            <button
              type="button"
              onClick={handleDraft}
              className={styles.addTagButton}
              disabled={drafting || brief.trim().length < 10}
            >
              {drafting ? '작성 중...' : '초안 작성'}
            </button>
          </div>
          {draftError && <p className={styles.aiError} role="alert">{draftError}</p>}
        </section>
        */}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>제목 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="예: 카페 간판 디자인 의뢰합니다"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>업종</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={styles.select}
            >
              <option value="">업종 선택</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>상세 설명 *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="원하는 디자인 스타일, 색상, 크기 등을 자세히 설명해주세요"
              className={styles.textarea}
              rows={8}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>예산</label>
            <input
              type="number"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              placeholder="예: 500000 (비워두면 '협의'로 표시됩니다)"
              className={styles.input}
              min="0"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>태그 (최대 10개)</label>
            <div className={styles.tagInputContainer}>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="태그 입력 후 Enter"
                className={styles.input}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className={styles.addTagButton}
              >
                추가
              </button>
            </div>
            <div className={styles.tagList}>
              {formData.tags.map((tag, index) => (
                <span key={index} className={styles.tag}>
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(index)}
                    className={styles.removeTag}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className={styles.buttonGroup}>
            <button
              type="button"
              onClick={() => router.back()}
              className={styles.cancelButton}
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? '등록 중...' : '의뢰 등록하기'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
