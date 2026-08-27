import { parseMinecraftStatus } from './minecraft-status.util';

describe('parseMinecraftStatus', () => {
  it.each([
    ['java plain', 'version=1.21.4 online=0 max=20', { playersOnline: 0, playersMax: 20, version: '1.21.4' }],
    ['java with protocol', 'version=1.21.4 protocol=769 online=3 max=20', { playersOnline: 3, playersMax: 20, version: '1.21.4' }],
    ['version with spaces', "version=Paper 1.21.4 online=1 max=10 motd='A Minecraft Server'", { playersOnline: 1, playersMax: 10, version: 'Paper 1.21.4' }],
    ['host prefix', '127.0.0.1:25565 : version=1.20.1 online=2 max=8', { playersOnline: 2, playersMax: 8, version: '1.20.1' }],
    ['bedrock', 'version=1.21.51 online=0 max=10', { playersOnline: 0, playersMax: 10, version: '1.21.51' }],
    ['version last', 'online=5 max=50 version=1.19.2', { playersOnline: 5, playersMax: 50, version: '1.19.2' }],
    ['no version', 'online=1 max=4', { playersOnline: 1, playersMax: 4, version: null }],
  ])('parses %s', (_label, output, expected) => {
    expect(parseMinecraftStatus(output as string)).toEqual(expected);
  });

  it.each([
    ['empty output', ''],
    ['unrelated output', 'Error: connection refused'],
    ['missing max', 'version=1.21.4 online=0'],
    ['missing online', 'version=1.21.4 max=20'],
  ])('returns null for %s', (_label, output) => {
    expect(parseMinecraftStatus(output)).toBeNull();
  });

  it('does not confuse a similar key with online', () => {
    expect(parseMinecraftStatus('faveronline=9 max=20')).toBeNull();
  });
});
