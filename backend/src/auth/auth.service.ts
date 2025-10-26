import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    try {
      const validUsername = username === this.configService.get('CLIENT_USERNAME');
      const validPassword = await bcrypt.compare(password, this.configService.get('CLIENT_PASSWORD'));

      if (validUsername && validPassword) {
        return { userId: 1, username };
      }
      return null;
    } catch (error) {
      console.error('Error validating user:', error);
      return null;
    }
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.userId };
    return {
      access_token: this.jwtService.sign(payload),
      username: user.username,
    };
  }

  async generateHash(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
}
