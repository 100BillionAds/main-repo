/**
 * API 요청을 처리하는 유틸리티 함수
 * @param {string} endpoint - API 엔드포인트
 * @param {Object} options - fetch 옵션
 * @returns {Promise} API 응답
 */
export async function fetcher(endpoint, options = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const url = `${baseUrl}${endpoint}`;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'An error occurred',
      }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * GET 요청
 */
export const apiGet = (endpoint) => fetcher(endpoint, { method: 'GET' });

/**
 * POST 요청
 */
export const apiPost = (endpoint, data) =>
  fetcher(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });

/**
 * PUT 요청
 */
export const apiPut = (endpoint, data) =>
  fetcher(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

/**
 * PATCH 요청
 */
export const apiPatch = (endpoint, data) =>
  fetcher(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

/**
 * DELETE 요청
 */
export const apiDelete = (endpoint) =>
  fetcher(endpoint, {
    method: 'DELETE',
  });
