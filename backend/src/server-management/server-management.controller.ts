import { Controller, Get, Post, Body, Param, NotFoundException, Put, Query, BadRequestException, ValidationPipe, Delete, UseGuards, Request, ForbiddenException, Optional } from '@nestjs/common';
import { DockerComposeService } from 'src/docker-compose/docker-compose.service';
import { ServerManagementService } from './server-management.service';
import { ServerConfig, UpdateServerConfigDto } from './dto/server-config.model';
import { ServerListItemDto } from './dto/server-list-item.dto';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { SettingsService } from 'src/users/services/settings.service';
import { PayloadToken } from 'src/auth/models/token.model';
import { ProxyService } from 'src/proxy/proxy.service';
import { ExecuteCommandDto } from './dto/execute-command.dto';
import { CloneServerDto } from './dto/clone-server.dto';
import { SelectWorldDto } from './dto/select-world.dto';
import { BedrockAddonsService } from 'src/bedrock-addons/bedrock-addons.service';
import { UsersService } from 'src/users/services/users.service';
import { AccessControlService } from 'src/users/services/access-control.service';
import { Users } from 'src/users/entities/users.entity';
import { AuditLogService } from 'src/users/services/audit-log.service';

const JAVA_SERVER_DEFAULT_KEYS = new Set([
  'onlineMode',
  'maxPlayers',
  'initMemory',
  'maxMemory',
  'cpuLimit',
  'cpuReservation',
  'memoryReservation',
  'difficulty',
  'gameMode',
  'pvp',
  'allowFlight',
  'commandBlock',
  'viewDistance',
  'simulationDistance',
  'enableAutoStop',
  'autoStopTimeoutEst',
  'enableAutoPause',
  'autoPauseTimeoutEst',
  'enableBackup',
]);

@Controller('servers')
@UseGuards(JwtAuthGuard)
export class ServerManagementController {
  constructor(
    private readonly dockerComposeService: DockerComposeService,
    private readonly managementService: ServerManagementService,
    private readonly settingsService: SettingsService,
    private readonly proxyService: ProxyService,
    private readonly bedrockAddonsService: BedrockAddonsService,
    @Optional()
    private readonly usersService: UsersService,
    @Optional()
    private readonly accessControlService: AccessControlService,
    @Optional()
    private readonly auditLogService: AuditLogService,
  ) {}

  private async recordServerAudit(user: Users | null, action: string, serverId: string, summary: string, outcome: 'success' | 'error' = 'success', metadata?: Record<string, unknown>) {
    if (!user || !this.auditLogService) {
      return;
    }

    await this.auditLogService.record({
      actorUserId: user.id,
      actorUsername: user.username,
      category: 'servers',
      action,
      outcome,
      serverId,
      summary,
      metadata,
    });
  }

  private async getCurrentUser(req): Promise<Users> {
    if (!this.usersService) {
      return null;
    }
    const user = req.user as PayloadToken;
    return this.usersService.getRequiredUserById(user.userId);
  }

  private async requireAdmin(req): Promise<Users> {
    if (!this.usersService || !this.accessControlService) {
      return null;
    }
    const user = await this.getCurrentUser(req);
    if (!this.accessControlService.isAdmin(user)) {
      throw new ForbiddenException('Only admin can perform this action');
    }

    return user;
  }

  private async requireServerAccess(req, serverId: string): Promise<Users> {
    if (!this.usersService || !this.accessControlService) {
      return null;
    }
    const user = await this.getCurrentUser(req);
    this.accessControlService.assertServerAccess(user, serverId);
    return user;
  }

  private resolveRequestAndId(reqOrId, id?: string) {
    if (typeof reqOrId === 'string' && id === undefined) {
      return { req: null, id: reqOrId };
    }

    return { req: reqOrId, id: id as string };
  }

