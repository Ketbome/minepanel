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

    it('flags a minor bump when the notes say so, since no major number changes', async () => {
      process.env.APP_VERSION = '1.11.35';
      service = new VersionService();
      mockedGet.mockResolvedValue({
        data: [release('1.12.0', { body: '## \u26a0\ufe0f Breaking Changes\n- mc-router moved out of the root compose file' })],
      });

      const info = await service.getVersionInfo();

      expect(info.hasBreakingChanges).toBe(true);
    });

    it('does not flag an ordinary patch release', async () => {
      mockedGet.mockResolvedValue({ data: [release('1.11.31', { body: 'Just fixes' })] });

      const info = await service.getVersionInfo();

      expect(info.hasBreakingChanges).toBe(false);
    });
  });

  describe('release notes', () => {
    // What the release workflow actually publishes: the image-pull preamble,
    // then GitHub's generated categories, then the compare link.
    const body = [
      '## 🐳 Docker Images',
      '',
      '```bash',
      'docker pull ketbom/minepanel:1.11.31',
      '```',
      '',
      'Platforms: `linux/amd64`, `linux/arm64`',
      '',
      "<!-- Release notes generated using configuration in .github/release.yml -->",
      '',
      "## What's Changed",
      '### 🐛 Bug Fixes',
      '* fix: stop the worlds tab lying by @Ketbome in https://github.com/Ketbome/minepanel/pull/204',
      '',
      '**Full Changelog**: https://github.com/Ketbome/minepanel/compare/v1.11.30...v1.11.31',
    ].join('\n');

    it('groups the changes under the category they were published in', async () => {
      mockedGet.mockResolvedValue({ data: [release('1.11.31', { body })] });

      const [entry] = (await service.getVersionInfo()).changelog;

      expect(entry.sections).toEqual([
        {
          title: '🐛 Bug Fixes',
          important: false,
          changes: [
            {
              text: 'fix: stop the worlds tab lying',
              author: 'Ketbome',
              pr: 204,
              prUrl: 'https://github.com/Ketbome/minepanel/pull/204',
            },
          ],
        },
      ]);
    });

    // The panel prints its own update instructions, so repeating the workflow's
    // pull block would say the same thing twice.
    it('drops the image-pull preamble and keeps the compare link', async () => {
      mockedGet.mockResolvedValue({ data: [release('1.11.31', { body })] });

      const [entry] = (await service.getVersionInfo()).changelog;

      expect(entry.notes).toBe('');
      expect(entry.compareUrl).toBe('https://github.com/Ketbome/minepanel/compare/v1.11.30...v1.11.31');
    });

    it('keeps hand-written notes that list nothing', async () => {
      mockedGet.mockResolvedValue({ data: [release('1.11.31', { body: 'Rebuilt against the new base image.' })] });

      const [entry] = (await service.getVersionInfo()).changelog;

      expect(entry.sections).toEqual([]);
      expect(entry.notes).toBe('Rebuilt against the new base image.');
    });

    it('lists changes published without a category', async () => {
      mockedGet.mockResolvedValue({ data: [release('1.11.31', { body: "## What's Changed\n* Something happened" })] });

      const [entry] = (await service.getVersionInfo()).changelog;

      expect(entry.sections).toEqual([
        { title: '', important: false, changes: [{ text: 'Something happened', author: null, pr: null, prUrl: null }] },
      ]);
    });

    // These are the ones the panel shows above the changelog, before the update
    // button, because they are steps rather than news.
    it('marks the categories the user has to act on', async () => {
      const notes = ['## ⚠️ Breaking Changes', '* mc-router moved out of the root compose file', '### 🚀 Features', '* something new'].join('\n');
      mockedGet.mockResolvedValue({ data: [release('1.11.31', { body: notes })] });

      const [entry] = (await service.getVersionInfo()).changelog;

      expect(entry.sections.map((section) => [section.title, section.important])).toEqual([
        ['⚠️ Breaking Changes', true],
        ['🚀 Features', false],
      ]);
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

    it('sees a minor bump as newer, which text order would get backwards', async () => {
      process.env.APP_VERSION = '1.11.35';
      service = new VersionService();
      mockedGet.mockResolvedValue({ data: [release('1.12.0')] });

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

    it('retries a failed lookup long before it would retry a good one', async () => {
      jest.useFakeTimers({ now: new Date('2026-08-21T19:00:00Z') });
      mockedGet.mockRejectedValue(new Error('network down'));
      await service.getVersionInfo();

      // Six minutes later: nowhere near the hour a successful answer is held.
      jest.setSystemTime(new Date('2026-08-21T19:06:00Z'));
      mockedGet.mockResolvedValue({ data: [release('1.11.34')] });
      const info = await service.getVersionInfo();

      expect(info.updateAvailable).toBe(true);
      jest.useRealTimers();
    });

    it('asks again when the panel forces a check', async () => {
      jest.useFakeTimers({ now: new Date('2026-08-21T19:00:00Z') });
      mockedGet.mockResolvedValue({ data: [release('1.11.34')] });
      await service.getVersionInfo();

      jest.setSystemTime(new Date('2026-08-21T19:02:00Z'));
      await service.getVersionInfo({ refresh: true });

      expect(mockedGet).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    // 60 calls per hour, per IP, shared by every panel behind it.
    it('does not let a forced check run more than once a minute', async () => {
      jest.useFakeTimers({ now: new Date('2026-08-21T19:00:00Z') });
      mockedGet.mockResolvedValue({ data: [release('1.11.34')] });
      await service.getVersionInfo();

      jest.setSystemTime(new Date('2026-08-21T19:00:30Z'));
      await service.getVersionInfo({ refresh: true });

      expect(mockedGet).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it('reports when it last asked', async () => {
      jest.useFakeTimers({ now: new Date('2026-08-21T19:00:00Z') });
      mockedGet.mockResolvedValue({ data: [release('1.11.34')] });

      expect((await service.getVersionInfo()).checkedAt).toBe('2026-08-21T19:00:00.000Z');
      jest.useRealTimers();
    });

    it('does not retry a failed lookup on every request', async () => {
      mockedGet.mockRejectedValue(new Error('network down'));

      await service.getVersionInfo();
      await service.getVersionInfo();

      expect(mockedGet).toHaveBeenCalledTimes(1);
    });
  });
});
