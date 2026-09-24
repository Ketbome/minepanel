export interface PlayerEvent {
  at: Date;
  key: string;
  name: string;
  joined: boolean;
}

// Match the server's complete message, never chat text containing a join/leave phrase.
export function parsePlayerEvents(logs: string, bedrock: boolean): PlayerEvent[] {
  const events: PlayerEvent[] = [];
  for (const line of logs.split('\n')) {
    const timestamp = /^(\S+)\s+(.*)$/.exec(line);
    if (!timestamp) continue;
    const at = new Date(timestamp[1]);
    if (!Number.isFinite(at.getTime())) continue;
    // eslint-disable-next-line no-control-regex -- Server consoles emit ANSI color escapes.
    const message = timestamp[2].replace(/\u001b\[[0-9;]*m/g, '');
    if (bedrock) {
      const match = /^\[[^\]]+ INFO\]\s+Player (connected|disconnected): (.{1,64}), xuid: (\d+)(?:,.*)?$/.exec(message);
      if (match) events.push({ at, key: `bedrock:${match[3]}`, name: match[2], joined: match[1] === 'connected' });
    } else {
      const match = /^(?:\[[^\]]+\] \[Server thread\/INFO\](?: \[[^\]]+\])?|\[\d{2}:\d{2}:\d{2} INFO\]): ([a-zA-Z0-9_.-]{1,32}) (joined|left) the game$/.exec(message);
      if (match) events.push({ at, key: `java:${match[1].toLowerCase()}`, name: match[1], joined: match[2] === 'joined' });
    }
  }
  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}
