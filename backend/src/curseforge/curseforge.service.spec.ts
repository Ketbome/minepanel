import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { CurseforgeService } from './curseforge.service';

jest.mock('axios');

describe('CurseforgeService', () => {
  let service: CurseforgeService;
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.create as jest.Mock).mockReturnValue(mockClient);
    service = new CurseforgeService();
  });

  it('searchMods should return normalized compatible results', async () => {
    mockClient.get.mockResolvedValue({
      data: {
        data: [
          {
            id: 100,
            slug: 'fabric-api',
            name: 'Fabric API',
            summary: 'Core library',
            downloadCount: 1500000,
            dateModified: '2026-02-01T00:00:00Z',
            logo: { thumbnailUrl: 'https://example.com/fabric.png' },
            latestFiles: [{ gameVersions: ['1.20.1', 'Fabric'] }],
          },
          {
            id: 101,
            slug: 'old-mod',
            name: 'Old Mod',
            summary: 'Old',
            downloadCount: 1000,
            dateModified: '2025-01-01T00:00:00Z',
            logo: { thumbnailUrl: 'https://example.com/old.png' },
            latestFiles: [{ gameVersions: ['1.19.4', 'Forge'] }],
          },
        ],
        pagination: {
          totalCount: 2,
        },
      },
    });

    const result = await service.searchMods('api-key', {
      minecraftVersion: '1.20.1',
      loader: 'fabric',
      pageSize: 20,
      index: 0,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      provider: 'curseforge',
      projectId: '100',
      slug: 'fabric-api',
      supportedLoaders: ['fabric'],
    });
    expect(result.pagination.resultCount).toBe(1);
  });

  it('searchMods should keep mods whose 1.20.1 files are only listed in latestFilesIndexes', async () => {
    mockClient.get.mockResolvedValue({
      data: {
        data: [
          {
            id: 200,
            slug: 'jade',
            name: 'Jade',
            summary: 'Tooltips',
            downloadCount: 90000000,
            dateModified: '2026-06-01T00:00:00Z',
            logo: { thumbnailUrl: 'https://example.com/jade.png' },
            // Newest uploads target 1.21.x only.
            latestFiles: [{ gameVersions: ['1.21.4', 'NeoForge'] }],
            latestFilesIndexes: [
              { gameVersion: '1.21.4', fileId: 3, modLoader: 6 },
              { gameVersion: '1.20.1', fileId: 2, modLoader: 4 },
              { gameVersion: '1.20.1', fileId: 1, modLoader: 1 },
            ],
          },
        ],
        pagination: { totalCount: 1 },
      },
    });

    const result = await service.searchMods('api-key', {
      minecraftVersion: '1.20.1',
      loader: 'fabric',
      pageSize: 9,
      index: 0,
    });

    expect(mockClient.get).toHaveBeenCalledWith(
      '/mods/search',
      expect.objectContaining({
        params: expect.objectContaining({
          gameVersion: '1.20.1',
          modLoaderType: 4,
          pageSize: 9,
          index: 0,
        }),
      }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ slug: 'jade' });
    expect(result.data[0].supportedVersions).toContain('1.20.1');
    expect(result.data[0].supportedLoaders).toEqual(
      expect.arrayContaining(['fabric', 'forge', 'neoforge']),
    );
  });

  it('searchMods should retry a slug-looking query as an exact slug lookup', async () => {
    mockClient.get
      .mockResolvedValueOnce({ data: { data: [], pagination: { totalCount: 0 } } })
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 300,
              slug: 'moogs-end-structures',
              name: "Moog's End Structures",
              summary: 'Structures',
              downloadCount: 1200,
              dateModified: '2026-01-01T00:00:00Z',
              logo: { thumbnailUrl: 'https://example.com/moogs.png' },
              latestFilesIndexes: [{ gameVersion: '1.20.1', fileId: 8043172, modLoader: 4 }],
            },
          ],
          pagination: { totalCount: 1 },
        },
      });

    const result = await service.searchMods('api-key', {
      q: 'moogs-end-structures',
      minecraftVersion: '1.20.1',
      loader: 'fabric',
    });

    expect(mockClient.get).toHaveBeenLastCalledWith(
      '/mods/search',
      expect.objectContaining({
        params: expect.objectContaining({ slug: 'moogs-end-structures' }),
      }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ projectId: '300', slug: 'moogs-end-structures' });
  });

  it('searchMods should fail with missing api key', async () => {
    await expect(
      service.searchMods('', {
        minecraftVersion: '1.20.1',
      }),
    ).rejects.toBeInstanceOf(HttpException);

    await expect(
      service.searchMods('', {
        minecraftVersion: '1.20.1',
      }),
    ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
  });

  it('searchMods should map 403 errors to forbidden', async () => {
    mockClient.get.mockRejectedValue({
      response: { status: 403 },
    });
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

    await expect(
      service.searchMods('bad-key', {
        minecraftVersion: '1.20.1',
      }),
    ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
  });
  describe('modpacks', () => {
    const axiosError = (status: number, message?: string) => {
      const error: any = new Error('http');
      error.isAxiosError = true;
      error.response = { status, data: message ? { message } : undefined };
      return error;
    };

    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      (axios.isAxiosError as unknown as jest.Mock).mockImplementation((error) => !!error?.isAxiosError);
    });

    it('searchModpacks requires an api key and forwards params', async () => {
      await expect(service.searchModpacks('')).rejects.toThrow(HttpException);

      mockClient.get.mockResolvedValue({ data: { data: [], pagination: {} } });
      await service.searchModpacks('key', 'atm', 5, 10, 4, 'asc');
      expect(mockClient.get).toHaveBeenCalledWith('/mods/search', {
        params: expect.objectContaining({ classId: 4471, searchFilter: 'atm', pageSize: 5, index: 10, sortField: 4, sortOrder: 'asc' }),
      });
    });

    it('searchModpacks maps axios and generic errors', async () => {
      mockClient.get.mockRejectedValueOnce(axiosError(403));
      await expect(service.searchModpacks('key')).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });

      mockClient.get.mockRejectedValueOnce(axiosError(429, 'slow down'));
      await expect(service.searchModpacks('key')).rejects.toMatchObject({ status: 429, message: 'slow down' });

      mockClient.get.mockRejectedValueOnce(new Error('boom'));
      await expect(service.searchModpacks('key')).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
    });

    it('featured and popular reuse the search with their sort field', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [] } });
      await service.getFeaturedModpacks('key', 3);
      expect(mockClient.get).toHaveBeenLastCalledWith('/mods/search', { params: expect.objectContaining({ sortField: 1, pageSize: 3 }) });
      await service.getPopularModpacks('key');
      expect(mockClient.get).toHaveBeenLastCalledWith('/mods/search', { params: expect.objectContaining({ sortField: 2, pageSize: 10 }) });
    });

    it('getModpack returns the payload and maps errors', async () => {
      await expect(service.getModpack('', 1)).rejects.toThrow(HttpException);

      mockClient.get.mockResolvedValueOnce({ data: { data: { id: 1 } } });
      expect(await service.getModpack('key', 1)).toEqual({ id: 1 });

      mockClient.get.mockRejectedValueOnce(axiosError(403));
      await expect(service.getModpack('key', 1)).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
      mockClient.get.mockRejectedValueOnce(axiosError(404));
      await expect(service.getModpack('key', 1)).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
      mockClient.get.mockRejectedValueOnce(axiosError(500));
      await expect(service.getModpack('key', 1)).rejects.toMatchObject({ status: 500 });
      mockClient.get.mockRejectedValueOnce(new Error('x'));
      await expect(service.getModpack('key', 1)).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
    });

    it('resolveModpack accepts ids and slugs', async () => {
      await expect(service.resolveModpack('', 'x')).rejects.toThrow(HttpException);

      mockClient.get.mockResolvedValueOnce({ data: { data: { id: 5 } } });
      expect(await service.resolveModpack('key', ' 5 ')).toEqual({ id: 5 });
      expect(mockClient.get).toHaveBeenLastCalledWith('/mods/5');

      mockClient.get.mockResolvedValueOnce({ data: { data: [{ id: 6 }] } });
      expect(await service.resolveModpack('key', 'all-the-mods')).toEqual({ id: 6 });

      mockClient.get.mockResolvedValueOnce({ data: { data: [] } });
      await expect(service.resolveModpack('key', 'missing')).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });

      mockClient.get.mockRejectedValueOnce(axiosError(403));
      await expect(service.resolveModpack('key', 'x')).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
      mockClient.get.mockRejectedValueOnce(new Error('x'));
      await expect(service.resolveModpack('key', 'x')).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
    });

    it('getModpackFiles normalizes files and maps failures', async () => {
      mockClient.get
        .mockResolvedValueOnce({ data: { data: { id: 5 } } })
        .mockResolvedValueOnce({ data: { data: [{ id: 9, displayName: 'v1', fileName: 'v1.zip', releaseType: 2, fileDate: 'd', gameVersions: ['1.20.1', 'Forge'] }] } });

      const files = await service.getModpackFiles('key', '5');
      expect(files).toEqual([
        { provider: 'curseforge', versionId: '9', name: 'v1', releaseType: 'beta', fileName: 'v1.zip', datePublished: 'd', gameVersions: ['1.20.1'], loaders: ['forge'] },
      ]);

      mockClient.get.mockResolvedValueOnce({ data: { data: { id: 5 } } }).mockRejectedValueOnce(new Error('x'));
      await expect(service.getModpackFiles('key', '5')).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
    });
  });

  describe('mods', () => {
    const axiosError = (status: number) => {
      const error: any = new Error('http');
      error.isAxiosError = true;
      error.response = { status };
      return error;
    };

    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      (axios.isAxiosError as unknown as jest.Mock).mockImplementation((error) => !!error?.isAxiosError);
    });

    it('searchMods maps non-403 axios errors and generic errors', async () => {
      mockClient.get.mockRejectedValueOnce(axiosError(500));
      await expect(service.searchMods('key', { minecraftVersion: '1.20.1' })).rejects.toMatchObject({ status: 500 });
      mockClient.get.mockRejectedValueOnce(new Error('x'));
      await expect(service.searchMods('key', { minecraftVersion: '1.20.1' })).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
    });

    it('searchMods ignores "latest" as a version filter and clamps paging', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], pagination: { totalCount: 0 } } });
      const result = await service.searchMods('key', { minecraftVersion: 'latest', loader: 'forge', pageSize: 500, index: -3, category: '12', sort: 'downloads' });
      expect(mockClient.get).toHaveBeenCalledWith('/mods/search', {
        params: expect.objectContaining({ pageSize: 50, index: 0, gameVersion: undefined, modLoaderType: undefined, categoryId: 12 }),
      });
      expect(result.pagination).toEqual({ index: 0, pageSize: 50, resultCount: 0, totalCount: 0 });
    });

    it('getModCategories caches results and swallows errors', async () => {
      mockClient.get.mockResolvedValueOnce({ data: { data: [{ id: 2, name: 'Tech' }, { id: 1, name: 'Adventure' }, { id: 3, name: 'Class', isClass: true }] } });
      const first = await service.getModCategories('key');
      expect(first).toEqual([{ value: '1', label: 'Adventure' }, { value: '2', label: 'Tech' }]);
      expect(await service.getModCategories('key')).toBe(first);
      expect(mockClient.get).toHaveBeenCalledTimes(1);

      const fresh = new CurseforgeService();
      mockClient.get.mockRejectedValueOnce(new Error('x'));
      expect(await fresh.getModCategories('key')).toEqual([]);
    });

    it('resolveMods resolves ids and slugs, tolerating failures', async () => {
      await expect(service.resolveMods('', ['1'])).rejects.toThrow(HttpException);
      expect(await service.resolveMods('key', [' ', ''])).toEqual([]);

      mockClient.post.mockResolvedValueOnce({ data: { data: [{ id: 1, slug: 'one', name: 'One', downloadCount: 1, latestFilesIndexes: [{ gameVersion: '1.20.1', modLoader: 1 }] }] } });
      mockClient.get
        .mockResolvedValueOnce({ data: { data: [{ id: 2, slug: 'two', name: 'Two', downloadCount: 2, latestFiles: [{ gameVersions: ['1.19.2', 'NeoForge', 'Quilt'] }] }] } })
        .mockRejectedValueOnce(new Error('x'))
        .mockResolvedValueOnce({ data: { data: [] } });

      const mods = await service.resolveMods('key', ['1', 'two', 'broken', 'missing', '1']);
      expect(mods.map((m) => m.projectId)).toEqual(['1', '2']);
      expect(mods[0].supportedLoaders).toEqual(['forge']);
      expect(mods[1]).toMatchObject({ supportedVersions: ['1.19.2'], supportedLoaders: ['neoforge', 'quilt'], iconUrl: undefined });
    });

    it('resolveMods tolerates a failing batch lookup', async () => {
      mockClient.post.mockRejectedValueOnce(new Error('x'));
      expect(await service.resolveMods('key', ['1'])).toEqual([]);
    });

    it('resolveModFiles validates ids and normalizes files', async () => {
      await expect(service.resolveModFiles('', ['1'])).rejects.toThrow(HttpException);
      expect(await service.resolveModFiles('key', ['abc'])).toEqual([]);

      mockClient.post.mockResolvedValueOnce({ data: { data: [{ id: 7, displayName: 'f', fileName: 'f.jar', releaseType: 9, fileDate: 'd', gameVersions: ['Fabric', '1.21'] }] } });
      const files = await service.resolveModFiles('key', ['7', '7']);
      expect(files[0]).toMatchObject({ versionId: '7', releaseType: 'release', loaders: ['fabric'], gameVersions: ['1.21'] });

      mockClient.post.mockRejectedValueOnce(new Error('x'));
      expect(await service.resolveModFiles('key', ['7'])).toEqual([]);
    });

    it('getLatestVersions picks the newest matching file per mod', async () => {
      mockClient.post
        .mockResolvedValueOnce({
          data: {
            data: [
              { id: 1, slug: 'a', latestFilesIndexes: [{ gameVersion: '1.20.1', modLoader: 1, fileId: 10 }, { gameVersion: '1.20.1', modLoader: 1, fileId: 12 }, { gameVersion: '1.21', modLoader: 1, fileId: 99 }, { gameVersion: '1.20.1', modLoader: 4, fileId: 50 }] },
              { id: 2, slug: 'b', latestFilesIndexes: [{ gameVersion: '1.20.1', modLoader: 0, fileId: 20 }] },
              { id: 3, slug: 'c', latestFilesIndexes: [] },
            ],
          },
        })
        .mockResolvedValueOnce({ data: { data: [{ id: 12, displayName: 'a12', fileName: 'a.jar', releaseType: 1, fileDate: 'd', gameVersions: [] }] } });

      const result = await service.getLatestVersions('key', ['1', '2', '3'], { minecraftVersion: '1.20.1', loader: 'forge' });

      expect(result).toEqual([
        { ref: '1', version: expect.objectContaining({ versionId: '12' }) },
        { ref: '2', version: null },
      ]);
    });

    it('getModVersions resolves slugs, falls back without loader and maps errors', async () => {
      await expect(service.getModVersions('', 'x', {})).rejects.toThrow(HttpException);

      mockClient.get
        .mockResolvedValueOnce({ data: { data: [{ id: 3 }] } })
        .mockResolvedValueOnce({ data: { data: [] } })
        .mockResolvedValueOnce({ data: { data: [{ id: 8, displayName: 'v', fileName: 'v.jar', releaseType: 3, fileDate: 'd', gameVersions: ['1.20.1'] }] } });

      const versions = await service.getModVersions('key', 'jei', { minecraftVersion: '1.20.1', loader: 'forge' });
      expect(versions[0]).toMatchObject({ versionId: '8', releaseType: 'alpha' });
      expect(mockClient.get).toHaveBeenCalledTimes(3);

      mockClient.get.mockResolvedValueOnce({ data: { data: [] } });
      await expect(service.getModVersions('key', 'missing', {})).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });

      mockClient.get.mockRejectedValueOnce(axiosError(403));
      await expect(service.getModVersions('key', '3', {})).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
      mockClient.get.mockRejectedValueOnce(axiosError(500));
      await expect(service.getModVersions('key', '3', {})).rejects.toMatchObject({ status: 500 });
      mockClient.get.mockRejectedValueOnce(new Error('x'));
      await expect(service.getModVersions('key', '3', {})).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
    });

    it('getModVersions returns an empty list when no files exist', async () => {
      mockClient.get.mockResolvedValueOnce({ data: {} });
      expect(await service.getModVersions('key', '3', {})).toEqual([]);
    });
  });
});
