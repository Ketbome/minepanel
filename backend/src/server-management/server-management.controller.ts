import { Controller, Get, Post, Body, Param, NotFoundException, Put, Query, BadRequestException, ValidationPipe, Delete, UseGuards, Request, ForbiddenException, ConflictException } from '@nestjs/common';
import { DockerComposeService } from 'src/docker-compose/docker-compose.service';
import { assertValidComposeSnippets } from 'src/common/compose/compose-snippets';
import { ServerManagementService } from './server-management.service';
import { EVENT_COMMAND_FIELDS, EventCommandField, normalizeEventCommands, ServerConfig, ServerEdition, UpdateServerConfigDto } from './dto/server-config.model';
import { UpdateModWatchDto } from './dto/mod-watch.dto';
import { UpdateSpawnPointDto } from './dto/spawn-point.dto';
import { TickCommandDto } from './dto/tick-command.dto';
import { compileTickPattern, isTickPatternSlow } from 'src/metrics/tick-stats';
import { ServerListItemDto } from './dto/server-list-item.dto';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { SettingsService } from 'src/users/services/settings.service';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { PayloadToken } from 'src/auth/models/token.model';
import { ProxyRouterService } from 'src/proxy/proxy-router.service';
import { isValidHostname, ProxyService } from 'src/proxy/proxy.service';
import { VelocityRuntimeService } from 'src/proxy/velocity-runtime.service';
import { isVelocityBackend } from 'src/proxy/velocity-backend';
import { ExecuteCommandDto } from './dto/execute-command.dto';
import { CloneServerDto } from './dto/clone-server.dto';
import { SelectWorldDto } from './dto/select-world.dto';
import { BedrockAddonsService } from 'src/bedrock-addons/bedrock-addons.service';
import { UsersService } from 'src/users/services/users.service';
import { AccessControlService } from 'src/users/services/access-control.service';
import { Users } from 'src/users/entities/users.entity';
import { AuditLogService } from 'src/users/services/audit-log.service';
import { VanillaTweaksService } from 'src/vanilla-tweaks/vanilla-tweaks.service';
import * as path from 'path';

// Accepts an ISO 8601 timestamp, a Unix timestamp, or a Go-style duration (e.g. "10m", "1h30m").
// Anything else is rejected so the value can never break out of the `docker logs --since` argument.
const LOGS_SINCE_PATTERN = /^(?:\d{1,14}(?:\.\d{1,9})?|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})?|(?:\d+(?:ns|us|µs|ms|s|m|h))+)$/;

function assertValidSince(since: string): void {
  if (!LOGS_SINCE_PATTERN.test(since)) {
    throw new BadRequestException('Invalid "since" value: expected an ISO 8601 timestamp, a Unix timestamp, or a duration like "10m" or "1h".');
  }
}

// The Metrics tab's custom tick command and its patterns. The sampler runs it over RCON, so only
// admins may set it, through PUT /servers/:id/tick-command (or create/clone as an admin).
const TICK_COMMAND_KEYS = ['tickCommand', 'tickTpsPattern', 'tickMsptPattern'] as const;

// Fields that reach the Docker host or decide which code runs inside the container.
// Being assigned to a server is enough to operate it, but not to change these.
const ADMIN_ONLY_CONFIG_FIELDS = [
  'dockerVolumes',
  'backupHostDir',
  'dockerImage',
  'dockerLabels',
  'composeSnippets',
  'uid',
  'gid',
  'envVars',
  'fabricLauncherUrl',
  'paperDownloadUrl',
  'bukkitDownloadUrl',
  'spigotDownloadUrl',
  'purpurDownloadUrl',
  'foliaDownloadUrl',
  'jvmOpts',
  'jvmXxOpts',
  'jvmDdOpts',
  'execDirectly',
  'extraPorts',
  // Every Velocity member gets the network's forwarding secret in its paper-global.yml, and
  // with it whoever operates the server can log in as any player on any member.
  'velocityEnabled',
  'velocityFallbackOrder',
] as const;

// Creation has no persisted config to compare against, so these are rejected
// outright for non-admins. `envVars` is screened key by key in assertSafeEnvVars
// instead, because the bundled Geyser template ships one.
const ADMIN_ONLY_ON_CREATE_FIELDS = [
  'dockerImage',
  'dockerLabels',
  'composeSnippets',
  'uid',
  'gid',
  'fabricLauncherUrl',
  'paperDownloadUrl',
  'bukkitDownloadUrl',
  'spigotDownloadUrl',
  'purpurDownloadUrl',
  'foliaDownloadUrl',
  'jvmOpts',
  'jvmXxOpts',
  'jvmDdOpts',
] as const;

