import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { ModrinthService } from './modrinth.service';

jest.mock('axios');

describe('ModrinthService', () => {
  let service: ModrinthService;
  const mockClient = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.create as jest.Mock).mockReturnValue(mockClient);
    service = new ModrinthService();
  });

  it('searchMods should return normalized compatible results', async () => {
    mockClient.get.mockResolvedValue({
      data: {
        hits: [
          {
            project_id: 'A1',
            slug: 'sodium',
            title: 'Sodium',
            description: 'Rendering optimization',
            icon_url: 'https://example.com/sodium.png',
            downloads: 99999,
            date_modified: '2026-01-05T00:00:00Z',
            versions: ['1.20.1', '1.20.2'],
            categories: ['fabric', 'optimization'],
          },
          {
            project_id: 'A2',
            slug: 'forge-only-mod',
            title: 'Forge Only',
            description: 'Forge mod',
            icon_url: 'https://example.com/forge.png',
            downloads: 1200,
            date_modified: '2026-01-06T00:00:00Z',
            versions: ['1.20.1'],
            categories: ['forge'],
          },
        ],
        offset: 0,
        limit: 20,
        total_hits: 2,
      },
    });

    const result = await service.searchMods({
      q: 'performance',
      minecraftVersion: '1.20.1',
      loader: 'fabric',
      limit: 20,
      offset: 0,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      provider: 'modrinth',
      projectId: 'A1',
      slug: 'sodium',
      supportedLoaders: ['fabric'],
    });
  });

  it('searchMods should map upstream axios errors', async () => {
    mockClient.get.mockRejectedValue({
      response: {
        status: 502,
        data: { description: 'Gateway error' },
      },
    });
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

    await expect(
      service.searchMods({
        minecraftVersion: '1.20.1',
      }),
    ).rejects.toBeInstanceOf(HttpException);

    await expect(
      service.searchMods({
        minecraftVersion: '1.20.1',
      }),
    ).rejects.toMatchObject({ status: HttpStatus.BAD_GATEWAY });
  });
  describe('remaining endpoints', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      (axios.isAxiosError as unknown as jest.Mock).mockImplementation((error) => !!error?.isAxiosError);
    });

    const axiosError = (status: number, description?: string) => Object.assign(new Error('http'), { isAxiosError: true, response: { status, data: description ? { description } : undefined } });

    it('searchMods ignores the loader for datapacks and "latest" as version', async () => {
      mockClient.get.mockResolvedValue({ data: { hits: [{ project_id: 'p', slug: 's', title: 't', downloads: 1, versions: ['1.21'], categories: ['datapack', 'adventure'] }], total_hits: 1 } });

      const result = await service.searchMods({ minecraftVersion: 'latest', loader: 'forge', projectType: 'datapack', category: 'adventure', limit: 0, offset: -1, sort: 'updated' });

      const params = mockClient.get.mock.calls[0][1].params;
      expect(JSON.parse(params.facets)).toEqual([['project_type:datapack'], ['categories:adventure']]);
      expect(params).toMatchObject({ limit: 1, offset: 0, index: 'updated' });
      expect(result.data[0].supportedLoaders).toEqual(['datapack']);
      expect(result.data[0].summary).toBe('');
    });

    it('searchMods wraps generic errors', async () => {
      mockClient.get.mockRejectedValue(new Error('x'));
      await expect(service.searchMods({ minecraftVersion: '1.21' })).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
    });

    it('getModCategories filters by project type, humanizes names and caches', async () => {
      mockClient.get.mockResolvedValueOnce({ data: [{ name: 'world-gen', project_type: 'mod' }, { name: 'forge', project_type: 'mod' }, { name: 'adventure', project_type: 'datapack' }, { name: 'a', project_type: 'mod' }] });
      expect(await service.getModCategories()).toEqual([{ value: 'a', label: 'A' }, { value: 'world-gen', label: 'World Gen' }]);
      expect(await service.getModCategories('mod')).toHaveLength(2);
      expect(mockClient.get).toHaveBeenCalledTimes(1);

      mockClient.get.mockRejectedValueOnce(new Error('x'));
      expect(await service.getModCategories('datapack')).toEqual([]);
    });

    it('resolveProjects normalizes projects and tolerates failures', async () => {
      expect(await service.resolveProjects([' ', ''])).toEqual([]);

      mockClient.get.mockResolvedValueOnce({ data: [{ id: 'p1', slug: 's', title: 'T', downloads: 3, loaders: ['Fabric', 'other'], game_versions: ['1.21'] }] });
      const projects = await service.resolveProjects(['p1', 'p1']);
      expect(projects[0]).toMatchObject({ provider: 'modrinth', projectId: 'p1', supportedLoaders: ['Fabric'], supportedVersions: ['1.21'], summary: '' });
      expect(mockClient.get).toHaveBeenCalledWith('/projects', { params: { ids: '["p1"]' } });

      mockClient.get.mockRejectedValueOnce(new Error('x'));
      expect(await service.resolveProjects(['p1'])).toEqual([]);
    });

    it('resolveVersions normalizes versions and tolerates failures', async () => {
      expect(await service.resolveVersions([])).toEqual([]);

      mockClient.get.mockResolvedValueOnce({ data: [{ id: 'v1', name: 'One', version_number: '1.0', version_type: 'beta', files: [{ filename: 'a.jar', primary: false }, { filename: 'b.jar', primary: true }] }] });
      const versions = await service.resolveVersions(['v1']);
      expect(versions[0]).toMatchObject({ versionId: 'v1', releaseType: 'beta', fileName: 'b.jar', gameVersions: [], loaders: [] });

      mockClient.get.mockRejectedValueOnce(new Error('x'));
      expect(await service.resolveVersions(['v1'])).toEqual([]);
    });

    it('getProjectVersions forwards filters and maps errors', async () => {
      mockClient.get.mockResolvedValueOnce({ data: [{ id: 'v', name: 'n', version_number: '1', version_type: 'release', files: [] }] });
      const versions = await service.getProjectVersions(' sodium ', { minecraftVersion: '1.21', loader: 'fabric' });
      expect(versions[0].fileName).toBeUndefined();
      expect(mockClient.get).toHaveBeenCalledWith('/project/sodium/version', { params: { game_versions: '["1.21"]', loaders: '["fabric"]' } });

      mockClient.get.mockRejectedValueOnce(axiosError(404));
      await expect(service.getProjectVersions('nope', {})).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
      mockClient.get.mockRejectedValueOnce(axiosError(500, 'down'));
      await expect(service.getProjectVersions('x', {})).rejects.toMatchObject({ status: 500, message: 'down' });
      mockClient.get.mockRejectedValueOnce(new Error('x'));
      await expect(service.getProjectVersions('x', {})).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
    });

    it('getLatestVersions prefers releases and nulls failures', async () => {
      mockClient.get
        .mockResolvedValueOnce({ data: [{ id: 'b', version_type: 'beta', files: [] }, { id: 'r', version_type: 'release', files: [] }] })
        .mockResolvedValueOnce({ data: [{ id: 'only-beta', version_type: 'beta', files: [] }] })
        .mockResolvedValueOnce({ data: [] })
        .mockRejectedValueOnce(new Error('x'));

      const result = await service.getLatestVersions(['a', 'b', 'c', 'd', 'a'], {});

      expect(result).toEqual([
        { ref: 'a', version: expect.objectContaining({ versionId: 'r' }) },
        { ref: 'b', version: expect.objectContaining({ versionId: 'only-beta' }) },
        { ref: 'c', version: null },
        { ref: 'd', version: null },
      ]);
    });
  });

  it('getProjectVersions should pass the changelog through unchanged', async () => {
    mockClient.get.mockResolvedValue({
      data: [
        {
          id: 'v1',
          name: 'Version 1',
          version_number: '1.0.0',
          version_type: 'release',
          date_published: '2026-01-01T00:00:00Z',
          game_versions: ['1.20.1'],
          loaders: ['fabric'],
          files: [{ filename: 'mod.jar', primary: true }],
          changelog: '## 1.0.0\n- Initial release',
        },
      ],
    });

    const versions = await service.getProjectVersions('sodium', {});

    expect(versions[0].changelog).toBe('## 1.0.0\n- Initial release');
  });

  it('getProjectVersions should leave changelog undefined when missing', async () => {
    mockClient.get.mockResolvedValue({
      data: [
        {
          id: 'v1',
          name: 'Version 1',
          version_number: '1.0.0',
          version_type: 'release',
          game_versions: ['1.20.1'],
          loaders: ['fabric'],
          files: [{ filename: 'mod.jar', primary: true }],
        },
      ],
    });

    const versions = await service.getProjectVersions('sodium', {});

    expect(versions[0].changelog).toBeUndefined();
  });
});
