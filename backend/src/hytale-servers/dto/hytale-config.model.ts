import { IsString, IsOptional, IsBoolean, IsNotEmpty, IsEnum, Matches } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

/**
 * Hytale server configuration DTO
 */
export class HytaleConfigDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Server ID can only contain letters, numbers, hyphens and underscores',
  })
  id: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsString()
  @IsOptional()
  serverName?: string;

  @IsString()
  @IsOptional()
  port?: string;

  // Java/Memory settings
  @IsString()
  @IsOptional()
  javaXms?: string;

  @IsString()
  @IsOptional()
  javaXmx?: string;

  @IsBoolean()
  @IsOptional()
  useG1gc?: boolean;

  // Game settings
  @IsString()
  @IsOptional()
  viewDistance?: string;

  @IsString()
  @IsOptional()
  maxPlayers?: string;

  @IsString()
  @IsOptional()
  serverDescription?: string;

  // Docker settings
  @IsString()
  @IsOptional()
  dockerImage?: string;

  @IsEnum(['no', 'always', 'on-failure', 'unless-stopped'])
  @IsOptional()
  restartPolicy?: 'no' | 'always' | 'on-failure' | 'unless-stopped';

  @IsString()
  @IsOptional()
  tz?: string;

  @IsString()
  @IsOptional()
  envVars?: string;

  @IsString()
  @IsOptional()
  bindAddr?: string;

  @IsBoolean()
  @IsOptional()
  autoDownload?: boolean;
}

export class UpdateHytaleConfigDto extends PartialType(HytaleConfigDto) {}

export class CreateHytaleServerDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Server ID can only contain letters, numbers, hyphens and underscores',
  })
  id: string;

  @IsString()
  @IsOptional()
  serverName?: string;

  @IsString()
  @IsOptional()
  port?: string;
}

/**
 * Full Hytale server configuration type
 */
export interface HytaleConfig {
  id: string;
  active: boolean;
  serverName: string;
  port: string;
  javaXms: string;
  javaXmx: string;
  useG1gc: boolean;
  viewDistance?: string;
  maxPlayers?: string;
  serverDescription?: string;
  dockerImage: string;
  restartPolicy: 'no' | 'always' | 'on-failure' | 'unless-stopped';
  tz: string;
  envVars?: string;
  bindAddr: string;
  autoDownload: boolean;
}

/**
 * Simplified Hytale server list item
 */
export interface HytaleServerListItem {
  id: string;
  serverName: string;
  port: string;
  active: boolean;
}
