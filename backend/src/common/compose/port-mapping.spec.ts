import { readFileSync } from 'fs';
import { join } from 'path';
import { isValidPortMapping } from './port-mapping';

// Expectations were checked against `docker compose config` (Compose v5.0.2); the ones
// marked "stricter" are accepted by Compose but silently rewritten, so we reject them.
describe('isValidPortMapping', () => {
  it.each([
    '3000',
    '3000-3005',
    '3091/udp',
    '8000:8000',
    '9090-9091:8080-8081',
    '49100:22',
    '8000-9000:80',
    '80-81:8000',
    '0:3091',
    '65535:65535',
    ':3091',
    '::3091',
    '127.0.0.1:8001:8001',
    '127.0.0.1:5000-5010:5000-5010',
    '127.0.0.1::5000',
    '127.0.0.1:0:3091',
    '0.0.0.0:3091:3091/udp',
    '::1:6000:6000',
    '[::1]:6001:6001',
    '[::1]::3091',
    '[1.2.3.4]:80:80',
    'fe80::1:3091:3091',
    '::ffff:1.2.3.4:80:80',
    '2001:db8::1:80:80/udp',
    '6060:6060/udp',
    '3091:3091/tcp',
    '3091:3091/sctp',
    '3091:3091/UDP',
    '3091:3091/Udp',
  ])('accepts %s', (spec) => {
    expect(isValidPortMapping(spec)).toBe(true);
  });

  it.each([
    '3091:3091/', // stricter: Compose silently turns this into tcp
    '1-2-3:80', // stricter: Compose silently truncates the host range to 1-2
    '3091/tcp:3091/tcp',
    '/udp',
    '3091:3091/tpc',
    '80:80/tcp/udp',
    'abc',
    '3091:',
    '3091:3091 ',
    '0',
    '3091:0',
    '99999:3091',
    '3091:99999',
    '65536:80',
    '3091-3090:3091-3090',
    '80-:80',
    '7000-7010:7000-7005',
    '80:8000-8001',
    '127.0.0.1:3091',
    'localhost:3091:3091',
    '300.1.1.1:3091:3091',
    '1.2.3:80:80',
    '01.2.3.4:80:80',
    '[::1:80:80',
    '[fe80::1%eth0]:3091:3091',
  ])('rejects %s', (spec) => {
    expect(isValidPortMapping(spec)).toBe(false);
  });
});

describe('port-mapping.ts frontend copy', () => {
  it('is identical to the backend file', () => {
    const read = (relative: string) => readFileSync(join(__dirname, relative), 'utf8');

    expect(read('../../../../frontend/src/lib/server-config/port-mapping.ts')).toBe(read('port-mapping.ts'));
  });
});
