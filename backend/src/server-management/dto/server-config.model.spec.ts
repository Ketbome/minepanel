import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MAX_EVENT_COMMANDS, normalizeEventCommands, UpdateServerConfigDto } from './server-config.model';

const extraPortsErrors = async (extraPorts: unknown) => {
  const errors = await validate(plainToInstance(UpdateServerConfigDto, { extraPorts }));
  return errors.filter((error) => error.property === 'extraPorts');
};

describe('UpdateServerConfigDto extraPorts', () => {
  it('accepts valid mappings, including the same port on tcp and udp', async () => {
    expect(await extraPortsErrors(['3091:3091/tcp', '3091:3091/udp', '19132:19132/udp'])).toHaveLength(0);
  });

  it('rejects a list containing one malformed mapping', async () => {
    const errors = await extraPortsErrors(['3091:3091/tcp', '3091/udp:3091/udp']);

    expect(errors).toHaveLength(1);
    expect(Object.values(errors[0].constraints ?? {}).join()).toContain('Docker Compose port syntax');
  });

  it('rejects non-string entries', async () => {
    expect(await extraPortsErrors([3091])).toHaveLength(1);
  });
});

describe('UpdateServerConfigDto experimentalPacks', () => {
  const errorsFor = async (experimentalPacks: unknown) =>
    (await validate(plainToInstance(UpdateServerConfigDto, { experimentalPacks }))).filter((error) => error.property === 'experimentalPacks');

  it('accepts the built-in feature packs and an empty list', async () => {
    expect(await errorsFor(['minecart_improvements', 'redstone_experiments', 'trade_rebalance'])).toHaveLength(0);
    expect(await errorsFor([])).toHaveLength(0);
  });

  it('rejects unknown packs, non-lists and oversized lists', async () => {
    expect(await errorsFor(['vanilla'])).toHaveLength(1);
    expect(await errorsFor(['bundle,update_1_21'])).toHaveLength(1);
    expect(await errorsFor('minecart_improvements')).toHaveLength(1);
    expect(await errorsFor(['trade_rebalance', 'trade_rebalance', 'trade_rebalance', 'trade_rebalance'])).toHaveLength(1);
  });
});

describe('normalizeEventCommands', () => {
  it('keeps one trimmed command per line without a leading slash', () => {
    expect(normalizeEventCommands(' /say hi \n\n//give @a bread\n  ')).toBe('say hi\ngive @a bread');
    expect(normalizeEventCommands('\n / \n')).toBeNull();
    expect(normalizeEventCommands(undefined)).toBeNull();
  });

  it('caps the list', () => {
    const many = Array.from({ length: MAX_EVENT_COMMANDS + 5 }, (_, i) => `say ${i}`).join('\n');
    expect(normalizeEventCommands(many)?.split('\n')).toHaveLength(MAX_EVENT_COMMANDS);
  });
});
