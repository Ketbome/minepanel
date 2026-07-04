import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateAlertConfigDto {
  @IsBoolean()
  @IsOptional()
  downAlertEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  resourceAlertEnabled?: boolean;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  cpuThresholdPercent?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  memoryThresholdPercent?: number;

  @IsInt()
  @Min(1)
  @Max(1440)
  @IsOptional()
  sustainedMinutes?: number;

  @IsInt()
  @Min(1)
  @Max(10080)
  @IsOptional()
  cooldownMinutes?: number;
}
