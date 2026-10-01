import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { VanillaTweaksController } from './vanilla-tweaks.controller';
import { VanillaTweaksService } from './vanilla-tweaks.service';

jest.mock('axios');
const get = axios.get as jest.Mock;

// The API answers with a JSON body under a text/html content type, as recorded in mc-image-helper's tests.
const ok = (body: object) => ({ status: 200, data: JSON.stringify({ result: 'ok', ...body }) });

// The mocked axios would hand any status back, where the real one rejects what validateStatus refuses.
const answer = (status: number, data: unknown) => async (_url: string, options: { validateStatus: (status: number) => boolean }) => {
  if (!options.validateStatus(status)) throw Object.assign(new Error(`Request failed with status code ${status}`), { response: { status } });
  return { status, data };
};

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

  it('treats a 404 and an answer of a kind it cannot use as not found', async () => {
    get.mockImplementationOnce(answer(404, { result: 'error', message: 'This code was not found in the database.' }));
    expect(await service.lookup('ZZZZZZ')).toBeNull();
    get.mockImplementationOnce(answer(200, { result: 'ok', type: 'skins', version: '1.21', packs: {} }));
    expect(await service.lookup('BBBBBB')).toBeNull();
    expect(await service.lookup('bad code!')).toBeNull();
    expect(get).toHaveBeenCalledTimes(2);

    // Not found is stable, so it is remembered.
    await service.lookup('ZZZZZZ');
    expect(get).toHaveBeenCalledTimes(2);
  });

  // Cloudflare answers 403 or 429 (or a challenge page) for a code that exists: that says
  // nothing about the code, and must not be remembered as "not found" for ten minutes.
  it.each([
    ['403', answer(403, '<html>Attention required</html>')],
    ['429', answer(429, 'Too many requests')],
    ['a redirect', answer(301, '')],
    ['a 200 that is not JSON', answer(200, '<html>Checking your browser</html>')],
  ])('reports %s as unreachable and does not remember it', async (_label, response) => {
    get.mockImplementationOnce(response);
    await expect(service.lookup('MGr52E')).rejects.toBeInstanceOf(ServiceUnavailableException);

    get.mockResolvedValueOnce(ok({ type: 'datapacks', version: '1.21', packs: {} }));
    expect(await service.lookup('MGr52E')).toMatchObject({ code: 'MGr52E' });
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('bounds what a misbehaving Vanilla Tweaks can cost', async () => {
    get.mockResolvedValue(ok({ type: 'datapacks', version: '1.21', packs: {} }));
    await service.lookup('MGr52E');

    expect(get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ timeout: 8000, maxRedirects: 0, maxContentLength: 1_000_000 }));
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
