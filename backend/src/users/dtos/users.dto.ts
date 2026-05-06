import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { UserRole } from '../access-control.types';

export class CreateUsersDto {
  @IsNotEmpty({ message: 'Username is required' })
  @IsString()
  username: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be valid' })
  email?: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}

export class UpdateUsersDto extends PartialType(CreateUsersDto) {}

export class UserPermissionsDto {
  @IsOptional()
  @IsBoolean()
  manageUsers?: boolean;

  @IsOptional()
  @IsBoolean()
  accessAllServers?: boolean;

  @IsOptional()
  @IsBoolean()
  viewLogs?: boolean;

  @IsOptional()
  @IsBoolean()
  useConsole?: boolean;

  @IsOptional()
  @IsBoolean()
  viewGlobalFiles?: boolean;

  @IsOptional()
  @IsBoolean()
  useGlobalFiles?: boolean;

  @IsOptional()
  @IsBoolean()
  viewServerFiles?: boolean;

  @IsOptional()
  @IsBoolean()
  useServerFiles?: boolean;
}

export class UpdateUserAccessDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserPermissionsDto)
  permissions?: UserPermissionsDto;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  serverAccess?: string[];
}

export class CreateUserInvitationDto {
  @IsOptional()
  @IsEmail({}, { message: 'Email must be valid' })
  email?: string;

  @IsOptional()
  @IsIn(['USER'])
  role?: UserRole;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserPermissionsDto)
  permissions?: UserPermissionsDto;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  serverAccess?: string[];
}

export class UpdateProfileDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be valid' })
  email: string;
}

export class ConfirmEmailChangeDto {
  @IsNotEmpty({ message: 'Confirmation code is required' })
  @IsString()
  code: string;
}

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Current password is required' })
  @IsString()
  currentPassword: string;

  @IsNotEmpty({ message: 'New password is required' })
  @IsString()
  newPassword: string;
}
