import { Controller, Post, Body, ForbiddenException, UnauthorizedException, UseGuards, Res, Req, Get, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/auth.guard';
import { Public } from './decorators/public.decorator';
import { Response, Request } from 'express';
import { AcceptInvitationDto, ForgotPasswordDto, LoginDto, ResetPasswordDto, SetupAdminDto } from './dtos/auth.dto';
import { CreateUserInvitationDto } from 'src/users/dtos/users.dto';
import { AuditLogService } from 'src/users/services/audit-log.service';
import { setAuthCookies } from './utils/auth-cookies';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditLogService: AuditLogService,
    private readonly configService: ConfigService,
  ) {}

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
    this.assertPasswordLoginEnabled();

    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.authService.generateJwt(user);
    setAuthCookies(res, tokens.access_token, tokens.refresh_token, tokens.expires_in);

    await this.auditLogService.record({
      actorUserId: user.userId,
      actorUsername: user.username,
      category: 'auth',
      action: 'login',
      summary: 'Signed in successfully',
    });
    
    return {
      username: tokens.username,
      expires_in: tokens.expires_in,
    };
  }

  @Public()
  @Post('setup-admin')
  async setupAdmin(@Body() body: SetupAdminDto, @Res({ passthrough: true }) res: Response) {
    this.assertPasswordLoginEnabled();

    const tokens = await this.authService.createInitialAdmin(body);
    setAuthCookies(res, tokens.access_token, tokens.refresh_token, tokens.expires_in);

    return {
      username: tokens.username,
      expires_in: tokens.expires_in,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    return this.authService.getSessionUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('invitations')
  async listInvitations(@Req() req: any) {
    const sessionUser = await this.authService.getSessionUser(req.user.userId);
    if (!sessionUser.access.permissions.manageUsers) {
      throw new ForbiddenException('Forbidden');
    }

    return this.authService.getActiveInvitations();
  }

  @UseGuards(JwtAuthGuard)
  @Post('invitations')
  async createInvitation(@Req() req: any, @Body() body: CreateUserInvitationDto) {
    const sessionUser = await this.authService.getSessionUser(req.user.userId);
    if (!sessionUser.access.permissions.manageUsers) {
      throw new ForbiddenException('Forbidden');
    }

    return this.authService.createInvitation(body, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('invitations/:id/link')
  async getInvitationLink(@Req() req: any, @Param('id') id: number) {
    const sessionUser = await this.authService.getSessionUser(req.user.userId);
    if (!sessionUser.access.permissions.manageUsers) {
      throw new ForbiddenException('Forbidden');
    }

    return this.authService.getInvitationLink(Number(id), req.user);
  }

  @Public()
  @Get('invitations/:token')
  async getInvitation(@Param('token') token: string) {
    return this.authService.getInvitation(token);
  }

  @Public()
  @Post('invitations/accept')
  async acceptInvitation(@Body() body: AcceptInvitationDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.acceptInvitation(body.token, body.username, body.password, body.email);
    setAuthCookies(res, tokens.access_token, tokens.refresh_token, tokens.expires_in);

    return {
      username: tokens.username,
      expires_in: tokens.expires_in,
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
    setAuthCookies(res, tokens.access_token, tokens.refresh_token, tokens.expires_in);

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

  private assertPasswordLoginEnabled(): void {
    const oidc = this.configService.get('oidc');
    if (oidc?.enabled && oidc?.disablePasswordLogin) {
      throw new ForbiddenException('Password login is disabled; use single sign-on');
    }
  }
}
