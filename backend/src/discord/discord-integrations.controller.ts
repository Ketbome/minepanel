import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Request, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { PayloadToken } from 'src/auth/models/token.model';
import { AccessControlService } from 'src/users/services/access-control.service';
import { UsersService } from 'src/users/services/users.service';
import { CreateDiscordWebhookDto, UpdateDiscordRoutesDto, UpdateDiscordWebhookDto } from './dto/discord-webhook.dto';
import { DiscordRoutingService } from './discord-routing.service';
import { DiscordService } from './discord.service';

const bodyPipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

/** Per-server Discord integrations. Admin-only: webhooks are secrets and send data off the host. */
@Controller('servers/:serverId/discord')
@UseGuards(JwtAuthGuard)
export class DiscordIntegrationsController {
  constructor(
    private readonly routing: DiscordRoutingService,
    private readonly discord: DiscordService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Get()
  async get(@Request() req, @Param('serverId') serverId: string) {
    await this.requireAdmin(req, serverId);
    return this.routing.listFor(serverId);
  }

  @Post('webhooks')
  async create(@Request() req, @Param('serverId') serverId: string, @Body(bodyPipe) dto: CreateDiscordWebhookDto) {
    await this.requireAdmin(req, serverId);
    return this.routing.create(serverId, dto);
  }

  @Patch('webhooks/:id')
  async update(@Request() req, @Param('serverId') serverId: string, @Param('id', ParseIntPipe) id: number, @Body(bodyPipe) dto: UpdateDiscordWebhookDto) {
    await this.requireAdmin(req, serverId);
    return this.routing.update(serverId, id, dto);
  }

  @Delete('webhooks/:id')
  async remove(@Request() req, @Param('serverId') serverId: string, @Param('id', ParseIntPipe) id: number) {
    await this.requireAdmin(req, serverId);
    await this.routing.remove(serverId, id);
    return { success: true };
  }

  @Post('webhooks/:id/test')
  async test(@Request() req, @Param('serverId') serverId: string, @Param('id', ParseIntPipe) id: number) {
    await this.requireAdmin(req, serverId);
    const target = await this.routing.webhookTarget(serverId, id);
    if (!target.url) {
      return { success: false, message: 'The saved webhook URL could not be decrypted; enter it again' };
    }
    const serverName = await this.routing.serverName(serverId);
    const result = await this.discord.testWebhook(target.url);
    return { ...result, message: result.success ? `Test activity sent from ${serverName}` : result.message };
  }

  @Put('routes')
  async routes(@Request() req, @Param('serverId') serverId: string, @Body(bodyPipe) dto: UpdateDiscordRoutesDto) {
    await this.requireAdmin(req, serverId);
    return this.routing.setRoutes(serverId, dto.routes);
  }

  private async requireAdmin(req, serverId: string): Promise<void> {
    // A percent-decoded param arrives as `../` here, and the id is later joined into a
    // filesystem path, so only a real server id may pass.
    if (!/^[a-zA-Z0-9_-]+$/.test(serverId)) throw new BadRequestException('Invalid server ID');
    const user = await this.usersService.getRequestUser(req.user as PayloadToken);
    this.accessControlService.assertIsAdmin(user);
  }
}
