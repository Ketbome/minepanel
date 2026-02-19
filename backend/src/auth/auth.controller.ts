import { Controller, Post, Body, UnauthorizedException, UseGuards, Res, Req, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/auth.guard';
import { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(
    @Body() body: { username: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    
    const tokens = await this.authService.generateJwt(user);
    
    // Set httpOnly cookies
    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    return {
      username: tokens.username,
      expires_in: tokens.expires_in,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    return {
      userId: req.user.userId,
      username: req.user.username,
      role: req.user.role,
    };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const user = await this.authService.validateRefreshToken(refreshToken);
    if (!user) {
      // Clear invalid cookies
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokens = await this.authService.generateJwt(user);
    
    // Update cookies with new tokens
    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
    
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    
    return {
      username: tokens.username,
      expires_in: tokens.expires_in,
    };
  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;
    
    if (refreshToken) {
      await this.authService.revokeRefreshToken(refreshToken);
    }
    
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    
    return { message: 'Logged out successfully' };
  }
}
