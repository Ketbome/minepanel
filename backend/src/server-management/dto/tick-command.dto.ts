import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { MAX_TICK_PATTERN_LENGTH } from 'src/metrics/tick-stats';

// One line, no control characters: the command reaches rcon-cli as a single argument on every poll.
// eslint-disable-next-line no-control-regex
const SINGLE_LINE = /^[^\u0000-\u001f\u007f]*$/;

// Empty strings clear the field. Patterns are compiled by the controller, which rejects a bad one.
export class TickCommandDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'tickCommand must be at most 100 characters' })
  @Matches(SINGLE_LINE, { message: 'tickCommand must be a single line' })
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
