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
