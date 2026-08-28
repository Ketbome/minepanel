import axios from 'axios';
import * as fs from 'fs-extra';
import * as os from 'node:os';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { BadRequestException, HttpStatus, PayloadTooLargeException } from '@nestjs/common';
import { WorldDiscoveryService } from './world-discovery.service';

jest.mock('axios');

describe('WorldDiscoveryService imports', () => {
  let tempDir: string;
  let libraryPath: string;
  let service: WorldDiscoveryService;
  let getCfApiKey: jest.Mock;
  const mockClient = { get: jest.fn() };

  const streamResponse = (content: string, headers: Record<string, string> = {}) => ({ data: Readable.from([Buffer.from(content)]), headers });

  beforeEach(async () => {
    jest.clearAllMocks();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'minepanel-world-import-'));
    libraryPath = path.join(tempDir, '.world', 'worlds');
    getCfApiKey = jest.fn().mockResolvedValue('cf-key');
    (axios.create as jest.Mock).mockReturnValue(mockClient);
    (axios.isAxiosError as unknown as jest.Mock).mockImplementation((error) => !!error?.isAxiosError);
    service = new WorldDiscoveryService({ getCfApiKey } as any, { get: jest.fn((key: string) => (key === 'serversDir' ? tempDir : undefined)) } as any);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('searchCurseForgeWorlds', () => {
    it('normalizes results and clamps paging', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          data: [
            { id: 1, name: 'Sky', slug: 'sky', summary: 's', downloadCount: 5, logo: { thumbnailUrl: 't' }, latestFiles: [{ id: 9, fileName: 'sky.jar', downloadUrl: 'u' }, { id: 10, fileName: 'sky.zip', downloadUrl: 'u' }] },
            { id: 2, name: 'NoFile', slug: 'nofile', logo: { url: 'u2' }, latestFiles: [{ id: 11, fileName: 'x.zip' }] },
          ],
          pagination: { totalCount: 50 },
        },
      });

      const result = await service.searchCurseForgeWorlds(1, { q: 'sky', pageSize: 100, index: -5 });

      expect(mockClient.get).toHaveBeenCalledWith('/mods/search', { params: expect.objectContaining({ classId: 17, searchFilter: 'sky', pageSize: 30, index: 0 }) });
      expect(result.data).toEqual([
        { provider: 'curseforge', projectId: '1', name: 'Sky', summary: 's', slug: 'sky', downloads: 5, iconUrl: 't', fileId: 10, fileName: 'sky.zip', importable: true },
        { provider: 'curseforge', projectId: '2', name: 'NoFile', summary: '', slug: 'nofile', downloads: undefined, iconUrl: 'u2', fileId: undefined, fileName: undefined, importable: false },
      ]);
      expect(result.pagination).toEqual({ index: 0, pageSize: 30, resultCount: 2, totalCount: 50 });
    });

    it('maps CurseForge errors', async () => {
      const axiosError = (status: number, message?: string) => Object.assign(new Error('http'), { isAxiosError: true, response: { status, data: message ? { message } : undefined } });
      mockClient.get.mockRejectedValueOnce(axiosError(403));
      await expect(service.searchCurseForgeWorlds(1, {})).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
      mockClient.get.mockRejectedValueOnce(axiosError(429, 'slow'));
      await expect(service.searchCurseForgeWorlds(1, {})).rejects.toMatchObject({ status: 429, message: 'slow' });
      mockClient.get.mockRejectedValueOnce(new Error('x'));
      await expect(service.searchCurseForgeWorlds(1, {})).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
    });
  });

  describe('getCurseForgeWorldDetails', () => {
    it('validates the id and maps the project', async () => {
      await expect(service.getCurseForgeWorldDetails(1, 'abc')).rejects.toThrow('Invalid projectId');

      mockClient.get.mockResolvedValue({ data: { data: { id: 3, name: 'W', slug: 'w', downloadCount: 1, logo: { url: 'l' }, links: { websiteUrl: 'https://cf/w' }, screenshots: [{ thumbnailUrl: 'a' }, { url: 'b' }, {}] } } });
      expect(await service.getCurseForgeWorldDetails(1, '3')).toEqual({ provider: 'curseforge', projectId: '3', name: 'W', summary: '', slug: 'w', downloads: 1, iconUrl: 'l', websiteUrl: 'https://cf/w', screenshots: ['a', 'b'] });

      mockClient.get.mockRejectedValueOnce(new Error('x'));
      await expect(service.getCurseForgeWorldDetails(1, '3')).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
    });
  });

  describe('importFromCurseForge', () => {
    it('validates the project id and file availability', async () => {
      await expect(service.importFromCurseForge(1, { projectId: '0' })).rejects.toThrow('Invalid projectId');

      mockClient.get.mockResolvedValueOnce({ data: { data: { latestFiles: [{ id: 1, fileName: 'x.jar', downloadUrl: 'u' }] } } });
      await expect(service.importFromCurseForge(1, { projectId: '5' })).rejects.toThrow('No importable archive');

      mockClient.get.mockResolvedValueOnce({ data: { data: { id: 2, fileName: 'w.zip' } } });
      await expect(service.importFromCurseForge(1, { projectId: '5', fileId: 2 })).rejects.toThrow('downloadable file URL');
    });

    it('downloads the archive into the curseforge folder', async () => {
      mockClient.get.mockResolvedValueOnce({ data: { data: { id: 2, fileName: 'My World!.zip', downloadUrl: 'https://mediafiles.forgecdn.net/files/w.zip' } } });
      (axios.get as jest.Mock).mockResolvedValue(streamResponse('zip-bytes', { 'content-length': '9' }));

      const result = await service.importFromCurseForge(1, { projectId: '5', fileId: 2, targetFolder: ' adventure/../ maps ' });

      expect(result).toMatchObject({ success: true, provider: 'curseforge', source: 'remote', projectId: '5', fileId: 2, fileName: 'My World-.zip', bytes: 9 });
      // `..` segments are normalized away inside the provider folder.
      expect(result.filePath).toBe('curseforge/maps/My World-.zip');
      expect(await fs.readFile(path.join(libraryPath, 'curseforge', 'maps', 'My World-.zip'), 'utf8')).toBe('zip-bytes');
    });

    it('rejects download hosts outside the CurseForge CDN', async () => {
      mockClient.get.mockResolvedValueOnce({ data: { data: { latestFiles: [{ id: 2, fileName: 'w.zip', downloadUrl: 'https://evil.example.com/w.zip' }] } } });
      await expect(service.importFromCurseForge(1, { projectId: '5' })).rejects.toThrow('not allowed for CurseForge');
    });
  });

  describe('importFromUrl', () => {
    it('validates the url and archive type', async () => {
      await expect(service.importFromUrl({ downloadUrl: '' })).rejects.toThrow('downloadUrl is required');
      await expect(service.importFromUrl({ downloadUrl: 'not a url' })).rejects.toThrow('Invalid download URL');
      await expect(service.importFromUrl({ downloadUrl: 'http://example.com/w.zip' })).rejects.toThrow('Only HTTPS');
      await expect(service.importFromUrl({ downloadUrl: 'https://localhost/w.zip' })).rejects.toThrow('host is not allowed');
      await expect(service.importFromUrl({ downloadUrl: 'https://10.0.0.5/w.zip' })).rejects.toThrow('host is not allowed');
      await expect(service.importFromUrl({ downloadUrl: 'https://192.168.1.2/w.zip' })).rejects.toThrow('host is not allowed');
      await expect(service.importFromUrl({ downloadUrl: 'https://172.20.0.1/w.zip' })).rejects.toThrow('host is not allowed');
      await expect(service.importFromUrl({ downloadUrl: 'https://127.0.0.1/w.zip' })).rejects.toThrow('host is not allowed');
      await expect(service.importFromUrl({ downloadUrl: 'https://[::1]/w.zip' })).rejects.toThrow('host is not allowed');
      await expect(service.importFromUrl({ downloadUrl: 'https://[::]/w.zip' })).rejects.toThrow('host is not allowed');
      await expect(service.importFromUrl({ downloadUrl: 'https://[fd00::1]/w.zip' })).rejects.toThrow('host is not allowed');
      await expect(service.importFromUrl({ downloadUrl: 'https://[fe80::1]/w.zip' })).rejects.toThrow('host is not allowed');
      await expect(service.importFromUrl({ downloadUrl: 'https://[::ffff:127.0.0.1]/w.zip' })).rejects.toThrow('host is not allowed');
      await expect(service.importFromUrl({ downloadUrl: 'https://[::ffff:10.1.2.3]/w.zip' })).rejects.toThrow('host is not allowed');
      await expect(service.importFromUrl({ downloadUrl: 'https://example.com/readme.txt' })).rejects.toThrow('Only ZIP/TAR/TGZ');
      await expect(service.importFromUrl({ downloadUrl: 'https://example.com/w.zip', targetFolder: '../../escape' })).rejects.toThrow('Invalid target folder');
    });

    it('infers the file name from the url and numbers duplicates', async () => {
      (axios.get as jest.Mock).mockResolvedValue(streamResponse('a'));
      const first = await service.importFromUrl({ downloadUrl: 'https://8.8.8.8/maps/My%20Map.tar.gz' });
      (axios.get as jest.Mock).mockResolvedValue(streamResponse('b'));
      const second = await service.importFromUrl({ downloadUrl: 'https://[2001:db8::1]/maps/My%20Map.tar.gz' });

      expect(first.filePath).toBe('url/My Map.tar.gz');
      expect(second.filePath).toBe('url/My Map.tar (1).gz');

      (axios.get as jest.Mock).mockResolvedValue(streamResponse('c'));
      const named = await service.importFromUrl({ downloadUrl: 'https://example.com/download?id=1', fileName: '...weird name.zip' });
      expect(named.fileName).toBe('weird name.zip');
    });

    it('rejects archives that are too large and cleans up failed downloads', async () => {
      (axios.get as jest.Mock).mockResolvedValue(streamResponse('x', { 'content-length': String(2 * 1024 * 1024 * 1024) }));
      await expect(service.importFromUrl({ downloadUrl: 'https://example.com/w.zip' })).rejects.toThrow(PayloadTooLargeException);

      (axios.get as jest.Mock).mockRejectedValue(new Error('network'));
      await expect(service.importFromUrl({ downloadUrl: 'https://example.com/w.zip' })).rejects.toThrow(BadRequestException);
      expect(await fs.pathExists(path.join(libraryPath, 'url', 'w.zip.part'))).toBe(false);
    });
  });
});