  private sanitizeJavaServerDefaults(defaults: Record<string, any> | undefined): Record<string, any> {
    if (!defaults || typeof defaults !== 'object') {
      return {};
    }

    return Object.entries(defaults).reduce((acc, [key, value]) => {
      const isBlankString = typeof value === 'string' && value.trim() === '';
      if (JAVA_SERVER_DEFAULT_KEYS.has(key) && value !== undefined && !isBlankString) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
  }

  @Get()
  async getAllServers(@Request() req): Promise<ServerListItemDto[]> {
    const serverConfigs = await this.dockerComposeService.getAllServerConfigs();
    const user = await this.getCurrentUser(req);
    const visibleIds = this.accessControlService.getVisibleServerIds(user, serverConfigs.map((server) => server.id));
    return ServerListItemDto.fromServerConfigs(serverConfigs.filter((server) => visibleIds.includes(server.id)));
  }

  @Get('all-status')
  async getAllServersStatus(@Request() req?) {
    const allStatus = await this.managementService.getAllServersStatus();
    if (!req) {
      return allStatus;
    }

    if (!this.usersService || !this.accessControlService) {
      return allStatus;
    }

    const user = await this.getCurrentUser(req);
    const visibleIds = new Set(this.accessControlService.getVisibleServerIds(user, Object.keys(allStatus)));
    return Object.fromEntries(Object.entries(allStatus).filter(([serverId]) => visibleIds.has(serverId)));
  }

  @Get('all-resources')
  async getAllServersResources(@Request() req) {
    const resources = await this.managementService.getAllServersResources();
    if (!this.usersService || !this.accessControlService) {
      return resources;
    }
    const user = await this.getCurrentUser(req);
    const visibleIds = new Set(this.accessControlService.getVisibleServerIds(user, Object.keys(resources)));
    return Object.fromEntries(Object.entries(resources).filter(([serverId]) => visibleIds.has(serverId)));
  }

  @Get(':id')
  async getServer(@Request() req, @Param('id') id: string) {
    await this.requireServerAccess(req, id);
    const config = await this.dockerComposeService.getServerConfig(id);
    if (!config) {
      throw new NotFoundException(`Server with ID "${id}" not found`);
    }
    return config;
  }

  @Post()
  async createServer(@Request() req, @Body(new ValidationPipe()) data: UpdateServerConfigDto) {
    try {
      const currentUser = await this.getCurrentUser(req);
      if (currentUser && this.accessControlService) {
        this.accessControlService.assertCreateServers(currentUser);
      }
      const id = data.id;
      if (!id) throw new BadRequestException('Server ID is required');
      if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        throw new BadRequestException('Server ID can only contain letters, numbers, hyphens, and underscores');
      }

      const user = req.user as PayloadToken;
      const settings = await this.settingsService.getSettings(user.userId);

      if (data.serverType === 'AUTO_CURSEFORGE' && !data.cfApiKey) {
        if (settings.cfApiKey) {
          data.cfApiKey = settings.cfApiKey;
        }
      }

      const proxyEnabled = settings.preferences?.proxyEnabled && !!settings.preferences?.proxyBaseDomain;
      const baseDomain = settings.preferences?.proxyBaseDomain;
      const javaServerDefaults =
        (data.edition ?? 'JAVA') === 'JAVA'
          ? this.sanitizeJavaServerDefaults(settings.preferences?.javaServerDefaults)
          : {};

      const createPayload = {
        ...javaServerDefaults,
        ...data,
      };

      const serverConfig = await this.dockerComposeService.createServer(id, createPayload, proxyEnabled);

      // Regenerate routes.json if proxy is enabled (Java only, mc-router doesn't support Bedrock)
      if (proxyEnabled && baseDomain) {
        const servers = await this.dockerComposeService.getAllServerConfigs();
        const proxyServers = servers
          .filter((s) => s.useProxy !== false && s.edition !== 'BEDROCK')
          .map((s) => ({
            id: s.id,
            hostname: s.proxyHostname,
            useProxy: true,
          }));
        await this.proxyService.generateRoutesFile(proxyServers, baseDomain);
      }

      return {
        success: true,
        message: `Server "${id}" created successfully`,
        server: serverConfig,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(error.message || 'Failed to create server');
    }
  }

  @Post(':id/clone')
  async cloneServer(
    @Request() req,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    body: CloneServerDto,
  ) {
    const currentUser = await this.requireServerAccess(req, id);
    if (currentUser && this.accessControlService) {
      this.accessControlService.assertCreateServers(currentUser);
    }

    const config = await this.dockerComposeService.getServerConfig(id);
    if (!config?.serverExists) {
      throw new NotFoundException(`Server with ID "${id}" not found`);
    }

    const user = req.user as PayloadToken;
    const settings = await this.settingsService.getSettings(user.userId);
    const proxyEnabled = settings.preferences?.proxyEnabled && !!settings.preferences?.proxyBaseDomain;
    const baseDomain = settings.preferences?.proxyBaseDomain;

    const clonePayload = {
      ...config,
      id: body.newId,
      serverName: body.serverName?.trim() || `${config.serverName} (copy)`,
      extraPorts: [],
      proxyHostname: undefined,
      backupHostDir: undefined,
    };
    if (config.worldScope === 'local' && config.worldSource) {
      clonePayload.worldSource = '';
      clonePayload.forceWorldCopy = false;
    }

    try {
      const serverConfig = await this.dockerComposeService.createServer(body.newId, clonePayload, proxyEnabled);

      if (proxyEnabled && baseDomain) {
        const servers = await this.dockerComposeService.getAllServerConfigs();
        const proxyServers = servers
          .filter((s) => s.useProxy !== false && s.edition !== 'BEDROCK')
          .map((s) => ({
            id: s.id,
            hostname: s.proxyHostname,
            useProxy: true,
          }));
        await this.proxyService.generateRoutesFile(proxyServers, baseDomain);
      }

      await this.recordServerAudit(currentUser, 'clone_server', body.newId, `Cloned server ${id} to ${body.newId}`, 'success', { sourceServerId: id });

      return {
        success: true,
        message: `Server "${id}" cloned to "${body.newId}"`,
        server: serverConfig,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to clone server');
    }
  }

  @Post('regenerate-all')
  async regenerateAllDockerCompose(@Request() req) {
    await this.requireAdmin(req);
    const user = req.user as PayloadToken;
    const settings = await this.settingsService.getSettings(user.userId);
    const proxyEnabled = settings.preferences?.proxyEnabled && !!settings.preferences?.proxyBaseDomain;
    const baseDomain = settings.preferences?.proxyBaseDomain;

    const result = await this.dockerComposeService.regenerateAllDockerCompose(proxyEnabled);

    // Generate routes.json for mc-router if proxy is enabled (Java only)
    if (proxyEnabled && baseDomain) {
      const servers = await this.dockerComposeService.getAllServerConfigs();
      const proxyServers = servers
        .filter((s) => s.useProxy !== false && s.edition !== 'BEDROCK')
        .map((s) => ({
          id: s.id,
          hostname: s.proxyHostname,
          useProxy: true,
        }));
      await this.proxyService.generateRoutesFile(proxyServers, baseDomain);
    } else {
      await this.proxyService.clearRoutesFile();
    }

    return {
      success: true,
      message: `Regenerated ${result.updated.length} servers`,
      ...result,
    };
  }

  @Delete(':id')
  async deleteServer(@Request() req, @Param('id') id: string) {
    await this.requireServerAccess(req, id);
    const config = await this.dockerComposeService.getServerConfig(id);
    if (!config) {
      throw new NotFoundException(`Server with ID "${id}" not found`);
    }

    const result = await this.managementService.deleteServer(id);

    // Regenerate routes.json to remove deleted server
    if (result) {
      const user = req.user as PayloadToken;
      const settings = await this.settingsService.getSettings(user.userId);
      const proxyEnabled = settings.preferences?.proxyEnabled && !!settings.preferences?.proxyBaseDomain;
      const baseDomain = settings.preferences?.proxyBaseDomain;

      if (proxyEnabled && baseDomain) {
        const servers = await this.dockerComposeService.getAllServerConfigs();
        
        const proxyServers = servers
          .filter((s) => s.useProxy !== false && s.edition !== 'BEDROCK')
          .map((s) => ({
            id: s.id,
            hostname: s.proxyHostname,
            useProxy: true,
          }));
        await this.proxyService.generateRoutesFile(proxyServers, baseDomain);
      }
    }

    return {
      success: result,
      message: result ? `Server "${id}" deleted successfully` : `Failed to delete server "${id}"`,
    };
  }

  @Get(':id/resources')
  async getServerResources(@Request() req, @Param('id') id: string) {
    await this.requireServerAccess(req, id);
    const serverExists = await this.dockerComposeService.getServerConfig(id);
    if (!serverExists) {
      throw new NotFoundException(`Server with ID "${id}" not found`);
    }

    const status = await this.managementService.getServerStatus(id);
    if (status === 'not_found') {
      throw new NotFoundException(`Server with ID "${id}" not found`);
    }

    if (status !== 'running') {
      return {
        cpuUsage: 'N/A',
        memoryUsage: 'N/A',
        memoryLimit: 'N/A',
        diskUsage: 'N/A',
        status: status,
      };
    }

    const resources = await this.managementService.getServerResources(id);
    return {
      ...resources,
      status: status,
    };
  }

  @Put(':id')
  async updateServer(@Request() req, @Param('id') id: string, @Body(new ValidationPipe()) config: UpdateServerConfigDto) {
    const currentUser = await this.requireServerAccess(req, id);
    const user = req.user as PayloadToken;
    const settings = await this.settingsService.getSettings(user.userId);
    const proxyEnabled = settings.preferences?.proxyEnabled && !!settings.preferences?.proxyBaseDomain;
    const baseDomain = settings.preferences?.proxyBaseDomain;

    const updatedConfig = await this.dockerComposeService.updateServerConfig(id, config, proxyEnabled);
    if (!updatedConfig) {
      throw new NotFoundException(`Server with ID "${id}" not found`);
    }

    // Regenerate routes.json if proxy settings changed (Java only)
    if (proxyEnabled && baseDomain && (config.proxyHostname !== undefined || config.useProxy !== undefined)) {
      const servers = await this.dockerComposeService.getAllServerConfigs();
      const proxyServers = servers
        .filter((s) => s.useProxy !== false && s.edition !== 'BEDROCK')
        .map((s) => ({
          id: s.id,
          hostname: s.proxyHostname,
          useProxy: true,
        }));
      await this.proxyService.generateRoutesFile(proxyServers, baseDomain);
    }

    await this.recordServerAudit(currentUser, 'update_server_config', id, `Updated server configuration for ${id}`);

    return updatedConfig;
  }

  @Get(':id/worlds')
  async getServerWorlds(@Request() req, @Param('id') id: string) {
    await this.requireServerAccess(req, id);
    const config = await this.dockerComposeService.getServerConfig(id);
    if (!config) {
      throw new NotFoundException(`Server with ID "${id}" not found`);
    }

    if ((config.edition ?? 'JAVA') !== 'JAVA') {
      throw new BadRequestException('World source switching is only available for Java Edition servers');
    }

    return this.managementService.listAvailableWorlds(id, config.worldSource, config.worldLevelName, config.worldScope ?? 'local');
  }

  @Put(':id/worlds/select')
  async selectServerWorld(
    @Request() req,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })) body: SelectWorldDto,
  ) {
    await this.requireServerAccess(req, id);
    const config = await this.dockerComposeService.getServerConfig(id);
    if (!config) {
      throw new NotFoundException(`Server with ID "${id}" not found`);
    }

    if ((config.edition ?? 'JAVA') !== 'JAVA') {
      throw new BadRequestException('World source switching is only available for Java Edition servers');
    }

    const worldLevelName = body.worldLevelName?.trim();
    if (!worldLevelName) {
      throw new BadRequestException('worldLevelName is required');
    }

    const selectedScope = body.worldScope ?? 'local';
    const availableWorlds = await this.managementService.listAvailableWorlds(id, config.worldSource, config.worldLevelName, config.worldScope ?? 'local');
    const selectedWorld = availableWorlds.find((world) => world.source === body.worldSource && world.scope === selectedScope);
    if (!selectedWorld) {
      throw new BadRequestException('Selected world source was not found in local or world library sources');
    }

    const user = req.user as PayloadToken;
    const settings = await this.settingsService.getSettings(user.userId);
    const proxyEnabled = settings.preferences?.proxyEnabled && !!settings.preferences?.proxyBaseDomain;

    const nextConfig: Partial<ServerConfig> = {
      worldSource: body.worldSource,
      worldScope: selectedScope,
      worldLevelName,
      forceWorldCopy: body.forceWorldCopy === true,
      cfSetLevelFrom: '',
    };

    const updatedConfig = await this.dockerComposeService.updateServerConfig(id, nextConfig, proxyEnabled);
    if (!updatedConfig) {
      throw new NotFoundException(`Server with ID "${id}" not found`);
    }

    const shouldRestart = body.restartIfRunning !== false;
    let restarted = false;
    if (shouldRestart) {
      const status = await this.managementService.getServerStatus(id);
      if (status === 'running' || status === 'starting') {
        restarted = await this.managementService.restartServer(id);
      }
    }

    return {
      success: true,
      restarted,
      config: updatedConfig,
    };
  }

