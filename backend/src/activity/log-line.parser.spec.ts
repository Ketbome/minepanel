import { classifyLine, LogLine, parseLogLine } from './log-line.parser';

const online = new Set(['steve', 'alex']);
const classify = (raw: string) => classifyLine(parseLogLine(raw) as LogLine, online);

describe('parseLogLine', () => {
  it('reads vanilla, Paper and Forge prefixes', () => {
    expect(parseLogLine('[12:34:56] [Server thread/INFO]: Steve joined the game')).toEqual({ time: '12:34:56', level: 'INFO', message: 'Steve joined the game' });
    expect(parseLogLine('[12:34:56 WARN]: Can\'t keep up!')).toEqual({ time: '12:34:56', level: 'WARN', message: "Can't keep up!" });
    expect(parseLogLine('[25Sep2026 12:34:56.789] [Server thread/INFO] [net.minecraft.server.MinecraftServer/]: <Steve> hi')).toEqual({
      time: '12:34:56',
      level: 'INFO',
      message: '<Steve> hi',
    });
  });

  it('keeps brackets that belong to the message', () => {
    expect(parseLogLine('[12:34:56] [Server thread/INFO]: [Not Secure] <Steve> a]: b')?.message).toBe('[Not Secure] <Steve> a]: b');
  });

  it('ignores lines without a prefix or time', () => {
    expect(parseLogLine('\tat net.minecraft.Foo.bar(Foo.java:1)')).toBeNull();
    expect(parseLogLine('[main/INFO]: no time here')).toBeNull();
  });

  it('defaults to INFO when no level is found', () => {
    expect(parseLogLine('[12:34:56] [thread]: hello')?.level).toBe('INFO');
  });
});

