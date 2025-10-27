import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUsersDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;
}

export class UpdateUsersDto extends PartialType(CreateUsersDto) {}

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Current password is required' })
  @IsString()
  currentPassword: string;

  @IsNotEmpty({ message: 'New password is required' })
  @IsString()
  newPassword: string;
}
