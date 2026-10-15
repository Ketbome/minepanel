jest.mock('axios', () => ({ __esModule: true, default: { request: jest.fn() } }));

import axios from 'axios';
import { PanelApi, PanelApiError } from './panel-api';

describe('PanelApi', () => {
  const request = axios.request as jest.Mock;
  const api = new PanelApi('http://127.0.0.1:8091/panel', 'mp_token');

  beforeEach(() => request.mockReset());

  it('calls the panel with the bearer token and parses JSON', async () => {
    request.mockResolvedValue({ status: 200, data: '{"ok":true}' });

    expect(await api.request({ method: 'POST', path: '/servers/a/start', query: { x: 1 }, body: { y: 2 } })).toEqual({ ok: true });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: 'http://127.0.0.1:8091/panel', url: '/servers/a/start', method: 'POST', params: { x: 1 }, data: { y: 2 }, headers: { Authorization: 'Bearer mp_token' } }),
    );
    const { transformResponse, validateStatus } = request.mock.calls[0][0];
    expect(transformResponse('raw')).toBe('raw');
    expect(validateStatus(500)).toBe(true);
  });

  it('returns text and empty bodies as they are', async () => {
    request.mockResolvedValue({ status: 200, data: 'plain log' });
    expect(await api.request({ method: 'GET', path: '/x' })).toBe('plain log');
    request.mockResolvedValue({ status: 204, data: '' });
    expect(await api.request({ method: 'DELETE', path: '/x' })).toBeNull();
  });

  it('turns error statuses into PanelApiError with the API message', async () => {
    request.mockResolvedValue({ status: 403, data: '{"message":"You do not have access to this server"}' });
    await expect(api.request({ method: 'GET', path: '/x' })).rejects.toEqual(new PanelApiError(403, '403: You do not have access to this server'));

    request.mockResolvedValue({ status: 400, data: '{"message":["a","b"]}' });
    await expect(api.request({ method: 'GET', path: '/x' })).rejects.toThrow('400: a; b');

    request.mockResolvedValue({ status: 502, data: '' });
    await expect(api.request({ method: 'GET', path: '/x' })).rejects.toThrow('502: Request failed');
  });
});
