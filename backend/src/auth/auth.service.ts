import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PayloadToken } from './models/token.model';
import { UsersService } from 'src/users/services/users.service';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  async validateUser(username: string, password: string): Promise<PayloadToken | null> {
    try {
      const user = await this.usersService.getUserByUsername(username);

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

  async generateJwt(user: PayloadToken) {
    const payload: PayloadToken = {
      username: user.username,
      userId: user.userId,
      role: user.role,
    };
    
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createRefreshToken(user.userId);
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      username: user.username,
      expires_in: 900, // 15 minutes in seconds
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
}