  @Post(':id/restart')
  async restartServer(@Request() reqOrId, @Param('id') id?: string) {
    const resolved = this.resolveRequestAndId(reqOrId, id);
    let currentUser: Users | null = null;
    if (resolved.req) {
      currentUser = await this.requireServerAccess(resolved.req, resolved.id);
    }
    const result = await this.managementService.restartServer(resolved.id);
    await this.recordServerAudit(currentUser, 'restart_server', resolved.id, result ? `Restarted server ${resolved.id}` : `Failed to restart server ${resolved.id}`, result ? 'success' : 'error');
    return {
      success: result,
      message: result ? 'Server restarted successfully' : 'Failed to restart server',
    };
  }

  @Post(':id/clear-data')
  async clearServerData(@Request() req, @Param('id') id: string) {
    await this.requireServerAccess(req, id);
    const config = await this.dockerComposeService.getServerConfig(id);
    if (!config) {
      throw new NotFoundException(`Server with ID "${id}" not found`);
    }

    const user = req.user as PayloadToken;
    const settings = await this.settingsService.getSettings(user.userId);
    const proxyEnabled = settings.preferences?.proxyEnabled && !!settings.preferences?.proxyBaseDomain;
    await this.dockerComposeService.updateServerConfig(id, {}, proxyEnabled);

    const result = await this.managementService.clearServerData(id);

    if (result && config.edition === 'BEDROCK') {
      await this.bedrockAddonsService.clearAddonRuntimeState(id);
    }

    return {
      success: result,
      message: result ? 'Server data cleared successfully' : 'Failed to clear server data',
    };
  }

