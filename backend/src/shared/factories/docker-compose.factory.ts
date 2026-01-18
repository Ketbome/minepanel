import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as yaml from 'js-yaml';
import * as path from 'node:path';

/**
 * Base Docker Compose service configuration
 */
export interface DockerComposeService {
  image: string;
  container_name: string;
  restart: string;
  ports?: string[];
  environment?: Record<string, string>;
  volumes?: string[];
  stdin_open?: boolean;
  tty?: boolean;
  privileged?: boolean;
  labels?: string[];
  deploy?: {
    resources?: {
      limits?: { cpus?: string; memory?: string };
      reservations?: { cpus?: string; memory?: string };
    };
  };
  depends_on?: string[];
}

/**
 * Docker Compose file structure
 */
export interface DockerComposeFile {
  services: Record<string, DockerComposeService>;
  volumes?: Record<string, object>;
}

/**
 * Hytale server configuration
 */
export interface HytaleServerConfig {
  id: string;
  serverName: string;
  port: string;
  javaXms: string;
  javaXmx: string;
  useG1gc: boolean;
  viewDistance?: string;
  maxPlayers?: string;
  serverDescription?: string;
  dockerImage: string;
  restartPolicy: string;
  tz: string;
  envVars?: string;
  bindAddr?: string;
  autoDownload?: boolean;
}

/**
 * Factory for generating Docker Compose configurations
 * Implements Factory Pattern to create compose files for different game types
 */
@Injectable()
export class DockerComposeFactory {
  private readonly logger = new Logger(DockerComposeFactory.name);
  private readonly BASE_DIR: string;

  constructor(private readonly configService: ConfigService) {
    this.BASE_DIR = this.configService.get('baseDir') || process.cwd();
  }

  /**
   * Generate Docker Compose YAML for a Hytale server
   */
  createHytaleCompose(config: HytaleServerConfig): string {
    const serverDir = path.join(this.BASE_DIR, 'servers', config.id);

    const environment: Record<string, string> = {
      TZ: config.tz || 'UTC',
      JAVA_XMS: config.javaXms || '4G',
      JAVA_XMX: config.javaXmx || '8G',
      BIND_PORT: config.port || '5520',
      BIND_ADDR: config.bindAddr || '0.0.0.0',
      AUTO_DOWNLOAD: String(config.autoDownload !== false),
      USE_G1GC: String(config.useG1gc !== false),
    };

    // Optional game settings
    if (config.viewDistance) {
      environment['VIEW_DISTANCE'] = config.viewDistance;
    }
    if (config.maxPlayers) {
      environment['MAX_PLAYERS'] = config.maxPlayers;
    }
    if (config.serverDescription) {
      environment['SERVER_NAME'] = config.serverDescription;
    }

    // Custom env vars
    if (config.envVars) {
      const customVars = this.parseEnvVars(config.envVars);
      Object.assign(environment, customVars);
    }

    const volumes = [
      `${path.join(serverDir, 'server')}:/opt/hytale`,
      '/etc/machine-id:/etc/machine-id:ro',
      '/sys/class/dmi/id:/sys/class/dmi/id:ro',
    ];

    const hytaleService: DockerComposeService = {
      image: config.dockerImage || 'ketbom/hytale-server:latest',
      container_name: config.id,
      restart: config.restartPolicy || 'unless-stopped',
      stdin_open: true,
      tty: true,
      privileged: true,
      ports: [`${config.port || '5520'}:${config.port || '5520'}/udp`],
      environment,
      volumes,
    };

    const composeFile: DockerComposeFile = {
      services: { hytale: hytaleService },
    };

    return yaml.dump(composeFile, { lineWidth: -1 });
  }

  /**
   * Get default Hytale server configuration
   */
  getDefaultHytaleConfig(id: string): HytaleServerConfig {
    return {
      id,
      serverName: id,
      port: '5520',
      javaXms: '4G',
      javaXmx: '8G',
      useG1gc: true,
      dockerImage: 'ketbom/hytale-server:latest',
      restartPolicy: 'unless-stopped',
      tz: 'UTC',
      autoDownload: true,
      bindAddr: '0.0.0.0',
    };
  }

  /**
   * Parse custom environment variables from string format
   */
  private parseEnvVars(envVars: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = envVars.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      const [key, ...valueParts] = line.split('=');
      if (key?.trim() && valueParts.length > 0) {
        result[key.trim()] = valueParts.join('=').trim();
      }
    }

    return result;
  }

  /**
   * Parse Docker labels from string format
   */
  parseDockerLabels(labelsString: string): string[] | undefined {
    if (!labelsString?.trim()) return undefined;

    const labels = labelsString
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.trim())
      .filter((line) => line.includes('='));

    return labels.length > 0 ? labels : undefined;
  }
}
