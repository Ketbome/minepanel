// Mirrors Docker's short-syntax port parser (github.com/docker/go-connections, nat.ParsePortSpec)
// plus compose-go's "target port must not be 0" check, so a spec accepted here is one
// `docker compose up` accepts. Deliberately stricter where Compose would silently rewrite the
// spec instead of failing: "3091:3091/" becomes tcp (the user loses the protocol) and a host
// range like "1-2-3" is truncated to "1-2".
// This file is duplicated byte-for-byte at backend/src/common/compose/port-mapping.ts and
// frontend/src/lib/server-config/port-mapping.ts; port-mapping.spec.ts fails if they drift.

const PORT_NUMBER = /^\d{1,5}$/;
const IPV4 = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

const parsePortRange = (raw: string): [number, number] | null => {
  const dash = raw.indexOf('-');
  const [start, end] = dash === -1 ? [raw, raw] : [raw.slice(0, dash), raw.slice(dash + 1)];
  if (!PORT_NUMBER.test(start) || !PORT_NUMBER.test(end)) return null;
  const [from, to] = [Number(start), Number(end)];
  return from <= 65535 && to <= 65535 && from <= to ? [from, to] : null;
};

const isValidIp = (ip: string) => {
  if (IPV4.test(ip)) return true;
  if (!ip.includes(':')) return false;
  // WHATWG URL parsing validates IPv6 (incl. embedded IPv4) and, like Go's net.ParseIP, rejects zone ids.
  try {
    new URL(`http://[${ip}]/`);
    return true;
  } catch {
    return false;
  }
};

export const isValidPortMapping = (spec: string): boolean => {
  const parts = spec.split(':');
  const container = parts[parts.length - 1];
  const host = parts.length > 1 ? parts[parts.length - 2] : '';
  let ip = parts.length > 2 ? parts.slice(0, -2).join(':') : '';

  const slash = container.indexOf('/');
  const containerPort = slash === -1 ? container : container.slice(0, slash);
  if (slash !== -1 && !['tcp', 'udp', 'sctp'].includes(container.slice(slash + 1).toLowerCase())) return false;

  if (ip.startsWith('[')) {
    if (!ip.endsWith(']')) return false;
    ip = ip.slice(1, -1);
  }
  if (ip !== '' && !isValidIp(ip)) return false;

  const containerRange = parsePortRange(containerPort);
  if (!containerRange || containerRange[0] === 0) return false;
  if (host === '') return true;

  const hostRange = parsePortRange(host);
  if (!hostRange) return false;
  // A host range may map onto a single container port (dynamic allocation); otherwise sizes must match.
  const containerIsRange = containerRange[0] !== containerRange[1];
  return !containerIsRange || hostRange[1] - hostRange[0] === containerRange[1] - containerRange[0];
};
