import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';

// fetch를 모킹
global.fetch = jest.fn();

describe('API 유틸리티 함수', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('apiGet', () => {
    it('GET 요청을 성공적으로 처리한다', async () => {
      const mockData = { success: true, data: [] };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await apiGet('/api/test');
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('에러를 처리한다', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      });

      await expect(apiGet('/api/test')).rejects.toThrow();
    });
  });

  describe('apiPost', () => {
    it('POST 요청을 성공적으로 처리한다', async () => {
      const mockData = { success: true };
      const postData = { title: 'Test' };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await apiPost('/api/test', postData);
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
        })
      );
    });
  });

  describe('apiPut', () => {
    it('PUT 요청을 성공적으로 처리한다', async () => {
      const mockData = { success: true };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      await apiPut('/api/test', { data: 'test' });
      expect(fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });
  });

  describe('apiDelete', () => {
    it('DELETE 요청을 성공적으로 처리한다', async () => {
      const mockData = { success: true };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      await apiDelete('/api/test');
      expect(fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });
});