describe('classifyLine', () => {
  it('recognises identity, stop, joins and leaves', () => {
    expect(classify('[12:00:00] [User Authenticator #1/INFO]: UUID of player Steve is 069A79F4-44E9-4726-A5BE-FCA90E38AAF5')).toEqual({
      kind: 'uuid',
      name: 'Steve',
      uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5',
    });
    expect(classify('[12:00:00] [Server thread/INFO]: Stopping server')).toEqual({ kind: 'stop' });
    expect(classify('[12:00:00] [Server thread/INFO]: Bob (formerly known as Rob) joined the game')).toMatchObject({ type: 'join', name: 'Bob' });
    expect(classify('[12:00:00] [Server thread/INFO]: Steve left the game')).toMatchObject({ type: 'leave', name: 'Steve' });
  });

  it('extracts chat, advancements and commands', () => {
    expect(classify('[12:00:00] [Async Chat Thread - #0/INFO]: [Not Secure] <Steve> hello there')).toEqual({ kind: 'event', type: 'chat', name: 'Steve', message: 'hello there' });
    expect(classify('[12:00:00] [Server thread/INFO]: Alex has made the advancement [Stone Age]')).toEqual({ kind: 'event', type: 'advancement', name: 'Alex', message: 'Stone Age' });
    expect(classify('[12:00:00] [Server thread/INFO]: Alex has completed the challenge [How Did We Get Here?]')).toMatchObject({ type: 'advancement', message: 'How Did We Get Here?' });
    expect(classify('[12:00:00 INFO]: Steve issued server command: /home')).toEqual({ kind: 'event', type: 'command', name: 'Steve', message: '/home' });
  });

  it('treats other lines starting with an online player as deaths', () => {
    expect(classify('[12:00:00] [Server thread/INFO]: Steve was slain by Zombie')).toEqual({ kind: 'event', type: 'death', name: 'Steve', message: 'Steve was slain by Zombie' });
    expect(classify('[12:00:00] [Server thread/INFO]: alex fell from a high place')).toMatchObject({ type: 'death', name: 'alex' });
  });

  it('does not mistake other player lines for deaths', () => {
    expect(classify('[12:00:00] [Server thread/INFO]: Steve lost connection: Disconnected')).toBeNull();
    expect(classify('[12:00:00] [Server thread/INFO]: Steve[/127.0.0.1:5000] logged in with entity id 1')).toBeNull();
    expect(classify('[12:00:00] [Server thread/INFO]: Steve has the following entity data: [1d]')).toBeNull();
    expect(classify('[12:00:00] [Server thread/WARN]: Steve moved too quickly!')).toBeNull();
    expect(classify('[12:00:00] [Server thread/INFO]: Notch was slain by Zombie')).toBeNull();
    expect(classify('[12:00:00] [Server thread/INFO]: Done (3.2s)! For help, type "help"')).toBeNull();
    expect(classify('[12:00:00] [Server thread/INFO]: Steve')).toBeNull();
  });

  it('records vanilla command feedback as a command, but not the console or RCON (issue #280)', () => {
    const line = parseLogLine('[18:20:00] [Server thread/INFO]: [Mokkq: Teleported Mokkq to 0.500000, 0.000000, 0.500000]') as LogLine;
    expect(classifyLine(line, new Set(['mokkq']))).toEqual({
      kind: 'event',
      type: 'command',
      name: 'Mokkq',
      message: 'Teleported Mokkq to 0.500000, 0.000000, 0.500000',
    });
    expect(classify('[18:20:00] [Server thread/INFO]: [Steve: Gave 1 [Diamond] to Alex]')).toMatchObject({ type: 'command', message: 'Gave 1 [Diamond] to Alex' });
    expect(classify('[18:20:00] [Server thread/INFO]: [Server: Set the time to 1000]')).toBeNull();
    expect(classify('[18:20:00] [Server thread/INFO]: [Rcon: Saved the game]')).toBeNull();
    // /say output is an announcement, not command feedback
    expect(classify('[18:20:00] [Server thread/INFO]: [Steve] hello')).toBeNull();
  });

  it('ignores the same feedback from named command blocks and entities', () => {
    expect(classify('[18:20:00] [Server thread/INFO]: [DayTimer: Set the time to 1000]')).toBeNull();
    expect(classify('[18:20:00] [Server thread/INFO]: [Bob: Killed Zombie]')).toBeNull();
  });

  // Verbatim from the latest.log attached to issue #280 (vanilla 26.3)
  it('reads a Minecraft 26.3 log, where server messages start with "System chat: "', () => {
    const log = [
      '[09:06:23] [User Authenticator #1/INFO]: UUID of player Mokkq is c8d2b083-98ff-4c25-8dad-a6ef3955d87a',
      '[09:06:29] [Server thread/INFO]: Mokkq[/172.18.0.2:40156] logged in with entity id 11 at (-295.5, 79.0, -547.5)',
      '[09:06:29] [Server thread/INFO]: System chat: Mokkq joined the game',
      '[09:06:39] [Server thread/INFO]: System chat: [Rcon: Made Mokkq a server operator]',
      '[09:06:47] [Server thread/INFO]: System chat: [Mokkq: Teleported Mokkq to 0.500000, 0.000000, 0.500000]',
      "[09:06:51] [Server thread/WARN]: Can't keep up! Is the server overloaded? Running 3741ms or 74 ticks behind",
      '[09:07:10] [Server thread/WARN]: Mokkq moved too quickly! -10.806951037077074,-5.530149145186627,8.940597312479653',
      '[09:07:21] [Server thread/INFO]: <Mokkq> Hi Ketbome',
      '[09:07:38] [Server thread/INFO]: System chat: Mokkq fell from a high place',
      '[09:07:40] [Server thread/INFO]: System chat: Mokkq has made the advancement [Stone Age]',
      '[09:07:57] [Server thread/INFO]: Mokkq lost connection: Disconnected',
      '[09:07:57] [Server thread/INFO]: System chat: Mokkq left the game',
    ];
    const seen = new Set<string>();
    const signals = log.map((raw) => {
      const signal = classifyLine(parseLogLine(raw) as LogLine, seen);
      if (signal?.kind === 'event' && signal.type === 'join') seen.add(signal.name.toLowerCase());
      return signal && (signal.kind === 'event' ? `${signal.type}:${signal.message}` : signal.kind);
    });
    expect(signals).toEqual([
      'uuid',
      null,
      'join:Mokkq joined the game',
      null,
      'command:Teleported Mokkq to 0.500000, 0.000000, 0.500000',
      null,
      null,
      'chat:Hi Ketbome',
      'death:Mokkq fell from a high place',
      'advancement:Stone Age',
      null,
      'leave:Mokkq left the game',
    ]);
  });
});
