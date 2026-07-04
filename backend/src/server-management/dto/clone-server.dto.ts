import { IsOptional, IsString, Matches } from 'class-validator';

export class CloneServerDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Server ID can only contain letters, numbers, hyphens, and underscores' })
  newId: string;

  @IsString()
  @IsOptional()
  serverName?: string;
}
