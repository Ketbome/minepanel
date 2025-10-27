import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PayloadToken } from './models/token.model';
import { UsersService } from 'src/users/services/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
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

  async generateJwt(user: any) {
    const payload: PayloadToken = {
      username: user.username,
      userId: user.userId,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      username: user.username,
    };
  }

  async generateHash(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
}
