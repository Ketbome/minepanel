import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { assertContained } from 'src/common/fs/contained-path';
import { ServerConfig } from 'src/server-management/dto/server-config.model';
import { ComposeEdge, InstanceSettingsService } from 'src/settings/instance-settings.service';
import { isVelocityBackend, VELOCITY_BACKEND_TYPES } from './velocity-backend';

type PaperGlobal = { proxies?: { velocity?: Record<string, unknown> } } & Record<string, unknown>;

/**
 * Keeps `proxies.velocity` in a backend's paper-global.yml in line with its
 * Velocity membership. Only those three keys are touched: the rest of the file
 * is the operator's, and a missing file is created with just them (Paper fills
 * in its defaults on boot).
 */
@Injectable()
export class VelocityForwardingService {
  private readonly SERVERS_DIR: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly instanceSettings: InstanceSettingsService,
  ) {
    this.SERVERS_DIR = this.configService.get('serversDir');
  }

  async apply(config: ServerConfig, edge: ComposeEdge): Promise<void> {
    if ((config.edition ?? 'JAVA') !== 'JAVA' || !VELOCITY_BACKEND_TYPES.includes(config.serverType)) return;

    const member = edge === 'velocity' && config.velocityEnabled === true && isVelocityBackend(config);
    const root = path.join(this.SERVERS_DIR, config.id, 'mc-data');
    const file = path.join(root, 'config', 'paper-global.yml');
    const exists = await fs.pathExists(file);
    if (!member && !exists) return;

    await assertContained(root, file);
    const doc = ((exists ? yaml.load(await fs.readFile(file, 'utf8')) : null) ?? {}) as PaperGlobal;
    const velocity = doc.proxies?.velocity ?? {};

    if (member) {
      const { forwardingSecret } = await this.instanceSettings.getVelocitySecrets();
      if (velocity.enabled === true && velocity['online-mode'] === true && velocity.secret === forwardingSecret) return;
      Object.assign(velocity, { enabled: true, 'online-mode': true, secret: forwardingSecret });
    } else {
      // Only undo what the panel set: another secret means an operator's own proxy.
      if (velocity.enabled !== true) return;
      const { forwardingSecret } = await this.instanceSettings.getVelocitySecrets();
      if (velocity.secret !== forwardingSecret) return;
      velocity.enabled = false;
      delete velocity.secret;
    }

    doc.proxies = { ...doc.proxies, velocity };
    const dir = path.dirname(file);
    const dirExists = await fs.pathExists(dir);
    await fs.ensureDir(dir);
    await fs.writeFile(file, yaml.dump(doc, { lineWidth: -1 }));

    // The panel writes as root but the server runs as the owner of mc-data: Paper must be able to
    // rewrite this file and add its other configs next to it. A rewritten file keeps its owner.
    const { uid, gid } = await fs.stat(root);
    if (!dirExists) await fs.chown(dir, uid, gid);
    if (!exists) await fs.chown(file, uid, gid);
  }
}
