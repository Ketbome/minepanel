import { Controller, Get, UseGuards, Request, ValidationPipe, Body, Post, Param, Patch, Delete, Put } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PayloadToken } from 'src/auth/models/token.model';
import { UsersService } from '../services/users.service';
import { ChangePasswordDto, CreateUsersDto, UpdateProfileDto, UpdateUserAccessDto, UpdateUsersDto } from '../dtos/users.dto';
import { AccessControlService } from '../services/access-control.service';
import { Request as ExpressRequest } from 'express';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  private async getCurrentUser(req: ExpressRequest & { user: PayloadToken }) {
    return this.usersService.getRequiredUserById(req.user.userId);
  }

  @Get()
  async getUsers(@Request() req) {
    this.accessControlService.assertManageUsers(await this.getCurrentUser(req));
    return (await this.usersService.getUsers()).map((user) => this.usersService.serializeUser(user));
  }

  @Get('one')
  async getUserById(@Request() req) {
    const user = await this.getCurrentUser(req);

    return {
      ...this.usersService.serializeUser(user),
    };
  }

  @Patch('profile')
  updateProfile(@Request() req, @Body(new ValidationPipe()) dto: UpdateProfileDto) {
    const user = req.user as PayloadToken;
    return this.usersService.updateProfile(user.userId, dto).then((updatedUser) => this.usersService.serializeUser(updatedUser));
  }

  @Post()
  async createUser(@Request() req, @Body(new ValidationPipe()) dto: CreateUsersDto) {
    this.accessControlService.assertManageUsers(await this.getCurrentUser(req));
    return this.usersService.createUser(dto).then((user) => this.usersService.serializeUser(user));
  }

  @Put('/username/:username')
  async updateUserByUsername(@Request() req, @Param('username') username: string, @Body(new ValidationPipe()) dto: UpdateUsersDto) {
    this.accessControlService.assertManageUsers(await this.getCurrentUser(req));
    return this.usersService.updateUserByUsername(username, dto).then((user) => this.usersService.serializeUser(user));
  }

  @Patch(':id')
  async updateUser(@Request() req, @Param('id') id: number, @Body(new ValidationPipe()) dto: UpdateUsersDto) {
    this.accessControlService.assertManageUsers(await this.getCurrentUser(req));
    return this.usersService.updateUser(id, dto).then((user) => this.usersService.serializeUser(user));
  }

  @Patch(':id/access')
  async updateUserAccess(@Request() req, @Param('id') id: number, @Body(new ValidationPipe()) dto: UpdateUserAccessDto) {
    this.accessControlService.assertManageUsers(await this.getCurrentUser(req));
    return this.usersService.updateUserAccess(id, dto).then((user) => this.usersService.serializeUser(user));
  }

  @Delete(':id')
  async deleteUser(@Request() req, @Param('id') id: number) {
    this.accessControlService.assertManageUsers(await this.getCurrentUser(req));
    await this.usersService.deleteUser(id);
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
