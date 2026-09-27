import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { VanillaTweaksController } from './vanilla-tweaks.controller';
import { VanillaTweaksService } from './vanilla-tweaks.service';

jest.mock('axios');
const get = axios.get as jest.Mock;

// The API answers with a JSON body under a text/html content type, as recorded in mc-image-helper's tests.
const ok = (body: object) => ({ status: 200, data: JSON.stringify({ result: 'ok', ...body }) });

describe('VanillaTweaksService', () => {
  let service: VanillaTweaksService;
  beforeEach(() => {
    get.mockReset();
    service = new VanillaTweaksService();
  });

  it('returns the type, version and packs of a share code, and caches it', async () => {
    get.mockResolvedValue(ok({ type: 'datapacks', version: '1.21', packs: { survival: ['graves', 'multiplayer sleep', 7] } }));

    const share = await service.lookup('MGr52E');
    await service.lookup('MGr52E');

    expect(share).toEqual({ code: 'MGr52E', type: 'datapacks', version: '1.21', packs: { survival: ['graves', 'multiplayer sleep'] } });
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('https://vanillatweaks.net/assets/server/sharecode.php', expect.objectContaining({ params: { code: 'MGr52E' } }));
  });

  it('treats unknown codes and malformed answers as not found', async () => {
    get.mockResolvedValueOnce({ status: 404, data: { result: 'error', message: 'This code was not found in the database.' } });
    expect(await service.lookup('ZZZZZZ')).toBeNull();
    get.mockResolvedValueOnce({ status: 200, data: '<html>' });
    expect(await service.lookup('AAAAAA')).toBeNull();
    get.mockResolvedValueOnce({ status: 200, data: { result: 'ok', type: 'skins', version: '1.21', packs: {} } });
    expect(await service.lookup('BBBBBB')).toBeNull();
    expect(await service.lookup('bad code!')).toBeNull();
    expect(get).toHaveBeenCalledTimes(3);
  });

  it('reports an unreachable Vanilla Tweaks instead of calling the code unknown', async () => {
    get.mockRejectedValue(new Error('ETIMEDOUT'));
    await expect(service.lookup('MGr52E')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('keeps the cache bounded', async () => {
    get.mockImplementation(async (_url: string, { params }: { params: { code: string } }) => ok({ type: 'craftingtweaks', version: '26.2', packs: { q: [params.code] } }));
    for (let i = 0; i < 205; i++) await service.lookup(`code${i}`);
    expect((service as any).cache.size).toBe(200);
  });
});

describe('VanillaTweaksController', () => {
  const lookup = jest.fn();
  const controller = new VanillaTweaksController({ lookup } as any);

  it('validates the code and maps unknown codes to 404', async () => {
    await expect(controller.lookup('../x')).rejects.toBeInstanceOf(BadRequestException);
    lookup.mockResolvedValueOnce(null);
    await expect(controller.lookup('ZZZZZZ')).rejects.toBeInstanceOf(NotFoundException);
    lookup.mockResolvedValueOnce({ code: 'MGr52E' });
    expect(await controller.lookup('MGr52E')).toEqual({ code: 'MGr52E' });
  });
});
