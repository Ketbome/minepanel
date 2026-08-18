import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class QueueModChangeDto {
  @IsEnum(['curseforge', 'modrinth'])
  provider: 'curseforge' | 'modrinth';

  @IsString()
  ref: string;

  @IsEnum(['add', 'remove'])
  action: 'add' | 'remove';

  @IsOptional()
  @IsString()
  version?: string;

  @IsString()
  @MaxLength(200)
  label: string;
}
