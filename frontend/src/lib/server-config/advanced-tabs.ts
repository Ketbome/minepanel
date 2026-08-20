import type { ServerConfig } from '@/lib/types/types';

const DEFAULT_DOCKER_VOLUMES = './mc-data:/data\n./modpacks:/modpacks:ro';

const isSet = (value: string | undefined | null) => !!value && value.trim() !== '';

/**
 * Whether an advanced tab holds anything other than its defaults.
 *
 * Simple mode hides these tabs, but hiding a setting somebody deliberately
 * changed is worse than the clutter it saves: they would look for it, not find
 * it, and have no way to know the panel is still applying it. So a tab that has
 * been touched stays visible in both modes.
 *
 * The defaults mirror `createDefaultConfig` in the backend
 * (`backend/src/docker-compose/docker-compose.service.ts`).
 */
export const ADVANCED_TAB_HAS_CUSTOM_VALUES: Record<string, (config: ServerConfig) => boolean> = {
  network: (config) =>
    config.useProxy === false ||
    config.useAutoScale === false ||
    config.preventProxyConnections === true ||
    isSet(config.proxyHostname) ||
    isSet(config.serverPortV6) ||
    (config.extraPorts?.length ?? 0) > 0,

  lifecycle: (config) =>
    config.enableAutoStop === true ||
    config.enableAutoPause === true ||
    (isSet(config.restartPolicy) && config.restartPolicy !== 'no') ||
    (isSet(config.stopDelay) && config.stopDelay !== '60') ||
    (isSet(config.tz) && config.tz !== 'UTC'),

  advanced: (config) =>
    isSet(config.envVars) ||
    isSet(config.dockerLabels) ||
    config.enableRollingLogs === true ||
    config.logTimestamp === true ||
    (isSet(config.dockerVolumes) && config.dockerVolumes !== DEFAULT_DOCKER_VOLUMES),
};

export const advancedTabIsInUse = (tab: string, config: ServerConfig): boolean =>
  ADVANCED_TAB_HAS_CUSTOM_VALUES[tab]?.(config) ?? false;

/**
 * Same rule one level down: the JVM section is the part of Resources that can
 * stop a server from booting, and it is dead weight for anyone who just wants
 * to set how much RAM the server gets.
 */
export const jvmOptionsInUse = (config: ServerConfig): boolean =>
  config.useAikarFlags === true ||
  config.enableJmx === true ||
  isSet(config.jvmOpts) ||
  isSet(config.jvmXxOpts) ||
  isSet(config.jvmDdOpts) ||
  isSet(config.extraArgs);
