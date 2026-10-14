import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { ApiToken } from './entities/api-token.entity';
import { CreateApiTokenDto } from './dtos/api-token.dto';
import { ApiTokenPermissions, PayloadToken } from './models/token.model';
import { Users } from 'src/users/entities/users.entity';
import { AccessControlService } from 'src/users/services/access-control.service';
import { DEFAULT_USER_PERMISSIONS, normalizeServerAccess } from 'src/users/access-control.types';

export const API_TOKEN_PREFIX = 'mp_';
const DEFAULT_EXPIRY_DAYS = 90;
// Every sql.js save rewrites the whole DB file, so usage is recorded at most once a minute.
const LAST_USED_WRITE_INTERVAL_MS = 60_000;

export const API_TOKEN_PERMISSION_KEYS = Object.keys(DEFAULT_USER_PERMISSIONS).filter((key) => key !== 'useApiTokens') as Array<keyof ApiTokenPermissions>;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class ApiTokensService {
  constructor(
    @InjectRepository(ApiToken)
    private readonly tokensRepo: Repository<ApiToken>,
    private readonly accessControl: AccessControlService,
  ) {}

  async create(user: Users, dto: CreateApiTokenDto) {
    if (!this.accessControl.canUsePermission(user, 'useApiTokens')) {
      throw new ForbiddenException('You do not have permission to create API tokens');
    }
    if (dto.admin && !this.accessControl.isAdmin(user)) {
      throw new BadRequestException('Only admins can create admin tokens');
    }

    const permissions = {} as ApiTokenPermissions;
    for (const key of API_TOKEN_PERMISSION_KEYS) {
      const granted = dto.permissions?.[key] === true;
      if (granted && !this.accessControl.canUsePermission(user, key)) {
        throw new BadRequestException(`You cannot grant ${key}`);
      }
      permissions[key] = granted;
    }

    const serverAccess = normalizeServerAccess(dto.serverAccess);
    const denied = serverAccess.filter((serverId) => !this.accessControl.canAccessServer(user, serverId));
    if (denied.length) {
      throw new BadRequestException(`You cannot grant access to: ${denied.join(', ')}`);
    }

    const token = API_TOKEN_PREFIX + randomBytes(32).toString('base64url');
    const days = dto.expiresInDays === undefined ? DEFAULT_EXPIRY_DAYS : dto.expiresInDays;
    const saved = await this.tokensRepo.save(
      this.tokensRepo.create({
        userId: user.id,
        name: dto.name.trim(),
        tokenHash: hashToken(token),
        prefix: token.slice(0, 8),
        admin: !!dto.admin,
        readOnly: !!dto.readOnly,
        permissions,
        serverAccess,
        expiresAt: days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null,
        lastUsedAt: null,
      }),
    );

    return { ...this.serialize(saved), token };
  }

  async listOwn(userId: number) {
    const tokens = await this.tokensRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return tokens.map((token) => this.serialize(token));
  }

  async listAll() {
    const tokens = await this.tokensRepo.find({ relations: { user: true }, order: { createdAt: 'DESC' } });
    return tokens.map((token) => ({ ...this.serialize(token), userId: token.userId, username: token.user?.username ?? null }));
  }

  async revoke(actor: Users, id: number): Promise<ApiToken> {
    const token = await this.tokensRepo.findOne({ where: { id } });
    if (!token || (token.userId !== actor.id && !this.accessControl.isAdmin(actor))) {
      throw new NotFoundException('API token not found');
    }

    await this.tokensRepo.delete(token.id);
    return token;
  }

  async authenticate(rawToken: string): Promise<PayloadToken> {
    const token = await this.tokensRepo.findOne({ where: { tokenHash: hashToken(rawToken) }, relations: { user: true } });
    const user = token?.user;
    const expired = token?.expiresAt && new Date(token.expiresAt).getTime() <= Date.now();
    if (!token || !user?.isActive || expired || !this.accessControl.canUsePermission(user, 'useApiTokens')) {
      throw new UnauthorizedException('Invalid or expired API token');
    }

    if (!token.lastUsedAt || Date.now() - new Date(token.lastUsedAt).getTime() >= LAST_USED_WRITE_INTERVAL_MS) {
      await this.tokensRepo.update(token.id, { lastUsedAt: new Date() });
    }

    return {
      userId: user.id,
      username: user.username,
      role: this.accessControl.isAdmin(user) && token.admin ? 'ADMIN' : 'USER',
      apiToken: {
        id: token.id,
        admin: token.admin,
        readOnly: token.readOnly,
        permissions: token.permissions,
        serverAccess: token.serverAccess,
      },
    };
  }

  private serialize(token: ApiToken) {
    return {
      id: token.id,
      name: token.name,
      prefix: token.prefix,
      admin: token.admin,
      readOnly: token.readOnly,
      permissions: token.permissions,
      serverAccess: token.serverAccess,
      expiresAt: token.expiresAt,
      lastUsedAt: token.lastUsedAt,
      createdAt: token.createdAt,
    };
  }
}
