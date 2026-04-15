import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayloadToken } from '../models/token.model';
import { UsersService } from 'src/users/services/users.service';
import { Request } from 'express';

const extractJwtFromRequest = (req: Request): string | null => {
  // Priority 1: Cookie (most secure)
  if (req.cookies?.access_token) {
    return req.cookies.access_token;
  }
  
  // Priority 2: Authorization header (for API clients)
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (fromHeader) return fromHeader;

  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: extractJwtFromRequest,
      ignoreExpiration: false,
      secretOrKey: configService.get('jwtSecret'),
      issuer: configService.get('jwtIssuer'),
      audience: configService.get('jwtAudience'),
    });
  }

  async validate(payload: PayloadToken) {
    // Verify user still exists and is active
    const user = await this.usersService.getUserById(payload.userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return { userId: payload.userId, username: payload.username, role: payload.role };
  }
}
