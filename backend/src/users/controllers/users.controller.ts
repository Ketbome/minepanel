import { Controller, Get, UseGuards, Request, ValidationPipe, Body, Post, Param, Patch, Delete, Put } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PayloadToken } from 'src/auth/models/token.model';
import { UsersService } from '../services/users.service';
import { ChangePasswordDto, CreateUsersDto, UpdateProfileDto, UpdateUserAccessDto, UpdateUsersDto } from '../dtos/users.dto';
import { AccessControlService } from '../services/access-control.service';
import { Request as ExpressRequest } from 'express';
import { AuditLogService } from '../services/audit-log.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
    private readonly auditLogService: AuditLogService,
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
  async updateProfile(@Request() req, @Body(new ValidationPipe()) dto: UpdateProfileDto) {
    const user = req.user as PayloadToken;
    const updatedUser = await this.usersService.updateProfile(user.userId, dto);

    await this.auditLogService.record({
      actorUserId: user.userId,
      actorUsername: user.username,
      category: 'account',
      action: 'update_profile_email',
      summary: 'Updated account email',
    });

    return this.usersService.serializeUser(updatedUser);
  }

  @Post()
  async createUser(@Request() req, @Body(new ValidationPipe()) dto: CreateUsersDto) {
    const currentUser = await this.getCurrentUser(req);
    this.accessControlService.assertManageUsers(currentUser);
    const user = await this.usersService.createUser(dto);

    await this.auditLogService.record({
      actorUserId: currentUser.id,
      actorUsername: currentUser.username,
      category: 'users',
      action: 'create_user',
      summary: `Created user ${user.username}`,
      metadata: { targetUserId: user.id, targetUsername: user.username },
    });

    return this.usersService.serializeUser(user);
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
    const currentUser = await this.getCurrentUser(req);
    this.accessControlService.assertManageUsers(currentUser);
    const user = await this.usersService.updateUserAccess(id, dto);

    await this.auditLogService.record({
      actorUserId: currentUser.id,
      actorUsername: currentUser.username,
      category: 'users',
      action: 'update_user_access',
      summary: `Updated access for ${user.username}`,
      metadata: { targetUserId: user.id, targetUsername: user.username },
    });

    return this.usersService.serializeUser(user);
  }

  @Delete(':id')
  async deleteUser(@Request() req, @Param('id') id: number) {
    const currentUser = await this.getCurrentUser(req);
    this.accessControlService.assertManageUsers(currentUser);
    const targetUser = await this.usersService.getRequiredUserById(id);
    await this.usersService.deleteUser(id);

    await this.auditLogService.record({
      actorUserId: currentUser.id,
      actorUsername: currentUser.username,
      category: 'users',
      action: 'delete_user',
      summary: `Deleted user ${targetUser.username}`,
      metadata: { targetUserId: targetUser.id, targetUsername: targetUser.username },
    });

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  @Post('change-password')
  async changePassword(@Request() req, @Body(new ValidationPipe()) dto: ChangePasswordDto) {
    const user = req.user as PayloadToken;
    const result = await this.usersService.changePassword(user.userId, dto);

    await this.auditLogService.record({
      actorUserId: user.userId,
      actorUsername: user.username,
      category: 'account',
      action: 'change_password',
      summary: 'Changed account password',
    });

    return result;
  }
}