  @Get(':id/status')
  async getServerStatus(@Request() reqOrId, @Param('id') id?: string) {
    const resolved = this.resolveRequestAndId(reqOrId, id);
    if (resolved.req) {
      await this.requireServerAccess(resolved.req, resolved.id);
    }
    const status = await this.managementService.getServerStatus(resolved.id);
    return { status };
  }

  @Get(':id/info')
  async getServerInfo(@Request() req, @Param('id') id: string) {
    await this.requireServerAccess(req, id);
    const serverInfo = await this.managementService.getServerInfo(id);
    if (!serverInfo.exists) {
      throw new NotFoundException(`Server with ID "${id}" not found`);
    }

    const config = await this.dockerComposeService.getServerConfig(id);
    return { ...serverInfo, config: config || undefined };
  }

  @Get(':id/backups/snapshots')
  async getBackupSnapshots(@Request() req, @Param('id') id: string) {
    await this.requireServerAccess(req, id);
    const config = await this.dockerComposeService.getServerConfig(id);
    if (!config?.serverExists) {
      throw new NotFoundException(`Server with ID "${id}" not found`);
    }
    if (config.backupMethod !== 'restic') {
      throw new BadRequestException('Snapshots are only available for the restic backup method');
    }
    return this.managementService.getBackupSnapshots(id);
  }

