import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { CurseforgeService } from './curseforge.service';

jest.mock('axios');

describe('CurseforgeService', () => {
  let service: CurseforgeService;
  const mockClient = {
    get: jest.fn(),
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
});
