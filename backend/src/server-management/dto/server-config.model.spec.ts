import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateServerConfigDto } from './server-config.model';

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