  @Get(':id/logs')
  async getServerLogs(@Request() reqOrId, @Param('id') idOrLines?: string | number, @Query('lines') lines?: number, @Query('since') since?: string, @Query('stream') stream?: string) {
    const resolved = this.resolveRequestAndId(reqOrId, typeof idOrLines === 'string' ? idOrLines : undefined);
    if (resolved.req && this.usersService && this.accessControlService) {
      const user = await this.getCurrentUser(resolved.req);
      this.accessControlService.assertViewLogs(user, resolved.id);
    }
    const resolvedLines = typeof idOrLines === 'number' && lines === undefined ? idOrLines : lines;
    const lineCount = resolvedLines && resolvedLines > 0 ? Math.min(resolvedLines, 10000) : 100;

    if (stream === 'true' && since) {
      return this.managementService.getServerLogsStream(resolved.id, lineCount, since);
    }
    if (since) {
      return this.managementService.getServerLogsSince(resolved.id, since);
    }
    return this.managementService.getServerLogs(resolved.id, lineCount);
  }

  @Get(':id/logs/stream')
  async getServerLogsStream(@Request() req, @Param('id') id: string, @Query('lines') lines?: number, @Query('since') since?: string) {
    const user = await this.getCurrentUser(req);
    this.accessControlService.assertViewLogs(user, id);
    const lineCount = lines && lines > 0 ? Math.min(lines, 5000) : 500;
    return this.managementService.getServerLogsStream(id, lineCount, since);
  }

