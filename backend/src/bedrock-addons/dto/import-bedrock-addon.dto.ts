import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ImportBedrockAddonDto {
  @IsString()
  projectId: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  fileId?: number;
}
