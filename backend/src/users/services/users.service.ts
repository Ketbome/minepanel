import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '../entities/users.entity';
import { ChangePasswordDto, CreateUserInvitationDto, CreateUsersDto, UpdateProfileDto, UpdateUserAccessDto, UpdateUsersDto } from '../dtos/users.dto';
import * as bcrypt from 'bcrypt';
import { Settings } from '../entities/settings.entity';
import { UserInvitation } from '../entities/user-invitation.entity';
import { createHash, randomBytes } from 'node:crypto';
import { DEFAULT_USER_PERMISSIONS, FULL_ACCESS_PERMISSIONS, normalizePermissions, normalizeServerAccess, UserAccessState } from '../access-control.types';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,
    @InjectRepository(Settings)
    private readonly settingsRepo: Repository<Settings>,
    @InjectRepository(UserInvitation)
    private readonly invitationsRepo: Repository<UserInvitation>,
    private readonly configService: ConfigService,
  ) {}

  async getUsers(): Promise<Users[]> {
    return this.usersRepo.find();
  }

  async getUserById(id: number): Promise<Users> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async getRequiredUserById(id: number): Promise<Users> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getUserByUsername(username: string): Promise<Users> {
    return this.usersRepo.findOne({ where: { username } });
  }

  async getUserByEmail(email: string): Promise<Users> {
    return this.usersRepo.findOne({ where: { email: this.normalizeEmail(email) } });
  }

  async getUserByUsernameOrEmail(identifier: string): Promise<Users> {
    const normalizedIdentifier = identifier.trim();
    const normalizedEmail = this.normalizeEmail(identifier);

    return this.usersRepo.findOne({
      where: [{ username: normalizedIdentifier }, { email: normalizedEmail }],
    });
  }

  async hasUsers(): Promise<boolean> {
    return (await this.usersRepo.count()) > 0;
  }

  async createUser(dto: CreateUsersDto): Promise<Users> {
    await this.ensureUniqueEmail(dto.email);

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepo.create({
      ...dto,
      username: dto.username.trim(),
      email: dto.email ? this.normalizeEmail(dto.email) : null,
      password: hashedPassword,
      role: 'USER',
      isActive: true,
      permissions: DEFAULT_USER_PERMISSIONS,
      serverAccess: [],
    });
    const savedUser = await this.usersRepo.save(user);
    const settings = this.settingsRepo.create({
      userId: savedUser.id,
    });
    await this.settingsRepo.save(settings);
    return savedUser;
  }

  async createInitialAdmin(dto: CreateUsersDto): Promise<Users> {
    if (await this.hasUsers()) {
      throw new ConflictException('Initial setup is already complete');
    }

    await this.ensureUniqueEmail(dto.email);

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const admin = this.usersRepo.create({
      username: dto.username.trim(),
      email: this.normalizeEmail(dto.email),
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      permissions: FULL_ACCESS_PERMISSIONS,
      serverAccess: [],
    });

    const savedAdmin = await this.usersRepo.save(admin);
    const settings = this.settingsRepo.create({
      userId: savedAdmin.id,
    });

    await this.settingsRepo.save(settings);

    return savedAdmin;
  }

  async updateUserByUsername(username: string, dto: UpdateUsersDto): Promise<Users> {
    const user = await this.usersRepo.findOne({ where: { username } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.ensureUniqueEmail(dto.email, user.id);
    delete dto.password;
    Object.assign(user, {
      ...dto,
      email: dto.email === undefined ? user.email : this.normalizeEmail(dto.email),
    });
    return this.usersRepo.save(user);
  }

  async updateUser(id: number, dto: UpdateUsersDto): Promise<Users> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.ensureUniqueEmail(dto.email, user.id);
    delete dto.password;
    Object.assign(user, {
      ...dto,
      email: dto.email === undefined ? user.email : this.normalizeEmail(dto.email),
    });
    return this.usersRepo.save(user);
  }

  async updateUserAccess(id: number, dto: UpdateUserAccessDto): Promise<Users> {
    const user = await this.getRequiredUserById(id);

    if (user.role === 'ADMIN') {
      throw new BadRequestException('Admin access cannot be modified');
    }

    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
    }

    if (dto.permissions) {
      const permissions = normalizePermissions({ ...user.permissions, ...dto.permissions });
      user.permissions = permissions;
      user.serverAccess = permissions.accessAllServers ? [] : normalizeServerAccess(dto.serverAccess ?? user.serverAccess);
    } else if (dto.serverAccess) {
      const permissions = normalizePermissions(user.permissions);
      user.permissions = permissions;
      user.serverAccess = permissions.accessAllServers ? [] : normalizeServerAccess(dto.serverAccess);
    }

    return this.usersRepo.save(user);
  }

  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<Users> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.ensureUniqueEmail(dto.email, user.id);
    user.email = this.normalizeEmail(dto.email);

    return this.usersRepo.save(user);
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === 'ADMIN') {
      throw new BadRequestException('Admin user cannot be deleted');
    }
    await this.usersRepo.delete(id);
  }

  async getUserAccessState(userId: number): Promise<UserAccessState> {
    const user = await this.getRequiredUserById(userId);

    return this.buildUserAccessState(user);
  }

  async getActiveInvitations(): Promise<UserInvitation[]> {
    const invitations = await this.invitationsRepo.find({
      where: { usedAt: null },
      order: { createdAt: 'DESC' },
    });

    return invitations.filter((invitation) => invitation.expiresAt > new Date());
  }

  async createInvitation(dto: CreateUserInvitationDto): Promise<{ invitation: UserInvitation; token: string; inviteUrl: string }> {
    const normalizedEmail = this.normalizeEmail(dto.email);
    await this.ensureUniqueEmail(normalizedEmail);

    if (normalizedEmail) {
      await this.invalidatePendingInvitationsForEmail(normalizedEmail);
    }

    const permissions = normalizePermissions(dto.permissions);
    const token = randomBytes(32).toString('hex');
    const invitation = this.invitationsRepo.create({
      tokenHash: this.hashToken(token),
      email: normalizedEmail,
      role: 'USER',
      permissions,
      serverAccess: permissions.accessAllServers ? [] : normalizeServerAccess(dto.serverAccess),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      usedAt: null,
    });

    const savedInvitation = await this.invitationsRepo.save(invitation);

    return {
      invitation: savedInvitation,
      token,
      inviteUrl: this.buildInvitationUrl(token),
    };
  }

  async getInvitationByToken(token: string): Promise<UserInvitation> {
    const invitation = await this.invitationsRepo.findOne({ where: { tokenHash: this.hashToken(token) } });
    if (!invitation || invitation.usedAt || invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    return invitation;
  }

  async acceptInvitation(token: string, dto: CreateUsersDto): Promise<Users> {
    const invitation = await this.getInvitationByToken(token);
    await this.ensureUniqueEmail(invitation.email ?? dto.email);

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepo.create({
      username: dto.username.trim(),
      email: invitation.email ?? this.normalizeEmail(dto.email),
      password: hashedPassword,
      role: invitation.role,
      isActive: true,
      permissions: normalizePermissions(invitation.permissions),
      serverAccess: normalizeServerAccess(invitation.serverAccess),
    });

    const savedUser = await this.usersRepo.save(user);
    const settings = this.settingsRepo.create({
      userId: savedUser.id,
    });

    await this.settingsRepo.save(settings);
    invitation.usedAt = new Date();
    await this.invitationsRepo.save(invitation);

    return savedUser;
  }

  buildUserAccessState(user: Users): UserAccessState {
    if (user.role === 'ADMIN') {
      return {
        permissions: FULL_ACCESS_PERMISSIONS,
        serverAccess: [],
      };
    }

    const permissions = normalizePermissions(user.permissions);

    return {
      permissions,
      serverAccess: permissions.accessAllServers ? [] : normalizeServerAccess(user.serverAccess),
    };
  }

  serializeUser(user: Users) {
    return {
      ...user,
      access: this.buildUserAccessState(user),
    };
  }

  async changePassword(userId: number, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = await bcrypt.hash(dto.newPassword, 12);
    await this.usersRepo.save(user);

    return { message: 'Password changed successfully' };
  }

  private normalizeEmail(email?: string | null): string | null {
    if (!email) {
      return null;
    }

    return email.trim().toLowerCase();
  }

  private async ensureUniqueEmail(email?: string | null, excludeUserId?: number): Promise<void> {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) {
      return;
    }

    const existingUser = await this.usersRepo.findOne({ where: { email: normalizedEmail } });
    if (existingUser && existingUser.id !== excludeUserId) {
      throw new ConflictException('Email is already in use');
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async invalidatePendingInvitationsForEmail(email: string): Promise<void> {
    await this.invitationsRepo
      .createQueryBuilder()
      .update(UserInvitation)
      .set({ usedAt: new Date() })
      .where('email = :email', { email })
      .andWhere('usedAt IS NULL')
      .execute();
  }

  private buildInvitationUrl(token: string): string {
    const frontendUrl = this.configService.get<string>('frontendUrl');
    if (!frontendUrl) {
      throw new BadRequestException('FRONTEND_URL is not configured');
    }

    const url = new URL(frontendUrl);
    url.searchParams.set('inviteToken', token);

    return url.toString();
  }
}
