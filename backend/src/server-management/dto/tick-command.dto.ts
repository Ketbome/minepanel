import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { MAX_TICK_PATTERN_LENGTH } from 'src/metrics/tick-stats';

// One line, no control characters, and no leading dash (no Minecraft command starts with one, and
// rcon-cli reads it as a flag): the command reaches rcon-cli as a single argument on every poll.
// eslint-disable-next-line no-control-regex
const SINGLE_LINE = /^(?!-)[^\u0000-\u001f\u007f]*$/;

// Empty strings clear the field. Patterns are compiled by the controller, which rejects a bad one.
export class TickCommandDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100, { message: 'tickCommand must be at most 100 characters' })
  @Matches(SINGLE_LINE, { message: 'tickCommand must be a single line and must not start with "-"' })
  tickCommand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_TICK_PATTERN_LENGTH)
  tickTpsPattern?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_TICK_PATTERN_LENGTH)
  tickMsptPattern?: string;
}
