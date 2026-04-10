import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Min, ValidateIf } from 'class-validator';

export class ImportWorldDto {
  @IsEnum(['curseforge', 'url'])
  provider: 'curseforge' | 'url';

  @ValidateIf((o: ImportWorldDto) => o.provider === 'curseforge')
  @IsNotEmpty()
  @IsString()
  projectId?: string;

  @ValidateIf((o: ImportWorldDto) => o.provider === 'curseforge' && o.fileId !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fileId?: number;

  @ValidateIf((o: ImportWorldDto) => o.provider === 'url')
  @IsUrl({ require_protocol: true })
  downloadUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  targetFolder?: string;
}