// Templates publish a game port straight through (Geyser's 19132/udp). Host IPs,
// ranges and remapped ports stay admin-only.
const SAME_PORT_MAPPING = /^(\d{4,5}):(\d{4,5})(\/(tcp|udp))?$/;

function isSamePortMapping(mapping: string): boolean {
  const match = SAME_PORT_MAPPING.exec(mapping.trim());
  return !!match && match[1] === match[2] && Number(match[1]) >= 1024 && Number(match[1]) <= 65535;
}

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
  // itzg builds GENERIC_PACKS URLs from these, so a bare "pack" entry would pass the host check.
  'GENERIC_PACKS_PREFIX',
  'GENERIC_PACKS_SUFFIX',
]);

const ADMIN_ONLY_ENV_KEY_SUFFIXES = ['_DOWNLOAD_URL', '_LAUNCHER_URL'];
// RCON_CMDS_* run console commands; outside admin hands they go through the event command
// fields, which require the console permission.
const ADMIN_ONLY_ENV_KEY_PREFIXES = ['RCON_CMDS_'];
const EVENT_COMMAND_KEYS = Object.keys(EVENT_COMMAND_FIELDS) as EventCommandField[];

const ARTIFACT_ENV_KEYS = new Set(['PLUGINS', 'MODS', 'MODPACK', 'DATAPACKS', 'GENERIC_PACK', 'GENERIC_PACKS']);

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

// itzg splits these lists on commas, so one trusted entry cannot vouch for the rest.
function untrustedArtifactRefs(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((ref) => ref.trim())
    .filter(Boolean)
    .filter((ref) => !isTrustedArtifactRef(ref));
}

// The CurseForge key is copied from the creator's settings into server.json for the
// compose file. Anyone else with access to the server must not read it back.
function withoutSecrets<T extends { cfApiKey?: string } | null | undefined>(config: T): T {
  if (!config) return config;
  const { cfApiKey: _cfApiKey, ...rest } = config;
  return rest as T;
}

function normalizeConfigValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  return (typeof value === 'object' ? JSON.stringify(value) : String(value))
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

// Files the panel compiles into host mounts; the container must not be able to rewrite them.
const PANEL_MANAGED_FILES = new Set(['server.json', 'docker-compose.yml']);

