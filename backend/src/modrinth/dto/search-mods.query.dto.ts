import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchModrinthModsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  @IsString()
  @IsNotEmpty()
  minecraftVersion: string;

  @IsOptional()
  @IsEnum(['forge', 'neoforge', 'fabric', 'quilt'])
  loader?: 'forge' | 'neoforge' | 'fabric' | 'quilt';
}
