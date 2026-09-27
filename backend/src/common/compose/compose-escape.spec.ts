import { escapeComposeValues, unescapeComposeValues } from './compose-escape';

describe('escapeComposeValues', () => {
  it('doubles every dollar in nested values and leaves keys and non-strings alone', () => {
    const input = { services: { mc: { environment: { MOTD: '${JWT_SECRET} costs $5', MAX: 10, ON: true }, volumes: ['./${A:-..}:/x'] } }, $key: null };

    expect(escapeComposeValues(input)).toEqual({
      services: { mc: { environment: { MOTD: '$${JWT_SECRET} costs $$5', MAX: 10, ON: true }, volumes: ['./$${A:-..}:/x'] } },
      $key: null,
    });
    expect(input.services.mc.environment.MOTD).toBe('${JWT_SECRET} costs $5');
  });

  it('reads an escaped value back as what Compose passes to the container', () => {
    const escaped = escapeComposeValues({ environment: { MOTD: '${JWT_SECRET} costs $5 ($$)' }, ports: ['25565:25565'] });

    expect(unescapeComposeValues(escaped)).toEqual({ environment: { MOTD: '${JWT_SECRET} costs $5 ($$)' }, ports: ['25565:25565'] });
  });
});
