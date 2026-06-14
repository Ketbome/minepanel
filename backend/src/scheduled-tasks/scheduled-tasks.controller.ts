import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Request, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PayloadToken } from 'src/auth/models/token.model';
import { AccessControlService } from 'src/users/services/access-control.service';
import { UsersService } from 'src/users/services/users.service';
import { Users } from 'src/users/entities/users.entity';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { CreateScheduledTaskDto } from './dto/create-scheduled-task.dto';
import { UpdateScheduledTaskDto } from './dto/update-scheduled-task.dto';

@Controller('scheduled-tasks')
@UseGuards(JwtAuthGuard)
export class ScheduledTasksController {
  constructor(
    private readonly scheduledTasksService: ScheduledTasksService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  private async requireServerAccess(req, serverId: string): Promise<Users> {
    const payload = req.user as PayloadToken;
    const user = await this.usersService.getRequiredUserById(payload.userId);
    this.accessControlService.assertServerAccess(user, serverId);
    return user;
  }

  @Get(':serverId')
  async list(@Request() req, @Param('serverId') serverId: string) {
    await this.requireServerAccess(req, serverId);
    return this.scheduledTasksService.listByServer(serverId);
  }

  @Post(':serverId')
  async create(@Request() req, @Param('serverId') serverId: string, @Body(new ValidationPipe({ whitelist: true })) dto: CreateScheduledTaskDto) {
    await this.requireServerAccess(req, serverId);
    return this.scheduledTasksService.create(serverId, dto);
  }

  @Put(':serverId/:taskId')
  async update(@Request() req, @Param('serverId') serverId: string, @Param('taskId', ParseIntPipe) taskId: number, @Body(new ValidationPipe({ whitelist: true })) dto: UpdateScheduledTaskDto) {
    await this.requireServerAccess(req, serverId);
    return this.scheduledTasksService.update(serverId, taskId, dto);
  }

  @Delete(':serverId/:taskId')
  async remove(@Request() req, @Param('serverId') serverId: string, @Param('taskId', ParseIntPipe) taskId: number) {
    await this.requireServerAccess(req, serverId);
    await this.scheduledTasksService.remove(serverId, taskId);
    return { success: true };
  }

  @Post(':serverId/:taskId/run')
  async runNow(@Request() req, @Param('serverId') serverId: string, @Param('taskId', ParseIntPipe) taskId: number) {
    await this.requireServerAccess(req, serverId);
    return this.scheduledTasksService.runNow(serverId, taskId);
  }
}
