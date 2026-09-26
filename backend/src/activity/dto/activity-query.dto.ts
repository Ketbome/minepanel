import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const TYPES = ['join', 'leave', 'chat', 'death', 'advancement', 'command'] as const;

export class ActivityEventsQueryDto {
  // Comma separated, e.g. "chat,death"
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsArray()
  @IsIn(TYPES, { each: true })
  types?: (typeof TYPES)[number][];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  before?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class UpdateActivitySettingsDto {
  @IsBoolean()
  enabled: boolean;
}
