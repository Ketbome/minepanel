import { Controller, Get, Post, Body, Param, NotFoundException, Put, Query, BadRequestException, ValidationPipe, Delete, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { DockerComposeService } from 'src/docker-compose/docker-compose.service';
import { ServerManagementService } from './server-management.service';
import { ServerConfig, UpdateServerConfigDto } from './dto/server-config.model';
import { ServerListItemDto } from './dto/server-list-item.dto';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { SettingsService } from 'src/users/services/settings.service';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
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

// Accepts an ISO 8601 timestamp, a Unix timestamp, or a Go-style duration (e.g. "10m", "1h30m").
// Anything else is rejected so the value can never break out of the `docker logs --since` argument.
const LOGS_SINCE_PATTERN = /^(?:\d{1,14}(?:\.\d{1,9})?|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})?|(?:\d+(?:ns|us|µs|ms|s|m|h))+)$/;

function assertValidSince(since: string): void {
  if (!LOGS_SINCE_PATTERN.test(since)) {
    throw new BadRequestException('Invalid "since" value: expected an ISO 8601 timestamp, a Unix timestamp, or a duration like "10m" or "1h".');
  }
}

// Fields that reach the Docker host or decide which code runs inside the container.
// Being assigned to a server is enough to operate it, but not to change these.
const ADMIN_ONLY_CONFIG_FIELDS = [
  'dockerVolumes',
  'backupHostDir',
  'dockerImage',
  'dockerLabels',
  'uid',
  'gid',
  'envVars',
  'fabricLauncherUrl',
  'paperDownloadUrl',
  'bukkitDownloadUrl',
  'spigotDownloadUrl',
  'purpurDownloadUrl',
  'foliaDownloadUrl',
] as const;

// Creation has no persisted config to compare against, so these are rejected
// outright for non-admins. `envVars` is screened key by key in assertSafeEnvVars
// instead, because the bundled Geyser template ships one.
const ADMIN_ONLY_ON_CREATE_FIELDS = [
  'dockerImage',
  'dockerLabels',
  'uid',
  'gid',
  'fabricLauncherUrl',
  'paperDownloadUrl',
  'bukkitDownloadUrl',
  'spigotDownloadUrl',
  'purpurDownloadUrl',
  'foliaDownloadUrl',
] as const;

// `dockerImage` is only the tag of the fixed itzg image (see the server strategies),
// and the panel derives it from the Minecraft version. These are the tags the
// `changeServerVersion` permission unlocks; anything else stays admin-only.
const VERSION_DOCKER_IMAGE_TAGS = /^(latest|stable|java\d{1,2})$/;


const ADMIN_ONLY_ENV_KEYS = new Set([
  'UID',
  'GID',
  'EXEC_DIRECTLY',
  'JVM_OPTS',
  'JVM_XX_OPTS',
  'JVM_DD_OPTS',
  'CUSTOM_SERVER',
  'SERVER_JAR',
  'RCON_PASSWORD',
]);

const ADMIN_ONLY_ENV_KEY_SUFFIXES = ['_DOWNLOAD_URL', '_LAUNCHER_URL'];

const ARTIFACT_ENV_KEYS = new Set(['PLUGINS', 'MODS', 'MODPACK', 'DATAPACKS', 'GENERIC_PACKS']);

const TRUSTED_ARTIFACT_HOSTS = new Set([
  'download.geysermc.org',
  'api.papermc.io',
  'hangarcdn.papermc.io',
  'cdn.modrinth.com',
  'api.modrinth.com',
  'mediafilez.forgecdn.net',
  'edge.forgecdn.net',
]);

