import { IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  cfApiKey?: string;

  @IsOptional()
  @IsString()
  discordWebhook?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  preferences?: Record<string, any>;
}

export class SettingsResponseDto {
  cfApiKey?: string;
  discordWebhook?: string;
  language: string;
  preferences?: Record<string, any>;
}
