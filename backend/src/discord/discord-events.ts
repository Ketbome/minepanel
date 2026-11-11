// Every notification a server can route to its own (or a shared) Discord webhook.
// Activity kinds come from the game log; operational kinds are the panel alerts
// that can be redirected from the instance-wide channel to a server's channel.
export const ACTIVITY_EVENT_KEYS = ['chat', 'command', 'join', 'leave', 'death', 'advancement', 'console'] as const;

// `disk` is deliberately absent: the filesystem probe is instance-wide and never
// carries a server ID, so a per-server route for it would never be read.
export const OPERATIONAL_EVENT_KEYS = ['down', 'crash', 'cpu', 'memory', 'backup', 'task', 'game', 'stale', 'recovery'] as const;

// Server lifecycle events (created, started, stopped, deleted, restart/operation
// errors) can be routed like alerts; without a route they use the delivery mode.
export const LIFECYCLE_EVENT_KEYS = ['lifecycle'] as const;

export const ROUTABLE_EVENT_KEYS = [...ACTIVITY_EVENT_KEYS, ...OPERATIONAL_EVENT_KEYS, ...LIFECYCLE_EVENT_KEYS] as const;

export type ActivityEventKey = (typeof ACTIVITY_EVENT_KEYS)[number];
export type OperationalEventKey = (typeof OPERATIONAL_EVENT_KEYS)[number];
export type LifecycleEventKey = (typeof LIFECYCLE_EVENT_KEYS)[number];
export type RoutableEventKey = (typeof ROUTABLE_EVENT_KEYS)[number];

// A configured "instance" route means "keep using the Minepanel channel"; removing
// the row is how that default is restored, so it never appears as a stored value.
const ACTIVITY_KEYS = new Set<string>(ACTIVITY_EVENT_KEYS);
const OPERATIONAL_KEYS = new Set<string>(OPERATIONAL_EVENT_KEYS);
const LIFECYCLE_KEYS = new Set<string>(LIFECYCLE_EVENT_KEYS);

export function isRoutableEventKey(value: string): value is RoutableEventKey {
  return ACTIVITY_KEYS.has(value) || OPERATIONAL_KEYS.has(value) || LIFECYCLE_KEYS.has(value);
}

export function isOperationalEventKey(value: string): value is OperationalEventKey {
  return OPERATIONAL_KEYS.has(value);
}
