import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '../entities/users.entity';
import { ChangePasswordDto, CreateUsersDto, UpdateProfileDto, UpdateUsersDto } from '../dtos/users.dto';
import * as bcrypt from 'bcrypt';
import { Settings } from '../entities/settings.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,
    @InjectRepository(Settings)
    private readonly settingsRepo: Repository<Settings>,
  ) {}

  async getUsers(): Promise<Users[]> {
    return this.usersRepo.find();
  }

  async getUserById(id: number): Promise<Users> {
    return this.usersRepo.findOne({ where: { id } });
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
    await this.usersRepo.delete(id);
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
}
