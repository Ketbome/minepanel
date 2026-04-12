import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchBedrockAddonsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  index?: number;
}
