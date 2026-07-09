import { Controller, Get, NotFoundException, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Public } from '../decorators/public.decorator';
import { OidcService } from './oidc.service';
import { AuthService } from '../auth.service';
import { AuditLogService } from 'src/users/services/audit-log.service';
import { authCookieOptions, OIDC_TX_COOKIE, OIDC_TX_MAX_AGE, setAuthCookies } from '../utils/auth-cookies';

@Controller('auth/oidc')
export class OidcController {
  constructor(
    private readonly oidcService: OidcService,
    private readonly authService: AuthService,
    private readonly auditLogService: AuditLogService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get('login')
  async login(@Res() res: Response) {
    if (!(await this.oidcService.isEnabled())) {
      throw new NotFoundException('Single sign-on is not configured');
    }

    const { url, tx } = await this.oidcService.buildLoginUrl();
    res.cookie(OIDC_TX_COOKIE, tx, authCookieOptions(OIDC_TX_MAX_AGE));
    res.redirect(url);
  }

  @Public()
  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>('frontendUrl');

    if (!(await this.oidcService.isEnabled())) {
      throw new NotFoundException('Single sign-on is not configured');
    }

    try {
      const callbackUrl = await this.buildCallbackUrl(req);
      const profile = await this.oidcService.handleCallback(callbackUrl, req.cookies?.[OIDC_TX_COOKIE]);
      const tokens = await this.authService.loginWithOidc(profile);

      res.clearCookie(OIDC_TX_COOKIE);
      setAuthCookies(res, tokens.access_token, tokens.refresh_token, tokens.expires_in);

      await this.auditLogService.record({
        actorUserId: tokens.userId,
        actorUsername: tokens.username,
        category: 'auth',
        action: 'login',
        summary: 'Signed in via single sign-on',
      });

      res.redirect(`${frontendUrl}/dashboard/home`);
    } catch {
      res.clearCookie(OIDC_TX_COOKIE);
      res.redirect(`${frontendUrl}/?ssoError=1`);
    }
  }

  private async buildCallbackUrl(req: Request): Promise<URL> {
    const redirectUri = await this.oidcService.getRedirectUri();
    const url = new URL(redirectUri);
    const incoming = new URL(req.originalUrl, redirectUri);
    url.search = incoming.search;
    return url;
  }
}
