import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayloadToken } from '../models/token.model';
import { Request } from 'express';

const extractJwtFromHeaderOrQuery = (req: Request): string | null => {
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (fromHeader) return fromHeader;

  // Fallback to query param for file downloads
  const token = req.query?.token as string;
  return token || null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    super({
      jwtFromRequest: extractJwtFromHeaderOrQuery,
      ignoreExpiration: false,
      secretOrKey: configService.get('jwtSecret'),
    });
  }

  async validate(payload: PayloadToken) {
    return { userId: payload.userId, username: payload.username, role: payload.role };
  }
}