  @Get(':id/logs/since/:timestamp')
  async getServerLogsSince(@Request() req, @Param('id') id: string, @Param('timestamp') timestamp: string) {
    const user = await this.getCurrentUser(req);
    this.accessControlService.assertViewLogs(user, id);
    return this.managementService.getServerLogsSince(id, timestamp);
  }

  @Post(':id/command')
  async executeCommand(
    @Request() req,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    body: ExecuteCommandDto,
  ) {
    const user = await this.getCurrentUser(req);
    this.accessControlService.assertUseConsole(user, id);
    const result = await this.managementService.executeCommand(id, body.command, body.rconPort, body.rconPassword);
    await this.recordServerAudit(user, 'execute_server_command', id, `Executed command on ${id}: ${body.command}`, 'success', { command: body.command });
    return result;
  }

  @Post(':id/start')
  async startServer(@Request() reqOrId, @Param('id') id?: string) {
    const resolved = this.resolveRequestAndId(reqOrId, id);
    let currentUser: Users | null = null;
    if (resolved.req) {
      currentUser = await this.requireServerAccess(resolved.req, resolved.id);
    }
    const result = await this.managementService.startServer(resolved.id);
    await this.recordServerAudit(currentUser, 'start_server', resolved.id, result ? `Started server ${resolved.id}` : `Failed to start server ${resolved.id}`, result ? 'success' : 'error');
    return {
      success: result,
      message: result ? 'Server started successfully' : 'Failed to start server',
    };
  }

  @Post(':id/stop')
  async stopServer(@Request() reqOrId, @Param('id') id?: string) {
    const resolved = this.resolveRequestAndId(reqOrId, id);
    let currentUser: Users | null = null;
    if (resolved.req) {
      currentUser = await this.requireServerAccess(resolved.req, resolved.id);
    }
    const result = await this.managementService.stopServer(resolved.id);
    await this.recordServerAudit(currentUser, 'stop_server', resolved.id, result ? `Stopped server ${resolved.id}` : `Failed to stop server ${resolved.id}`, result ? 'success' : 'error');
    return {
      success: result,
      message: result ? 'Server stopped successfully' : 'Failed to stop server',
    };
  }

  @Post(':id/players/online')
  async getOnlinePlayers(@Request() req, @Param('id') id: string, @Body() body: { rconPort: string; rconPassword?: string }) {
    await this.requireServerAccess(req, id);
    return this.managementService.getOnlinePlayers(id, body.rconPort, body.rconPassword);
  }

  @Get(':id/players/whitelist')
  async getWhitelist(@Request() req, @Param('id') id: string) {
    await this.requireServerAccess(req, id);
    return this.managementService.getWhitelist(id);
  }

  @Get(':id/players/ops')
  async getOps(@Request() req, @Param('id') id: string) {
    await this.requireServerAccess(req, id);
    return this.managementService.getOps(id);
  }

  @Get(':id/players/banned')
  async getBannedPlayers(@Request() req, @Param('id') id: string) {
    await this.requireServerAccess(req, id);
    return this.managementService.getBannedPlayers(id);
  }
}
