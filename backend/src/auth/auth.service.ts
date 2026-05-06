import { BadRequestException, Injectable, InternalServerErrorException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { PayloadToken } from './models/token.model';
import { UsersService } from 'src/users/services/users.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { SetupAdminDto } from './dtos/auth.dto';
import { AuthMailService } from './auth-mail.service';
import { CreateUserInvitationDto } from 'src/users/dtos/users.dto';
import { AuditLogService } from 'src/users/services/audit-log.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly authMailService: AuthMailService,
    private readonly auditLogService: AuditLogService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepo: Repository<PasswordResetToken>,
  ) {}

  async validateUser(identifier: string, password: string): Promise<PayloadToken | null> {
    try {
      const user = await this.usersService.getUserByUsernameOrEmail(identifier);

      if (!user?.isActive) {
        return null;
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (validPassword) {
        return {
          userId: user.id,
          username: user.username,
          role: user.role,
        };
      }

      return null;
    } catch (error) {
      console.error('Error validating user:', error);
      return null;
    }
  }

  async getSetupStatus() {
    return {
      requiresSetup: !(await this.usersService.hasUsers()),
      passwordRecoveryEnabled: this.isPasswordRecoveryEnabled(),
    };
  }

  async createInitialAdmin(dto: SetupAdminDto) {
    const user = await this.usersService.createInitialAdmin(dto);

    return this.generateJwt({
      userId: user.id,
      username: user.username,
      role: user.role,
    });
  }

  async getSessionUser(userId: number) {
    const user = await this.usersService.getRequiredUserById(userId);

    return {
      userId: user.id,
      username: user.username,
      role: user.role,
      access: this.usersService.buildUserAccessState(user),
    };
  }

  async generateJwt(user: PayloadToken) {
    const payload: PayloadToken = {
      username: user.username,
      userId: user.userId,
      role: user.role,
    };
    
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createRefreshToken(user.userId);
    const decodedToken = this.jwtService.decode(accessToken) as { exp?: number; iat?: number } | null;
    const expiresIn = decodedToken?.exp && decodedToken?.iat ? decodedToken.exp - decodedToken.iat : 900;
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      username: user.username,
      expires_in: expiresIn,
    };
  }

  private async createRefreshToken(userId: number): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(token, 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.refreshTokenRepo.save({
      userId,
      token: hashedToken,
      expiresAt,
      revoked: false,
    });

    return token;
  }

  async validateRefreshToken(token: string): Promise<PayloadToken | null> {
    const tokens = await this.refreshTokenRepo.find({
      where: { revoked: false },
      relations: ['user'],
    });

    for (const storedToken of tokens) {
      const isValid = await bcrypt.compare(token, storedToken.token);
      
      if (isValid) {
        if (storedToken.expiresAt < new Date()) {
          await this.refreshTokenRepo.update(storedToken.id, { revoked: true });
          return null;
        }

        if (!storedToken.user?.isActive) {
          return null;
        }

        // Revoke old token (rotation)
        await this.refreshTokenRepo.update(storedToken.id, { revoked: true });

        return {
          userId: storedToken.user.id,
          username: storedToken.user.username,
          role: storedToken.user.role,
        };
      }
    }

    return null;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const tokens = await this.refreshTokenRepo.find({ where: { revoked: false } });

    for (const storedToken of tokens) {
      const isValid = await bcrypt.compare(token, storedToken.token);
      if (isValid) {
        await this.refreshTokenRepo.update(storedToken.id, { revoked: true });
        return;
      }
    }
  }

  async generateHash(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async createPasswordReset(email: string): Promise<void> {
    if (!this.isPasswordRecoveryEnabled()) {
      throw new ServiceUnavailableException('Password recovery is not configured');
    }

    const user = await this.usersService.getUserByEmail(email);
    if (!user?.isActive || !user.email) {
      return;
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.getPasswordResetTtlMinutes() * 60 * 1000);

    await this.passwordResetTokenRepo.update({ userId: user.id, usedAt: null }, { usedAt: new Date() });
    await this.passwordResetTokenRepo.save({
      userId: user.id,
      tokenHash,
      expiresAt,
      usedAt: null,
    });

    try {
      await this.authMailService.sendPasswordResetEmail(user.email, user.username, this.buildPasswordResetUrl(rawToken));
    } catch (error) {
      this.logger.error('Failed to send password reset email', error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException('Unable to send password reset email');
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const passwordResetToken = await this.passwordResetTokenRepo.findOne({
      where: { tokenHash: this.hashToken(token) },
      relations: ['user'],
    });

    if (
      !passwordResetToken ||
      passwordResetToken.usedAt ||
      passwordResetToken.expiresAt < new Date() ||
      !passwordResetToken.user?.isActive
    ) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    passwordResetToken.user.password = await bcrypt.hash(password, 12);
    await this.passwordResetTokenRepo.manager.save(passwordResetToken.user);

    const usedAt = new Date();
    await this.passwordResetTokenRepo.update({ userId: passwordResetToken.userId, usedAt: null }, { usedAt });
    await this.refreshTokenRepo.update({ userId: passwordResetToken.userId, revoked: false }, { revoked: true });
  }

  async createInvitation(dto: CreateUserInvitationDto, actor: PayloadToken) {
    const result = await this.usersService.createInvitation(dto);
    const shouldSendEmail = !!result.invitation.email && this.authMailService.isConfigured();

    if (shouldSendEmail) {
      await this.authMailService.sendUserInvitationEmail(result.invitation.email, result.inviteUrl);
    }

    await this.auditLogService.record({
      actorUserId: actor.userId,
      actorUsername: actor.username,
      category: 'invitations',
      action: 'create_invitation',
      summary: `Created invitation${result.invitation.email ? ` for ${result.invitation.email}` : ''}`,
      metadata: { invitationId: result.invitation.id, emailSent: shouldSendEmail },
    });

    return {
      id: result.invitation.id,
      email: result.invitation.email,
      role: result.invitation.role,
      access: {
        permissions: result.invitation.permissions,
        serverAccess: result.invitation.serverAccess ?? [],
      },
      expiresAt: result.invitation.expiresAt,
      inviteUrl: result.inviteUrl,
      emailSent: shouldSendEmail,
    };
  }

  async getActiveInvitations() {
    const invitations = await this.usersService.getActiveInvitations();

    return invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      access: {
        permissions: invitation.permissions,
        serverAccess: invitation.serverAccess ?? [],
      },
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    }));
  }

  async getInvitationLink(id: number, actor: PayloadToken) {
    const inviteUrl = await this.usersService.getInvitationLink(id);

    await this.auditLogService.record({
      actorUserId: actor.userId,
      actorUsername: actor.username,
      category: 'invitations',
      action: 'copy_invitation_link',
      summary: `Copied invitation link for invitation ${id}`,
      metadata: { invitationId: id },
    });

    return { inviteUrl };
  }

  async getInvitation(token: string) {
    const invitation = await this.usersService.getInvitationByToken(token);

    return {
      email: invitation.email,
      role: invitation.role,
      access: {
        permissions: invitation.permissions,
        serverAccess: invitation.serverAccess ?? [],
      },
      expiresAt: invitation.expiresAt,
    };
  }

  async acceptInvitation(token: string, username: string, password: string, email?: string) {
    const user = await this.usersService.acceptInvitation(token, {
      username,
      password,
      email,
    });

    await this.auditLogService.record({
      actorUserId: user.id,
      actorUsername: user.username,
      category: 'invitations',
      action: 'accept_invitation',
      summary: 'Accepted invitation and completed registration',
    });

    return this.generateJwt({
      userId: user.id,
      username: user.username,
      role: user.role,
    });
  }

  isPasswordRecoveryEnabled(): boolean {
    return this.authMailService.isConfigured();
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getPasswordResetTtlMinutes(): number {
    const ttl = this.configService.get<number>('passwordResetTokenExpiresInMinutes');

    return Number.isFinite(ttl) && ttl > 0 ? ttl : 60;
  }

  private buildPasswordResetUrl(token: string): string {
    const frontendUrl = this.configService.get<string>('frontendUrl');
    if (!frontendUrl) {
      throw new ServiceUnavailableException('FRONTEND_URL is not configured');
    }

    const url = new URL(frontendUrl);
    url.searchParams.set('resetToken', token);

    return url.toString();
  }
}