// Compose generation only rewrites `./` sources into the server's own directory.
// Everything else (absolute paths, named volumes, `../` escapes) is a raw bind, and
// the directory itself (`./`, `./.`) would expose the panel-managed files above.
// Only mc-data is the container's to write: the panel reads the other folders
// (modpacks, addons, the world library) without link checks, so they must be `:ro`.
function isSelfContainedVolume(volume: string): boolean {
  const [source, , mode] = volume.split(':');
  if (!source.startsWith('./') || source.includes('$') || source.split('/').includes('..')) return false;

  const [first] = path.posix.normalize(source.slice(2)).split('/');
  if (first === '.' || first === '' || PANEL_MANAGED_FILES.has(first)) return false;
  return first === 'mc-data' || (mode ?? '').split(',').includes('ro');
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
    private readonly velocity: VelocityRuntimeService,
    private readonly proxyRouter: ProxyRouterService,
    private readonly bedrockAddonsService: BedrockAddonsService,
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
    private readonly auditLogService: AuditLogService,
    private readonly vanillaTweaks: VanillaTweaksService,
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

    const eventCommandsChanged = EVENT_COMMAND_KEYS.some(
      (field) => incoming[field] !== undefined && normalizeEventCommands(incoming[field]) !== normalizeEventCommands(current[field]),
    );
    if (eventCommandsChanged) this.assertCanSetEventCommands(user);

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
      // An unset membership and `false` are the same thing.
      if (field === 'velocityEnabled') return (incoming.velocityEnabled === true) !== (current.velocityEnabled === true);
      // The panel derives the java tag from the Minecraft version, so the version
      // permission has to cover it or the whole save is rejected.
      if (field === 'dockerImage') return !(canChangeVersion && VERSION_DOCKER_IMAGE_TAGS.test(next));

      return true;
    });

    if (changed.length > 0) {
      throw new ForbiddenException(`Only admins can change these settings: ${changed.join(', ')}`);
    }

    if (incoming.genericPack !== undefined && normalizeConfigValue(incoming.genericPack) !== normalizeConfigValue(current.genericPack)) {
      this.assertTrustedGenericPack(incoming.genericPack);
    }
  }

  // A local zip from the modpacks folder is fine; a URL is only fetched from the
  // same hosts as PLUGINS/MODS.
  private assertTrustedGenericPack(genericPack: string | undefined): void {
    const untrusted = untrustedArtifactRefs(normalizeConfigValue(genericPack));
    if (untrusted.length > 0) {
      throw new ForbiddenException(`Only admins can load GENERIC_PACK from an untrusted source: ${untrusted.join(', ')}`);
    }
  }

  private assertValidComposeSnippets(snippets: ServerConfig['composeSnippets']): void {
    try {
      assertValidComposeSnippets(snippets);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  private assertSafeNewServerConfig(user: Users | null, config: Partial<ServerConfig>): void {
    if (this.accessControlService.isAdmin(user)) {
      return;
    }

    if (EVENT_COMMAND_KEYS.some((field) => normalizeEventCommands(config[field]))) this.assertCanSetEventCommands(user);

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

    const customPorts = (config.extraPorts ?? []).filter((mapping) => !isSamePortMapping(String(mapping)));
    if (customPorts.length > 0) {
      throw new ForbiddenException(`Only admins can publish these ports: ${customPorts.join(', ')}`);
    }

    if (config.execDirectly === false) {
      throw new ForbiddenException('Only admins can set these settings: execDirectly');
    }

    if (config.velocityEnabled === true || (config.velocityFallbackOrder ?? null) !== null) {
      throw new ForbiddenException('Only admins can add a server to the Velocity network');
    }

    this.assertTrustedGenericPack(config.genericPack);
    this.assertSafeEnvVars(config.envVars);
  }

  // Event commands run as the server console, so they need what the console needs.
  private assertCanSetEventCommands(user: Users | null): void {
    if (!user || !this.accessControlService.canUsePermission(user, 'useConsole')) {
      throw new ForbiddenException('You need the console permission to change event commands');
    }
  }

  // itzg stops the server from starting when a share code cannot be installed, so a code
  // Vanilla Tweaks does not know is rejected here instead. Resource pack codes are refused
  // too: itzg only downloads them into /data/resourcepacks, which the server never uses.
  // When Vanilla Tweaks is unreachable the save goes through rather than blocking all edits.
  private async assertUsableVanillaTweaks(codes: string[] | undefined, current: string[], edition: ServerEdition | undefined): Promise<void> {
    // Bedrock never sends them to itzg, so there is nothing to check.
    if ((edition ?? 'JAVA') !== 'JAVA') return;

    // Asked together: one after another, ten codes and an unreachable host add up to ten timeouts.
    // The answers are read in the order given so the first bad code is the one reported.
    const fresh = (codes ?? []).filter((code) => !current.includes(code));
    const shares = await Promise.all(fresh.map((code) => this.vanillaTweaks.lookup(code).catch(() => undefined)));
    fresh.forEach((code, index) => {
      const share = shares[index];
      if (share === null) throw new BadRequestException(`Vanilla Tweaks share code ${code} was not found`);
      if (share?.type === 'resourcepacks') {
        throw new BadRequestException(`Vanilla Tweaks share code ${code} is a resource pack; the server cannot send it to players, only datapack and crafting tweak codes work`);
      }
    });
  }

  private assertSafeEnvVars(envVars: string | undefined): void {
    for (const entry of normalizeConfigValue(envVars).split('\n').filter(Boolean)) {
      const separator = entry.indexOf('=');
      if (separator === -1) continue;

      const key = entry.slice(0, separator).trim().toUpperCase();
      const value = entry.slice(separator + 1).trim();

      if (ADMIN_ONLY_ENV_KEYS.has(key) || ADMIN_ONLY_ENV_KEY_SUFFIXES.some((suffix) => key.endsWith(suffix)) || ADMIN_ONLY_ENV_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        throw new ForbiddenException(`Only admins can set the ${key} environment variable`);
      }

      if (!ARTIFACT_ENV_KEYS.has(key)) continue;

      const untrusted = untrustedArtifactRefs(value);
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

  // Keeps whichever edge is on in line with the server index.
  private async syncEdgeRoutes(): Promise<void> {
    const { enabled, mode } = await this.instanceSettings.getEdge();
    if (!enabled) return;
    if (mode === 'velocity') {
      await this.velocity.syncConfig();
    } else {
      await this.proxyRouter.syncRoutes();
    }
  }

  // Membership survives switching the edge back to mc-router, so it is checked whatever the edge is.
  private assertVelocityBackend(config: Pick<ServerConfig, 'velocityEnabled' | 'edition' | 'serverType' | 'minecraftVersion'>): void {
    if (config.velocityEnabled && !isVelocityBackend(config)) {
      throw new BadRequestException('Only Paper, Purpur, Leaf, Folia and Pufferfish servers on Minecraft 1.19 or newer can join the Velocity network');
    }
  }

  private assertValidHostname(hostname: string | undefined): void {
    const value = hostname?.trim();
    if (value && !isValidHostname(value)) {
      throw new BadRequestException('A hostname can only contain letters, numbers, hyphens, underscores and dots');
    }
  }

  // Each hostname maps to one backend (an mc-router route or a Velocity forced host), so
  // taking another server's name would silently steal its players. A blank hostname
  // routes as `<id>.<baseDomain>`.
  private async assertProxyHostnameFree(id: string, config: Pick<ServerConfig, 'proxyHostname' | 'useProxy' | 'edition' | 'velocityEnabled'>): Promise<void> {
    const { mode, baseDomain } = await this.instanceSettings.getEdge();
    const routed = (server: Pick<ServerConfig, 'useProxy' | 'velocityEnabled'>) => (mode === 'velocity' ? server.velocityEnabled === true : server.useProxy !== false);
    if (!baseDomain || !routed(config) || config.edition === 'BEDROCK') return;

    const wanted = this.proxyService.generateHostname(id, baseDomain, config.proxyHostname?.trim()).toLowerCase();
    const index = await this.dockerComposeService.getServerIndex();
    const owner = index.find(
      (server) =>
        server.id !== id &&
        routed(server) &&
        server.edition !== 'BEDROCK' &&
        this.proxyService.generateHostname(server.id, baseDomain, server.proxyHostname).toLowerCase() === wanted,
    );

    if (owner) {
      throw new ConflictException(`The hostname ${wanted} is already used by another server`);
    }
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
    return withoutSecrets(config);
  }

  @Post()
  async createServer(@Request() req, @Body(new ValidationPipe()) data: UpdateServerConfigDto) {
    try {
      const currentUser = await this.getCurrentUser(req);
      this.accessControlService.assertCreateServers(currentUser);
      this.assertSafeNewServerConfig(currentUser, data);
      // The sampler runs the tick command over RCON every minute, so it is admin-only to set and
      // would otherwise be a way around the console permission. Dropped, not rejected, like PUT :id.
      if (!this.accessControlService.isAdmin(currentUser)) for (const key of TICK_COMMAND_KEYS) delete data[key];
      await this.assertUsableVanillaTweaks(data.vanillaTweaksCodes, [], data.edition);
      this.assertValidComposeSnippets(data.composeSnippets);
      const id = data.id;
      if (!id) throw new BadRequestException('Server ID is required');
      if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        throw new BadRequestException('Server ID can only contain letters, numbers, hyphens, and underscores');
      }
      this.assertVelocityBackend(data);
      this.assertValidHostname(data.proxyHostname);
      await this.assertProxyHostnameFree(id, data);

      const user = req.user as PayloadToken;

      // The global CurseForge API key is the only one the UI manages, so it
      // wins over any key stored on the server config by older versions. It is
      // written into the generated compose so itzg can read it as CF_API_KEY.
      const cfApiKey = await this.settingsService.getCfApiKey(user.userId);
      if (cfApiKey) {
        data.cfApiKey = cfApiKey;
      }

      const edge = await this.instanceSettings.getComposeEdge();
      const javaServerDefaults =
        (data.edition ?? 'JAVA') === 'JAVA'
          ? this.sanitizeJavaServerDefaults(await this.instanceSettings.getJavaServerDefaults())
          : {};

      const createPayload = {
        ...javaServerDefaults,
        ...data,
      };

      const serverConfig = await this.dockerComposeService.createServer(id, createPayload, edge);
      await this.syncEdgeRoutes();

      return {
        success: true,
        message: `Server "${id}" created successfully`,
        server: withoutSecrets(serverConfig),
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof ConflictException) throw error;
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

    const edge = await this.instanceSettings.getComposeEdge();

    const clonePayload = {
      ...config,
      id: body.newId,
      serverName: body.serverName?.trim() || `${config.serverName} (copy)`,
      extraPorts: [],
      proxyHostname: undefined,
      // Joining the Velocity network is an admin decision, never inherited.
      velocityEnabled: undefined,
      velocityFallbackOrder: undefined,
      backupHostDir: undefined,
      dockerVolumes: this.dockerComposeService.remapVolumesToServer(config.dockerVolumes, id, body.newId),
    };
    // An admin's tick command is not the cloner's to copy unless they are an admin themselves.
    if (!this.accessControlService.isAdmin(currentUser)) for (const key of TICK_COMMAND_KEYS) delete clonePayload[key];
    if (config.worldScope === 'local' && config.worldSource) {
      clonePayload.worldSource = '';
      clonePayload.forceWorldCopy = false;
    }
    // The clone runs the source's event commands as its console, so copying them needs what
    // setting them needs.
    if (EVENT_COMMAND_KEYS.some((field) => normalizeEventCommands(clonePayload[field]))) this.assertCanSetEventCommands(currentUser);
    await this.assertProxyHostnameFree(body.newId, clonePayload);

    try {
      const serverConfig = await this.dockerComposeService.createServer(body.newId, clonePayload, edge);
      await this.syncEdgeRoutes();

      await this.recordServerAudit(currentUser, 'clone_server', body.newId, `Cloned server ${id} to ${body.newId}`, 'success', { sourceServerId: id });

      return {
        success: true,
        message: `Server "${id}" cloned to "${body.newId}"`,
        server: withoutSecrets(serverConfig),
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to clone server');
    }
  }

  @Post('regenerate-all')
  async regenerateAllDockerCompose(@Request() req) {
    await this.requireAdmin(req);
    const edge = await this.instanceSettings.getComposeEdge();

    const result = await this.dockerComposeService.regenerateAllDockerCompose(edge);

    // routes.json only has content while mc-router is the edge (Java only)
    if (edge !== true) {
      await this.proxyService.clearRoutesFile();
    }
    await this.syncEdgeRoutes();

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

    // Drop the deleted server from the edge's routes
    if (result) {
      await this.syncEdgeRoutes();
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
    await this.assertUsableVanillaTweaks(config.vanillaTweaksCodes, currentConfig.vanillaTweaksCodes ?? [], config.edition ?? currentConfig.edition);
    this.assertValidComposeSnippets(config.composeSnippets);
    // The form sends '' for a hostname that was never set, which is not a change.
    const hostnameChanged = config.proxyHostname !== undefined && (config.proxyHostname ?? '').trim() !== (currentConfig.proxyHostname ?? '').trim();
    const proxyTurnedOn = currentConfig.useProxy === false && config.useProxy === true;
    const velocityTurnedOn = currentConfig.velocityEnabled !== true && config.velocityEnabled === true;
    if (hostnameChanged) this.assertValidHostname(config.proxyHostname);
    if (hostnameChanged || proxyTurnedOn || velocityTurnedOn) {
      await this.assertProxyHostnameFree(id, {
        proxyHostname: config.proxyHostname ?? currentConfig.proxyHostname,
        useProxy: config.useProxy ?? currentConfig.useProxy,
        velocityEnabled: config.velocityEnabled ?? currentConfig.velocityEnabled,
        edition: currentConfig.edition,
      });
    }
    const merged = { ...currentConfig, ...config };
    if (currentConfig.velocityEnabled === true && merged.velocityEnabled && !isVelocityBackend(merged) && (await this.instanceSettings.getEdge()).mode !== 'velocity') {
      // The Velocity section is hidden while mc-router is the edge, so a member that stopped
      // qualifying leaves the network instead of failing a save it has no control to fix.
      config.velocityEnabled = false;
      config.velocityFallbackOrder = null;
    } else {
      this.assertVelocityBackend(merged);
    }

    // Mod Watch and activity tracking save through their own endpoints; dropping them here stops
    // a stale whole-form save from clobbering what's on disk. GET never returns cfApiKey, so the
    // form would send it back blank; the key is only set from the creator's settings.
    const {
      modNotes: _modNotes,
      modWatchTargetVersion: _modWatchTargetVersion,
      activityTracking: _activityTracking,
      cfApiKey: _cfApiKey,
      spawnX: _spawnX,
      spawnY: _spawnY,
      spawnZ: _spawnZ,
      tickCommand: _tickCommand,
      tickTpsPattern: _tickTpsPattern,
      tickMsptPattern: _tickMsptPattern,
      ...configWithoutModWatch
    } = config;

    const edge = await this.instanceSettings.getComposeEdge();

    const updatedConfig = await this.dockerComposeService.updateServerConfig(id, configWithoutModWatch, edge);
    if (!updatedConfig) {
      throw new NotFoundException(`Server with ID "${id}" not found`);
    }

    // Regenerate the edge's routes if routing fields changed (Java only)
    if ([config.proxyHostname, config.useProxy, config.velocityEnabled, config.velocityFallbackOrder].some((value) => value !== undefined)) {
      await this.syncEdgeRoutes();
    }

    await this.recordServerAudit(currentUser, 'update_server_config', id, `Updated server configuration for ${id}`);

    return withoutSecrets(updatedConfig);
  }

  // Separate from PUT :id: the Mod Watch tab stays open while the server runs, so this write
  // must not regenerate the compose file.
  @Put(':id/mod-watch')
  async updateModWatch(
    @Request() req,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })) body: UpdateModWatchDto,
  ) {
    const currentUser = await this.requireServerAccess(req, id);

    const updatedConfig = await this.managementService.updateModWatch(id, body);

    const changed = [body.notes !== undefined ? 'notes' : null, body.targetVersion !== undefined ? 'target version' : null].filter(Boolean).join(' and ');
    await this.recordServerAudit(currentUser, 'update_mod_watch', id, `Updated Mod Watch ${changed || 'annotations'} for ${id}`);

    return withoutSecrets(updatedConfig);
  }

  // Separate from PUT :id, like mod-watch: the Players/Commands tabs stay open while the
  // server runs, so this write must not regenerate the compose file.
  @Put(':id/spawn-point')
  async updateSpawnPoint(
    @Request() req,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })) body: UpdateSpawnPointDto,
  ) {
    const currentUser = await this.requireServerAccess(req, id);

    const updatedConfig = await this.managementService.updateSpawnPoint(id, body);

    await this.recordServerAudit(currentUser, 'update_spawn_point', id, `Updated default spawn point for ${id}`);

    return withoutSecrets(updatedConfig);
  }

  // Separate from PUT :id, like spawn-point. Admin only: the panel runs this RCON command on every
  // metrics poll, unattended.
  @Put(':id/tick-command')
  async updateTickCommand(
    @Request() req,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })) body: TickCommandDto,
  ) {
    const currentUser = await this.requireAdmin(req);
    for (const pattern of [body.tickTpsPattern, body.tickMsptPattern]) {
      if (pattern && !compileTickPattern(pattern)) {
        throw new BadRequestException('Patterns must be valid regular expressions with a capture group for the number');
      }
      if (pattern && isTickPatternSlow(pattern)) throw new BadRequestException('Pattern is too slow: it backtracks catastrophically on simple input');
    }

    const updatedConfig = await this.managementService.updateTickCommand(id, body);

    await this.recordServerAudit(
      currentUser,
      'update_tick_command',
      id,
      body.tickCommand?.trim() ? `Set metrics tick command on ${id}: ${body.tickCommand.trim()}` : `Cleared metrics tick command on ${id}`,
      'success',
      { command: body.tickCommand?.trim() || null, tpsPattern: body.tickTpsPattern?.trim() || null, msptPattern: body.tickMsptPattern?.trim() || null },
    );

    return withoutSecrets(updatedConfig);
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

    const edge = await this.instanceSettings.getComposeEdge();

    const nextConfig: Partial<ServerConfig> = {
      worldSource: requestedSource,
      worldScope: requestedSource ? selectedScope : 'local',
      worldLevelName,
      // FORCE_WORLD_COPY only means anything alongside a world source.
      forceWorldCopy: requestedSource ? body.forceWorldCopy === true : false,
      cfSetLevelFrom: '',
    };

    const updatedConfig = await this.dockerComposeService.updateServerConfig(id, nextConfig, edge);
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
      config: withoutSecrets(updatedConfig),
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

    await this.dockerComposeService.updateServerConfig(id, {}, await this.instanceSettings.getComposeEdge());

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
    return { ...serverInfo, config: withoutSecrets(config) || undefined };
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

  @Get(':id/gamerules')
  async getGamerules(@Request() req, @Param('id') id: string) {
    const user = await this.getCurrentUser(req);
    this.accessControlService.assertUseConsole(user, id);
    return this.managementService.getGamerules(id);
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
