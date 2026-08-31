import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateModWatchDto } from './mod-watch.dto';

describe('UpdateModWatchDto', () => {
  it('accepts provider-namespaced note keys', async () => {
    const dto = plainToInstance(UpdateModWatchDto, {
      notes: { 'curseforge:jei': 'blocks the update', 'modrinth:sodium': 'waiting on Iris' },
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('still accepts bare mod refs as note keys', async () => {
    const dto = plainToInstance(UpdateModWatchDto, {
      notes: { sodium: 'saved before the namespacing' },
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects note keys that cannot name a configured mod', async () => {
    const dto = plainToInstance(UpdateModWatchDto, {
      notes: { '../etc/passwd': 'nope' },
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'notes')).toBe(true);
  });

  it('rejects an unknown provider prefix', async () => {
    const dto = plainToInstance(UpdateModWatchDto, {
      notes: { 'github:sodium': 'nope' },
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'notes')).toBe(true);
  });

  it('rejects a targetVersion that is not a Minecraft version', async () => {
    const dto = plainToInstance(UpdateModWatchDto, {
      targetVersion: '1.21.4; rm -rf /',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'targetVersion')).toBe(true);
  });
});
