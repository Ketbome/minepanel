// Compose interpolates `$VAR` / `${VAR}` in every value from the panel's own
// environment, so a user-controlled field such as a MOTD could read
// `${JWT_SECRET}`. `$$` is Compose's literal dollar.
export function escapeComposeValues<T>(value: T): T {
  return mapStrings(value, (text) => text.split('$').join('$$'));
}

// Reading a compose file back: what Compose would pass to the container.
export function unescapeComposeValues<T>(value: T): T {
  return mapStrings(value, (text) => text.split('$$').join('$'));
}

function mapStrings<T>(value: T, map: (text: string) => string): T {
  if (typeof value === 'string') return map(value) as T;
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, map)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapStrings(item, map)])) as T;
  }
  return value;
}
