import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateUploadDto {
  // Folder the file goes into, as for the multipart upload.
  @IsOptional()
  @IsString()
  path?: string;

  // File name, or a path relative to `path` when a folder is uploaded.
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  size: number;

  // false refuses to replace an existing file (409), before any byte is sent.
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}
