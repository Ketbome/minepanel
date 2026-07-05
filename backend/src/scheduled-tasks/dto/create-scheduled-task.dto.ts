import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ScheduledTaskType, ScheduleKind } from '../entities/scheduled-task.entity';

export class CreateScheduledTaskDto {
  @IsString()
  @MinLength(1, { message: 'name is required' })
  @MaxLength(64, { message: 'name must be at most 64 characters' })
  name: string;

  @IsIn(['restart', 'command'], { message: 'type must be "restart" or "command"' })
  type: ScheduledTaskType;

  @IsOptional()
  @IsString()
  @MaxLength(1024, { message: 'command must be at most 1024 characters' })
  command?: string;

  @IsOptional()
  @IsIn(['interval', 'cron'], { message: 'scheduleKind must be "interval" or "cron"' })
  scheduleKind?: ScheduleKind;

  @IsOptional()
  @IsInt({ message: 'intervalMinutes must be an integer' })
  @Min(1, { message: 'intervalMinutes must be at least 1' })
  @Max(43200, { message: 'intervalMinutes must be at most 43200 (30 days)' })
  intervalMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'cronExpression must be at most 120 characters' })
  cronExpression?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
