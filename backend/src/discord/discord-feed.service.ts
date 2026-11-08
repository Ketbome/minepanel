import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ActivityEventKey } from './discord-events';
import { DiscordRoutingService } from './discord-routing.service';
import { DiscordService } from './discord.service';

// Chat can arrive faster than Discord accepts messages, so feed events are
// queued and flushed in small batches instead of one POST per line.
const FLUSH_INTERVAL_MS = 5_000;
const MAX_QUEUED = 200;
const MAX_LINES_PER_MESSAGE = 10;
const MAX_LINE_CHARS = 200;

const ICONS: Record<ActivityEventKey, string> = {
  chat: '💬',
  command: '⚙️',
  join: '➡️',
  leave: '⬅️',
  death: '💀',
  advancement: '🏆',
  console: '🛠️',
};

interface FeedEntry {
  key: ActivityEventKey;
  line: string;
}

interface FeedEvent {
  type: string;
  name: string;
  message: string;
}

@Injectable()
export class DiscordFeedService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordFeedService.name);
  private readonly queues = new Map<string, FeedEntry[]>();
  private timer: NodeJS.Timeout | null = null;
  private flushing = false;

  constructor(
    private readonly routing: DiscordRoutingService,
    private readonly discord: DiscordService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // Called by the activity ingest after the events are stored. Never throws:
  // a Discord problem must not break reading the game log.
  publishActivity(serverId: string, events: FeedEvent[]): void {
    for (const event of events) {
      const key = event.type as ActivityEventKey;
      if (!(key in ICONS)) continue;
      this.enqueue(serverId, { key, line: formatActivity(key, event) });
    }
  }

  publishConsole(serverId: string, actor: string, command: string, success: boolean): void {
    const line = `${ICONS.console} ${clean(actor)}: ${clean(command)}${success ? '' : ' (failed)'}`;
    this.enqueue(serverId, { key: 'console', line });
  }

  /** Drains the queues; also the entry point used by tests. */
  async flush(serverId?: string): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    try {
      const servers = serverId ? [serverId] : [...this.queues.keys()];
      for (const id of servers) {
        try {
          await this.flushServer(id);
        } catch (error) {
          this.logger.warn(`Discord feed delivery failed for ${id}: ${(error as Error).message}`);
        }
      }
    } finally {
      this.flushing = false;
    }
  }

  private enqueue(serverId: string, entry: FeedEntry): void {
    const queue = this.queues.get(serverId) ?? [];
    queue.push(entry);
    // A webhook that stays broken must not grow the queue without bound.
    if (queue.length > MAX_QUEUED) queue.splice(0, queue.length - MAX_QUEUED);
    this.queues.set(serverId, queue);
  }

  private async flushServer(serverId: string): Promise<void> {
    const queue = this.queues.get(serverId);
    if (!queue?.length) {
      this.queues.delete(serverId);
      return;
    }
    const batch = queue.splice(0, MAX_QUEUED);
    const mode = await this.routing.channelMode().catch(() => 'per-server' as const);
    const sharedTarget = mode === 'shared' ? await this.routing.sharedChannel().catch(() => null) : null;
    const enabled = await this.hasActivityRoutes(serverId, !!sharedTarget?.url);
    if (!enabled) return;

    const groups = new Map<string, { url: string; shared: boolean; lines: string[] }>();
    for (const entry of batch) {
      const targets = await this.routing.resolve(serverId, entry.key);
      const resolved = targets ?? (sharedTarget?.url ? [sharedTarget] : []);
      for (const target of resolved) {
        if (!target.url) continue;
        const group = groups.get(target.url) ?? { url: target.url, shared: target.shared, lines: [] };
        group.lines.push(entry.line);
        groups.set(target.url, group);
      }
    }

    const serverName = await this.routing.serverName(serverId);
    for (const group of groups.values()) {
      for (let index = 0; index < group.lines.length; index += MAX_LINES_PER_MESSAGE) {
        await this.discord.sendActivity(group.url, serverName, group.shared, group.lines.slice(index, index + MAX_LINES_PER_MESSAGE));
      }
    }
  }

  // Avoids one query per queued entry on servers that route no activity at all.
  // In shared mode the instance channel is the default, so there is always a target.
  private async hasActivityRoutes(serverId: string, shared: boolean): Promise<boolean> {
    if (shared) return true;
    const state = await this.routing.listFor(serverId);
    return Object.values(state.routes).some((webhookId) => webhookId !== null);
  }
}

function formatActivity(key: ActivityEventKey, event: FeedEvent): string {
  const name = clean(event.name);
  if (key === 'join') return `${ICONS.join} ${name} joined`;
  if (key === 'leave') return `${ICONS.leave} ${name} left`;
  if (key === 'death') return `${ICONS.death} ${clean(event.message) || `${name} died`}`;
  return `${ICONS[key]} ${name}: ${clean(event.message)}`;
}

// Player text must not break out of the embed: control characters and newlines
// are flattened and backticks escaped, then the line is capped.
function clean(text: string, max = MAX_LINE_CHARS): string {
  const flat = Array.from(text ?? '')
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code < 0x20 || code === 0x7f ? ' ' : character;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/`/g, "'")
    .trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
