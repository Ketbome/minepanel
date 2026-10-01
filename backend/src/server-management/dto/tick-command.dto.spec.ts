import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { TickCommandDto } from './tick-command.dto';

const errors = (body: object) => validate(plainToInstance(TickCommandDto, body));

describe('TickCommandDto', () => {
  it('accepts a command with patterns, and empty values that clear them', async () => {
    expect(await errors({ tickCommand: 'tickinfo', tickTpsPattern: 'TPS: ([\\d.]+)' })).toHaveLength(0);
    expect(await errors({ tickCommand: '', tickTpsPattern: '' })).toHaveLength(0);
  });

  it.each(['tickinfo\nstop', 'tick\rinfo', 'a\u0000b', 'x'.repeat(101), '--host=evil', '-h'])('rejects a multi-line, control-character, oversized or flag-like command: %j', async (tickCommand) => {
    expect(await errors({ tickCommand })).toHaveLength(1);
  });

  it('rejects oversized patterns', async () => {
    expect(await errors({ tickTpsPattern: 'a'.repeat(201) })).toHaveLength(1);
  });
});