function isTrustedArtifactRef(value: string): boolean {
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && TRUSTED_ARTIFACT_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function normalizeConfigValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

// Compose generation only rewrites `./` sources into the server's own directory.
// Everything else (absolute paths, named volumes, `../` escapes) is a raw bind.
function isSelfContainedVolume(volume: string): boolean {
  const source = volume.split(':')[0];
  return source.startsWith('./') && !source.split('/').includes('..');
}

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
    private readonly instanceSettings: InstanceSettingsService,
    private readonly proxyService: ProxyService,
    private readonly bedrockAddonsService: BedrockAddonsService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async recordServerAudit(user: Users | null, action: string, serverId: string, summary: string, outcome: 'success' | 'error' = 'success', metadata?: Record<string, unknown>) {
    if (!user) {
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
    const user = req.user as PayloadToken;
    return this.usersService.getRequiredUserById(user.userId);
  }

  private async requireAdmin(req): Promise<Users> {
    const user = await this.getCurrentUser(req);
    if (!this.accessControlService.isAdmin(user)) {
      throw new ForbiddenException('Only admin can perform this action');
    }

    return user;
  }

  private async requireServerAccess(req, serverId: string): Promise<Users> {
    const user = await this.getCurrentUser(req);
    this.accessControlService.assertServerAccess(user, serverId);
    return user;
  }

  // The panel submits the whole server form on every save, so non-admins are only
  // blocked when a host-affecting field actually differs from what is persisted.
  private assertCanChangeAdvancedConfig(user: Users | null, incoming: Partial<ServerConfig>, current: ServerConfig): void {
    if (this.accessControlService.isAdmin(user)) {
      return;
    }

    const canChangeVersion = Boolean(user) && this.accessControlService.canUsePermission(user as Users, 'changeServerVersion');

    // Bedrock stores its version in the same field, so this covers both editions.
    const versionChanged =
      incoming.minecraftVersion !== undefined && normalizeConfigValue(incoming.minecraftVersion) !== normalizeConfigValue(current.minecraftVersion);

    if (!canChangeVersion && versionChanged) {
      throw new ForbiddenException('You do not have permission to change the server version');
    }

    const changed = ADMIN_ONLY_CONFIG_FIELDS.filter((field) => {
      if (incoming[field] === undefined) return false;

      const next = normalizeConfigValue(incoming[field]);
      if (next === normalizeConfigValue(current[field])) return false;
      // The panel derives the java tag from the Minecraft version, so the version
      // permission has to cover it or the whole save is rejected.
      if (field === 'dockerImage') return !(canChangeVersion && VERSION_DOCKER_IMAGE_TAGS.test(next));

      return true;
    });

    if (changed.length > 0) {
      throw new ForbiddenException(`Only admins can change these settings: ${changed.join(', ')}`);
    }
  }

  private assertSafeNewServerConfig(user: Users | null, config: Partial<ServerConfig>): void {
    if (this.accessControlService.isAdmin(user)) {
      return;
    }

    const unsafe = normalizeConfigValue(config.dockerVolumes)
      .split('\n')
      .filter((volume) => volume && !isSelfContainedVolume(volume));

    if (unsafe.length > 0) {
      throw new ForbiddenException('Only admins can mount host paths into a server container');
    }

    if (normalizeConfigValue(config.backupHostDir)) {
      throw new ForbiddenException('Only admins can set a custom backup host directory');
    }

    const provided = ADMIN_ONLY_ON_CREATE_FIELDS.filter((field) => {
      const value = normalizeConfigValue(config[field]);
      if (!value) return false;
      // Creating a server already requires access to every server, and the panel
      // always sends the tag it derived for the chosen version.
      if (field === 'dockerImage') return !VERSION_DOCKER_IMAGE_TAGS.test(value);

      return true;
    });
    if (provided.length > 0) {
      throw new ForbiddenException(`Only admins can set these settings: ${provided.join(', ')}`);
    }

    this.assertSafeEnvVars(config.envVars);
  }

  private assertSafeEnvVars(envVars: string | undefined): void {
    for (const entry of normalizeConfigValue(envVars).split('\n').filter(Boolean)) {
      const separator = entry.indexOf('=');
      if (separator === -1) continue;

      const key = entry.slice(0, separator).trim().toUpperCase();
      const value = entry.slice(separator + 1).trim();

      if (ADMIN_ONLY_ENV_KEYS.has(key) || ADMIN_ONLY_ENV_KEY_SUFFIXES.some((suffix) => key.endsWith(suffix))) {
        throw new ForbiddenException(`Only admins can set the ${key} environment variable`);
      }

      if (!ARTIFACT_ENV_KEYS.has(key)) continue;

      const untrusted = value
        .split(',')
        .map((ref) => ref.trim())
        .filter(Boolean)
        .filter((ref) => !isTrustedArtifactRef(ref));

      if (untrusted.length > 0) {
        throw new ForbiddenException(`Only admins can load ${key} from an untrusted source: ${untrusted.join(', ')}`);
      }
    }
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
    const index = await this.dockerComposeService.getServerIndex();
    const user = await this.getCurrentUser(req);
    const visibleIds = this.accessControlService.getVisibleServerIds(user, index.map((server) => server.id));
    return ServerListItemDto.fromIndexEntries(index.filter((server) => visibleIds.includes(server.id)));
  }

  // Routing depends on a handful of fields, so this reads the server index
  // instead of opening every server's config.
  private async regenerateProxyRoutes(baseDomain: string): Promise<void> {
    const index = await this.dockerComposeService.getServerIndex();
    const proxyServers = index
      .filter((server) => server.useProxy !== false && server.edition !== 'BEDROCK')
      .map((server) => ({
        id: server.id,
        hostname: server.proxyHostname,
        useProxy: true,
      }));
    await this.proxyService.generateRoutesFile(proxyServers, baseDomain);
  }

  @Get('all-status')
  async getAllServersStatus(@Request() req) {
    const allStatus = await this.managementService.getAllServersStatus();
    const user = await this.getCurrentUser(req);
    const visibleIds = new Set(this.accessControlService.getVisibleServerIds(user, Object.keys(allStatus)));
    return Object.fromEntries(Object.entries(allStatus).filter(([serverId]) => visibleIds.has(serverId)));
  }

  @Get('all-resources')
  async getAllServersResources(@Request() req) {
    const resources = await this.managementService.getAllServersResources();
    const user = await this.getCurrentUser(req);
    const visibleIds = new Set(this.accessControlService.getVisibleServerIds(user, Object.keys(resources)));
    return Object.fromEntries(Object.entries(resources).filter(([serverId]) => visibleIds.has(serverId)));
  }

  @Get('all-runtime-stats')
  async getAllServersRuntimeStats(@Request() req) {
    const stats = await this.managementService.getAllServersRuntimeStats();
    const user = await this.getCurrentUser(req);
    const visibleIds = new Set(this.accessControlService.getVisibleServerIds(user, Object.keys(stats)));
    return Object.fromEntries(Object.entries(stats).filter(([serverId]) => visibleIds.has(serverId)));
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
      this.accessControlService.assertCreateServers(currentUser);
      this.assertSafeNewServerConfig(currentUser, data);
      const id = data.id;
      if (!id) throw new BadRequestException('Server ID is required');
      if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        throw new BadRequestException('Server ID can only contain letters, numbers, hyphens, and underscores');
      }

      const user = req.user as PayloadToken;

      // The global CurseForge API key is the only one the UI manages, so it
      // wins over any key stored on the server config by older versions. It is
      // written into the generated compose so itzg can read it as CF_API_KEY.
      const cfApiKey = await this.settingsService.getCfApiKey(user.userId);
      if (cfApiKey) {
        data.cfApiKey = cfApiKey;
      }

      const { enabled: proxyEnabled, baseDomain } = await this.proxyService.getProxySettings();
      const javaServerDefaults =
        (data.edition ?? 'JAVA') === 'JAVA'
          ? this.sanitizeJavaServerDefaults(await this.instanceSettings.getJavaServerDefaults())
          : {};

      const createPayload = {
        ...javaServerDefaults,
        ...data,
      };

      const serverConfig = await this.dockerComposeService.createServer(id, createPayload, proxyEnabled);

      // Regenerate routes.json if proxy is enabled (Java only, mc-router doesn't support Bedrock)
      if (proxyEnabled && baseDomain) {
        await this.regenerateProxyRoutes(baseDomain);
      }

      return {
        success: true,
        message: `Server "${id}" created successfully`,
        server: serverConfig,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
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
    this.accessControlService.assertCreateServers(currentUser);

    const config = await this.dockerComposeService.getServerConfig(id);
    if (!config?.serverExists) {
      throw new NotFoundException(`Server with ID "${id}" not found`);
    }

    const { enabled: proxyEnabled, baseDomain } = await this.proxyService.getProxySettings();

    const clonePayload = {
      ...config,
      id: body.newId,
      serverName: body.serverName?.trim() || `${config.serverName} (copy)`,
      extraPorts: [],
      proxyHostname: undefined,
      backupHostDir: undefined,
      dockerVolumes: this.dockerComposeService.remapVolumesToServer(config.dockerVolumes, id, body.newId),
    };
    if (config.worldScope === 'local' && config.worldSource) {
      clonePayload.worldSource = '';
      clonePayload.forceWorldCopy = false;
    }

    try {
      const serverConfig = await this.dockerComposeService.createServer(body.newId, clonePayload, proxyEnabled);

      if (proxyEnabled && baseDomain) {
        await this.regenerateProxyRoutes(baseDomain);
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
    const { enabled: proxyEnabled, baseDomain } = await this.proxyService.getProxySettings();

    const result = await this.dockerComposeService.regenerateAllDockerCompose(proxyEnabled);

    // Generate routes.json for mc-router if proxy is enabled (Java only)
    if (proxyEnabled && baseDomain) {
      await this.regenerateProxyRoutes(baseDomain);
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
      const { enabled: proxyEnabled, baseDomain } = await this.proxyService.getProxySettings();

      if (proxyEnabled && baseDomain) {
        await this.regenerateProxyRoutes(baseDomain);
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

  @Get(':id/runtime-stats')
  async getServerRuntimeStats(@Request() req, @Param('id') id: string) {
    await this.requireServerAccess(req, id);
    const serverExists = await this.dockerComposeService.getServerConfig(id);
    if (!serverExists) {
      throw new NotFoundException(`Server with ID "${id}" not found`);
    }
    return this.managementService.getServerRuntimeStats(id);
  }

  @Put(':id')
  async updateServer(@Request() req, @Param('id') id: string, @Body(new ValidationPipe()) config: UpdateServerConfigDto) {
    const currentUser = await this.requireServerAccess(req, id);
    const currentConfig = await this.dockerComposeService.getServerConfig(id);
    if (!currentConfig) {
      throw new NotFoundException(`Server with ID "${id}" not found`);
    }
    this.assertCanChangeAdvancedConfig(currentUser, config, currentConfig);

    const { enabled: proxyEnabled, baseDomain } = await this.proxyService.getProxySettings();

    const updatedConfig = await this.dockerComposeService.updateServerConfig(id, config, proxyEnabled);
    if (!updatedConfig) {
      throw new NotFoundException(`Server with ID "${id}" not found`);
    }

    // Regenerate routes.json if proxy settings changed (Java only)
    if (proxyEnabled && baseDomain && (config.proxyHostname !== undefined || config.useProxy !== undefined)) {
      await this.regenerateProxyRoutes(baseDomain);
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
    // An empty worldSource clears the selection: the server then boots its own world at
    // LEVEL instead of importing one. Already-copied world data is left untouched.
    const requestedSource = body.worldSource?.trim() ?? '';
    if (requestedSource) {
      const availableWorlds = await this.managementService.listAvailableWorlds(id, config.worldSource, config.worldLevelName, config.worldScope ?? 'local');
      const selectedWorld = availableWorlds.find((world) => world.source === requestedSource && world.scope === selectedScope);
      if (!selectedWorld) {
        throw new BadRequestException('Selected world source was not found in local or world library sources');
      }
    }

    const { enabled: proxyEnabled } = await this.proxyService.getProxySettings();

    const nextConfig: Partial<ServerConfig> = {
      worldSource: requestedSource,
      worldScope: requestedSource ? selectedScope : 'local',
      worldLevelName,
      // FORCE_WORLD_COPY only means anything alongside a world source.
      forceWorldCopy: requestedSource ? body.forceWorldCopy === true : false,
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
  async restartServer(@Request() req, @Param('id') id: string) {
    const currentUser = await this.requireServerAccess(req, id);
    const result = await this.managementService.restartServer(id);
    await this.recordServerAudit(currentUser, 'restart_server', id, result ? `Restarted server ${id}` : `Failed to restart server ${id}`, result ? 'success' : 'error');
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

    const { enabled: proxyEnabled } = await this.proxyService.getProxySettings();
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
  async getServerStatus(@Request() req, @Param('id') id: string) {
    await this.requireServerAccess(req, id);
    const status = await this.managementService.getServerStatus(id);
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
  async getServerLogs(@Request() req, @Param('id') id: string, @Query('lines') lines?: number, @Query('since') since?: string, @Query('stream') stream?: string) {
    const user = await this.getCurrentUser(req);
    this.accessControlService.assertViewLogs(user, id);
    const lineCount = lines && lines > 0 ? Math.min(lines, 10000) : 100;

    if (since) {
      assertValidSince(since);
    }
    if (stream === 'true' && since) {
      return this.managementService.getServerLogsStream(id, lineCount, since);
    }
    if (since) {
      return this.managementService.getServerLogsSince(id, since);
    }
    return this.managementService.getServerLogs(id, lineCount);
  }

  @Get(':id/logs/stream')
  async getServerLogsStream(@Request() req, @Param('id') id: string, @Query('lines') lines?: number, @Query('since') since?: string) {
    const user = await this.getCurrentUser(req);
    this.accessControlService.assertViewLogs(user, id);
    if (since) {
      assertValidSince(since);
    }
    const lineCount = lines && lines > 0 ? Math.min(lines, 5000) : 500;
    return this.managementService.getServerLogsStream(id, lineCount, since);
  }

  @Get(':id/logs/since/:timestamp')
  async getServerLogsSince(@Request() req, @Param('id') id: string, @Param('timestamp') timestamp: string) {
    const user = await this.getCurrentUser(req);
    this.accessControlService.assertViewLogs(user, id);
    assertValidSince(timestamp);
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
  async startServer(@Request() req, @Param('id') id: string) {
    const currentUser = await this.requireServerAccess(req, id);
    const result = await this.managementService.startServer(id);
    await this.recordServerAudit(currentUser, 'start_server', id, result ? `Started server ${id}` : `Failed to start server ${id}`, result ? 'success' : 'error');
    return {
      success: result,
      message: result ? 'Server started successfully' : 'Failed to start server',
    };
  }

  @Post(':id/stop')
  async stopServer(@Request() req, @Param('id') id: string) {
    const currentUser = await this.requireServerAccess(req, id);
    const result = await this.managementService.stopServer(id);
    await this.recordServerAudit(currentUser, 'stop_server', id, result ? `Stopped server ${id}` : `Failed to stop server ${id}`, result ? 'success' : 'error');
    return {
      success: result,
      message: result ? 'Server stopped successfully' : 'Failed to stop server',
    };
  }

  @Post(':id/stop/force')
  async forceStopServer(@Request() req, @Param('id') id: string) {
    const currentUser = await this.requireServerAccess(req, id);
    const result = await this.managementService.forceStopServer(id);
    await this.recordServerAudit(currentUser, 'force_stop_server', id, result ? `Force stopped server ${id}` : `Failed to force stop server ${id}`, result ? 'success' : 'error');
    return {
      success: result,
      message: result ? 'Server force stopped successfully' : 'Failed to force stop server',
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
