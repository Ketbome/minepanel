import { IsIn, IsOptional, IsString } from 'class-validator';

// Payload sent by mc-router when auto-scaling a statically-routed server.
export class AutoScaleDto {
  @IsIn(['up', 'down'])
  action: 'up' | 'down';

  @IsString()
  @IsOptional()
  serverAddress?: string;

  @IsString()
  @IsOptional()
  backend?: string;
}
