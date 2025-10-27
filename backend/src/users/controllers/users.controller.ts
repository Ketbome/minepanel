import { Controller, Get, UseGuards, Request, ValidationPipe, Body, Post, Param, Patch, Delete, Put } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PayloadToken } from 'src/auth/models/token.model';
import { UsersService } from '../services/users.service';
import { ChangePasswordDto, CreateUsersDto, UpdateUsersDto } from '../dtos/users.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getUsers() {
    return this.usersService.getUsers();
  }

  @Get('one')
  getUserById(@Request() req) {
    const user = req.user as PayloadToken;
    return this.usersService.getUserById(user.userId);
  }

  @Post()
  createUser(@Body(new ValidationPipe()) dto: CreateUsersDto) {
    return this.usersService.createUser(dto);
  }

  @Put('/username/:username')
  updateUserByUsername(@Param('username') username: string, @Body(new ValidationPipe()) dto: UpdateUsersDto) {
    return this.usersService.updateUserByUsername(username, dto);
  }

  @Patch(':id')
  updateUser(@Param('id') id: number, @Body(new ValidationPipe()) dto: UpdateUsersDto) {
    return this.usersService.updateUser(id, dto);
  }

  @Delete(':id')
  deleteUser(@Param('id') id: number) {
    this.usersService.deleteUser(id);
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  @Post('change-password')
  changePassword(@Request() req, @Body(new ValidationPipe()) dto: ChangePasswordDto) {
    const user = req.user as PayloadToken;
    return this.usersService.changePassword(user.userId, dto);
  }
}
