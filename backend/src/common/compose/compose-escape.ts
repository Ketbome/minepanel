// Compose interpolates `$VAR` / `${VAR}` in every value from the panel's own
// environment, so a user-controlled field such as a MOTD could read
// `${JWT_SECRET}`. `$$` is Compose's literal dollar.
export function escapeComposeValues<T>(value: T): T {
  if (typeof value === 'string') return value.split('$').join('$$') as T;
  if (Array.isArray(value)) return value.map((item) => escapeComposeValues(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, escapeComposeValues(item)])) as T;
  }
  return value;
}
