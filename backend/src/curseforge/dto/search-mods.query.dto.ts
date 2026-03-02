import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchCurseforgeModsQueryDto {
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

  @IsString()
  @IsNotEmpty()
  minecraftVersion: string;

  @IsOptional()
  @IsEnum(['forge', 'neoforge', 'fabric', 'quilt'])
  loader?: 'forge' | 'neoforge' | 'fabric' | 'quilt';
}
