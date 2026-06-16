import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OidcController } from './oidc/oidc.controller';
import { OidcService } from './oidc/oidc.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtAuthGuard } from './guards/auth.guard';
import { UsersModule } from 'src/users/users.module';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { AuthMailService } from './auth-mail.service';
@Module({
  imports: [
    UsersModule,
    PassportModule,
    TypeOrmModule.forFeature([RefreshToken, PasswordResetToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          secret: configService.get('jwtSecret'),
          signOptions: {
            expiresIn: configService.get('jwtExpiresIn') || '2d',
            issuer: configService.get('jwtIssuer'),
            audience: configService.get('jwtAudience'),
          },
        };
      },
    }),
  ],
  providers: [AuthService, AuthMailService, OidcService, LocalStrategy, JwtStrategy, JwtAuthGuard],
  controllers: [AuthController, OidcController],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
