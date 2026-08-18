import { IsOptional, IsString } from 'class-validator';

export class UpdateDesiredVersionDto {
  @IsOptional()
  @IsString()
  desiredMcVersion?: string | null;
}
