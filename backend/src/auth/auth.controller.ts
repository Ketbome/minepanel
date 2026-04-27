import { Controller, Post, Body, UnauthorizedException, UseGuards, Res, Req, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/auth.guard';
import { Public } from './decorators/public.decorator';
import { Response, Request, CookieOptions } from 'express';
import { ForgotPasswordDto, LoginDto, ResetPasswordDto, SetupAdminDto } from './dtos/auth.dto';

@Controller('auth')
export class AuthController {
  private static readonly REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('setup-status')
  async getSetupStatus() {
    return this.authService.getSetupStatus();
  }

  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    
    const tokens = await this.authService.generateJwt(user);
    this.setAuthCookies(res, tokens.access_token, tokens.refresh_token, tokens.expires_in);
    
    return {
      username: tokens.username,
      expires_in: tokens.expires_in,
    };
  }

  @Public()
  @Post('setup-admin')
  async setupAdmin(@Body() body: SetupAdminDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.createInitialAdmin(body);
    this.setAuthCookies(res, tokens.access_token, tokens.refresh_token, tokens.expires_in);

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

  @Public()
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
    this.setAuthCookies(res, tokens.access_token, tokens.refresh_token, tokens.expires_in);
    
    return {
      username: tokens.username,
      expires_in: tokens.expires_in,
    };
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    await this.authService.createPasswordReset(body.email);

    return {
      message: 'If the email exists, a password reset link has been sent',
    };
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.authService.resetPassword(body.token, body.password);

    return {
      message: 'Password reset successfully',
    };
  }

  @Public()
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

  private getAuthCookieOptions(maxAge: number): CookieOptions {
    return {
      httpOnly: true,
      secure: this.shouldUseSecureCookies(),
      sameSite: 'lax',
      maxAge,
    };
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string, expiresInSeconds: number): void {
    res.cookie('access_token', accessToken, this.getAuthCookieOptions(expiresInSeconds * 1000));
    res.cookie('refresh_token', refreshToken, this.getAuthCookieOptions(AuthController.REFRESH_TOKEN_MAX_AGE));
  }

  private shouldUseSecureCookies(): boolean {
    return process.env.ALLOW_INSECURE_AUTH_COOKIES !== 'true';
  }
}
