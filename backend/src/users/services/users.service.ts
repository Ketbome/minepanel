import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '../entities/users.entity';
import { CreateUsersDto, UpdateUsersDto } from '../dtos/users.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { Settings } from '../entities/settings.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,
    private readonly configService: ConfigService,
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

  async createUser(dto: CreateUsersDto): Promise<Users> {
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepo.create({
      ...dto,
      password: hashedPassword,
    });
    const savedUser = await this.usersRepo.save(user);
    const settings = this.settingsRepo.create({
      userId: savedUser.id,
    });
    await this.settingsRepo.save(settings);
    return savedUser;
  }

  async createDefaultAdmin(): Promise<void> {
    const adminExists = await this.usersRepo.findOne({
      where: { username: this.configService.get('clientUsername') },
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(this.configService.get('clientPassword'), 12);

      const admin = this.usersRepo.create({
        username: this.configService.get('clientUsername'),
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      });

      await this.usersRepo.save(admin);

      const settings = this.settingsRepo.create({
        userId: admin.id,
      });

      await this.settingsRepo.save(settings);
    }
  }

  async updateUser(id: number, dto: UpdateUsersDto): Promise<Users> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    Object.assign(user, dto);
    return this.usersRepo.save(user);
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersRepo.delete(id);
  }
}
