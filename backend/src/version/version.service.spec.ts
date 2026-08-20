import axios from 'axios';
import { VersionService } from './version.service';

jest.mock('axios');
const mockedGet = axios.get as jest.Mock;

describe('VersionService', () => {
  let service: VersionService;
  const originalVersion = process.env.APP_VERSION;

  const release = (version: string, overrides: Record<string, unknown> = {}) => ({
    tag_name: `v${version}`,
    html_url: `https://github.com/Ketbome/minepanel/releases/tag/v${version}`,
    published_at: '2026-08-19T00:00:00Z',
    body: 'Some notes',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.APP_VERSION = '1.11.30';
    service = new VersionService();
  });

  afterAll(() => {
    process.env.APP_VERSION = originalVersion;
  });

  it('reports an update when a newer release exists', async () => {
    mockedGet.mockResolvedValue({ data: [release('1.11.34')] });

    const info = await service.getVersionInfo();

    expect(info.current).toBe('1.11.30');
    expect(info.latest).toBe('1.11.34');
    expect(info.updateAvailable).toBe(true);
  });

  it('shows nothing for a locally built image', async () => {
    process.env.APP_VERSION = 'dev';
    service = new VersionService();
    mockedGet.mockResolvedValue({ data: [release('2.0.0')] });

    const info = await service.getVersionInfo();

    expect(info.current).toBeNull();
    expect(info.updateAvailable).toBe(false);
    expect(info.changelog).toEqual([]);
  });

  describe('changelog', () => {
    it('lists every release between the running version and the newest, newest first', async () => {
      mockedGet.mockResolvedValue({ data: [release('1.11.31'), release('2.0.0'), release('1.11.30'), release('1.11.29')] });

      const info = await service.getVersionInfo();

      expect(info.changelog.map((entry) => entry.version)).toEqual(['2.0.0', '1.11.31']);
    });

    it('skips drafts and prereleases', async () => {
      mockedGet.mockResolvedValue({
        data: [release('2.0.1', { draft: true }), release('2.0.0-rc1', { prerelease: true }), release('1.11.31')],
      });

      const info = await service.getVersionInfo();

      expect(info.changelog.map((entry) => entry.version)).toEqual(['1.11.31']);
    });

    it('flags a release whose notes carry the breaking changes heading', async () => {
      mockedGet.mockResolvedValue({ data: [release('1.11.31', { body: '## ⚠️ Breaking Changes\n- moved things' })] });

      const info = await service.getVersionInfo();

      expect(info.changelog[0].breaking).toBe(true);
      expect(info.hasBreakingChanges).toBe(true);
    });

    it('flags a major bump as breaking even when the notes say nothing', async () => {
      mockedGet.mockResolvedValue({ data: [release('2.0.0', { body: 'Just fixes' })] });

      const info = await service.getVersionInfo();

      expect(info.changelog[0].breaking).toBe(true);
    });

    it('does not flag an ordinary patch release', async () => {
      mockedGet.mockResolvedValue({ data: [release('1.11.31', { body: 'Just fixes' })] });

      const info = await service.getVersionInfo();

      expect(info.hasBreakingChanges).toBe(false);
    });
  });

  describe('version comparison', () => {
    it('does not treat a prerelease as newer than the final release of the same version', async () => {
      process.env.APP_VERSION = '2.0.0';
      service = new VersionService();
      mockedGet.mockResolvedValue({ data: [release('2.0.0-rc1')] });

      expect((await service.getVersionInfo()).updateAvailable).toBe(false);
    });

    it('treats the final release as newer than its own prerelease', async () => {
      process.env.APP_VERSION = '2.0.0-rc1';
      service = new VersionService();
      mockedGet.mockResolvedValue({ data: [release('2.0.0')] });

      expect((await service.getVersionInfo()).updateAvailable).toBe(true);
    });

    it('compares numerically rather than as text', async () => {
      process.env.APP_VERSION = '1.11.9';
      service = new VersionService();
      mockedGet.mockResolvedValue({ data: [release('1.11.10')] });

      expect((await service.getVersionInfo()).updateAvailable).toBe(true);
    });
  });

  describe('talking to GitHub', () => {
    it('asks only once per hour', async () => {
      mockedGet.mockResolvedValue({ data: [release('1.11.34')] });

      await service.getVersionInfo();
      await service.getVersionInfo();

      expect(mockedGet).toHaveBeenCalledTimes(1);
    });

    it('reports no update instead of failing when GitHub is unreachable', async () => {
      mockedGet.mockRejectedValue(new Error('network down'));

      const info = await service.getVersionInfo();

      expect(info).toMatchObject({ latest: null, updateAvailable: false, changelog: [] });
    });

    it('does not retry a failed lookup on every request', async () => {
      mockedGet.mockRejectedValue(new Error('network down'));

      await service.getVersionInfo();
      await service.getVersionInfo();

      expect(mockedGet).toHaveBeenCalledTimes(1);
    });
  });
});
