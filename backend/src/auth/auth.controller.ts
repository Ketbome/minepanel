import { Controller, Post, Body, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.authService.generateJwt(user);
  }

  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    if (!body.refresh_token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const user = await this.authService.validateRefreshToken(body.refresh_token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return this.authService.generateJwt(user);
  }

  @Post('logout')
  async logout(@Body() body: { refresh_token: string }) {
    if (body.refresh_token) {
      await this.authService.revokeRefreshToken(body.refresh_token);
    }
    return { message: 'Logged out successfully' };
  }
}
