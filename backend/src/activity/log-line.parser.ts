export type ActivityType = 'join' | 'leave' | 'chat' | 'death' | 'advancement' | 'command';

export interface LogLine {
  time: string;
  level: string;
  message: string;
}

export type LogSignal =
  | { kind: 'event'; type: ActivityType; name: string; message: string }
  | { kind: 'uuid'; name: string; uuid: string }
  | { kind: 'stop' };

// Vanilla/Fabric: "[12:34:56] [Server thread/INFO]: msg"; Paper: "[12:34:56 INFO]: msg";
// Forge/NeoForge: "[25Sep2026 12:34:56.789] [Server thread/INFO] [net.minecraft.server.MinecraftServer/]: msg"
const PREFIX = /^((?:\[[^\]]*\]\s*)+):\s(.*)$/;
const TIME = /(\d{2}:\d{2}:\d{2})/;
const LEVEL = /[/\s](INFO|WARN|ERROR|DEBUG|FATAL)\]/;

const UUID_LINE = /^UUID of player (\S+) is ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const JOIN = /^(\S+)(?: \(formerly known as \S+\))? joined the game$/;
const LEAVE = /^(\S+) left the game$/;
const CHAT = /^(?:\[Not Secure\] )?<(\S+)> (.*)$/;
const ADVANCEMENT = /^(\S+) has (?:made the advancement|completed the challenge|reached the goal) \[(.+)\]$/;
const COMMAND = /^(\S+) issued server command: (.*)$/;
// Lines that start with a player name but are not deaths
const NOT_DEATH = /^(?:lost connection|logged in|moved|has |issued |joined |left |was kicked|\[)/;

export function parseLogLine(raw: string): LogLine | null {
  const match = PREFIX.exec(raw.trimEnd());
  if (!match) {
    return null;
  }
  const time = TIME.exec(match[1])?.[1];
  if (!time) {
    return null;
  }
  return { time, level: LEVEL.exec(match[1])?.[1] ?? 'INFO', message: match[2] };
}

// Death messages are too varied to enumerate, so a death is any INFO line that starts with the
// name of someone online and matches nothing else.
export function classifyLine(line: LogLine, online: ReadonlySet<string>): LogSignal | null {
  const { message } = line;
  let match: RegExpExecArray | null;

  if ((match = UUID_LINE.exec(message))) return { kind: 'uuid', name: match[1], uuid: match[2].toLowerCase() };
  if (message === 'Stopping server') return { kind: 'stop' };
  if ((match = JOIN.exec(message))) return { kind: 'event', type: 'join', name: match[1], message };
  if ((match = LEAVE.exec(message))) return { kind: 'event', type: 'leave', name: match[1], message };
  if ((match = CHAT.exec(message))) return { kind: 'event', type: 'chat', name: match[1], message: match[2] };
  if ((match = ADVANCEMENT.exec(message))) return { kind: 'event', type: 'advancement', name: match[1], message: match[2] };
  if ((match = COMMAND.exec(message))) return { kind: 'event', type: 'command', name: match[1], message: match[2] };

  if (line.level !== 'INFO') return null;
  const space = message.indexOf(' ');
  const name = space > 0 ? message.slice(0, space) : '';
  if (name && online.has(name.toLowerCase()) && !NOT_DEATH.test(message.slice(space + 1))) {
    return { kind: 'event', type: 'death', name, message };
  }
  return null;
}
