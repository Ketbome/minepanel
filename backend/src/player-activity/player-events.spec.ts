import { parsePlayerEvents } from './player-events';

const stamp = '2026-09-24T12:00:00.123456789Z';
describe('player event parsing', () => {
  it('accepts Vanilla/Paper and Forge/NeoForge server messages, never player chat', () => {
    const logs = [
      `${stamp} [12:00:00] [Server thread/INFO]: Alex joined the game`,
      `${stamp} [12:00:00] [Server thread/INFO] [minecraft/MinecraftServer]: Alex left the game`,
      `${stamp} [12:00:00] [Server thread/INFO]: <Griefer> Steve joined the game`,
      `${stamp} [12:00:00] [Async Chat Thread/INFO]: Steve joined the game`,
      'invalid [12:00:00] [Server thread/INFO]: Alex joined the game',
      'garbage',
    ].join('\n');
    expect(parsePlayerEvents(logs, false).map(({ name, joined }) => ({ name, joined }))).toEqual([{ name: 'Alex', joined: true }, { name: 'Alex', joined: false }]);
  });
  it('parses Bedrock gamer tags with spaces using stable XUIDs', () => {
    expect(parsePlayerEvents(`${stamp} [2026-09-24 12:00:00:123 INFO] Player disconnected: Alex One, xuid: 123456, pfid: xyz`, true)[0]).toMatchObject({ key: 'bedrock:123456', name: 'Alex One', joined: false });
    expect(parsePlayerEvents(`${stamp} [INFO] <Steve> Player connected: Alex, xuid: 1`, true)).toEqual([]);
  });
});
