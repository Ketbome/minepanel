import { IsBoolean, IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export const LOG_LEVELS = ['all', 'error', 'warn', 'info', 'debug'] as const;
export const LOG_LINES = [100, 500, 1000, 2000] as const;

export class SaveLogPresetDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  serverId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  @IsString()
  @MaxLength(200)
  searchTerm: string;

  @IsIn(LOG_LEVELS)
  levelFilter: string;

  @IsBoolean()
  regex: boolean;

  @IsIn(LOG_LINES)
  lines: number;

  @IsInt()
  @Min(0)
  @Max(1440)
  sinceMinutes: number;
}

export class LogPresetServerQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  serverId: string;
}

export class LogPresetRemoveQueryDto extends LogPresetServerQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;
}
