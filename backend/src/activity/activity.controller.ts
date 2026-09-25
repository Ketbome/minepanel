import { BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Put, Query, Request, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PayloadToken } from 'src/auth/models/token.model';
import { ServerStoreService } from 'src/docker-compose/server-store.service';
import { Users } from 'src/users/entities/users.entity';
import { AccessControlService } from 'src/users/services/access-control.service';
import { UsersService } from 'src/users/services/users.service';
import { ActivityTailerService } from './activity-tailer.service';
import { ActivityService } from './activity.service';
import { ActivityEventsQueryDto, PlayerSessionsQueryDto, UpdateActivitySettingsDto } from './dto/activity-query.dto';

const queryPipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly tailer: ActivityTailerService,
    private readonly store: ServerStoreService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Get(':serverId/settings')
  async getSettings(@Request() req, @Param('serverId') serverId: string) {
    this.accessControlService.assertServerAccess(await this.currentUser(req), serverId);
    const [config, cursor] = await Promise.all([this.store.readConfig(serverId), this.tailer.getCursor(serverId)]);
    return { enabled: Boolean(config?.activityTracking), historyImported: Boolean(cursor?.historyImported) };
  }

  @Put(':serverId/settings')
  async updateSettings(@Request() req, @Param('serverId') serverId: string, @Body(queryPipe) body: UpdateActivitySettingsDto) {
    this.accessControlService.assertServerAccess(await this.currentUser(req), serverId);
    const config = await this.store.updateConfig(serverId, (current) => {
      current.activityTracking = body.enabled;
    });
    if (!config) {
      throw new NotFoundException(`Server with ID "${serverId}" not found`);
    }
    await this.tailer.setTracking(serverId, body.enabled, config.tz || 'UTC');
    const cursor = await this.tailer.getCursor(serverId);
    return { enabled: body.enabled, historyImported: Boolean(cursor?.historyImported) };
  }

  @Post(':serverId/import-history')
  async importHistory(@Request() req, @Param('serverId') serverId: string) {
    this.accessControlService.assertServerAccess(await this.currentUser(req), serverId);
    const config = await this.store.readConfig(serverId);
    return this.tailer.importHistory(serverId, config?.tz || 'UTC');
  }

  // Chat and commands are log content, so the timeline needs the log permission
  @Get(':serverId/events')
  async listEvents(@Request() req, @Param('serverId') serverId: string, @Query(queryPipe) query: ActivityEventsQueryDto) {
    this.accessControlService.assertViewLogs(await this.currentUser(req), serverId);
    return this.activityService.listEvents(serverId, query);
  }

  @Get(':serverId/sessions')
  async listSessions(@Request() req, @Param('serverId') serverId: string, @Query(queryPipe) query: PlayerSessionsQueryDto) {
    this.accessControlService.assertServerAccess(await this.currentUser(req), serverId);
    this.assertPlayer(query);
    return this.activityService.listSessions(serverId, query);
  }

  @Get(':serverId/sessions/summary')
  async summarizeSessions(@Request() req, @Param('serverId') serverId: string, @Query(queryPipe) query: PlayerSessionsQueryDto) {
    this.accessControlService.assertServerAccess(await this.currentUser(req), serverId);
    this.assertPlayer(query);
    const config = await this.store.readConfig(serverId);
    return this.activityService.summarize(serverId, query, config?.tz || 'UTC');
  }

  @Get(':serverId/players/:uuid/snapshots')
  async listSnapshots(@Request() req, @Param('serverId') serverId: string, @Param('uuid') uuid: string) {
    this.accessControlService.assertServerAccess(await this.currentUser(req), serverId);
    return this.activityService.listSnapshots(serverId, uuid);
  }

  @Get(':serverId/snapshots/:id')
  async getSnapshot(@Request() req, @Param('serverId') serverId: string, @Param('id', ParseIntPipe) id: number) {
    this.accessControlService.assertServerAccess(await this.currentUser(req), serverId);
    return this.activityService.getSnapshot(serverId, id);
  }

  private assertPlayer(query: PlayerSessionsQueryDto): void {
    if (!query.uuid && !query.name) {
      throw new BadRequestException('uuid or name is required');
    }
  }

  private currentUser(req): Promise<Users> {
    return this.usersService.getRequiredUserById((req.user as PayloadToken).userId);
  }
}
