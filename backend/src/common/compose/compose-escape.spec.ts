import { escapeComposeValues } from './compose-escape';

describe('escapeComposeValues', () => {
  it('doubles every dollar in nested values and leaves keys and non-strings alone', () => {
    const input = { services: { mc: { environment: { MOTD: '${JWT_SECRET} costs $5', MAX: 10, ON: true }, volumes: ['./${A:-..}:/x'] } }, $key: null };

    expect(escapeComposeValues(input)).toEqual({
      services: { mc: { environment: { MOTD: '$${JWT_SECRET} costs $$5', MAX: 10, ON: true }, volumes: ['./$${A:-..}:/x'] } },
      $key: null,
    });
    expect(input.services.mc.environment.MOTD).toBe('${JWT_SECRET} costs $5');
  });
});
