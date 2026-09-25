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
});
