import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { UserPermissionsDto } from 'src/users/dtos/users.dto';

export const API_TOKEN_EXPIRY_DAYS = [30, 90, 365] as const;

export class CreateApiTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;

  @IsOptional()
  @IsBoolean()
  admin?: boolean;

  @IsOptional()
  @IsBoolean()
  readOnly?: boolean;

  @ValidateNested()
  @Type(() => UserPermissionsDto)
  permissions: UserPermissionsDto;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  serverAccess: string[];

  // null means the token never expires; omitted means the 90-day default.
  @IsOptional()
  @IsIn(API_TOKEN_EXPIRY_DAYS)
  expiresInDays?: (typeof API_TOKEN_EXPIRY_DAYS)[number] | null;
}
