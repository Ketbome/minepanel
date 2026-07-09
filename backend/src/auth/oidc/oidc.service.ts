import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type * as OidcClient from 'openid-client';
import { InstanceSettingsService, ResolvedOidc } from '../../settings/instance-settings.service';

// openid-client v6 is ESM-only; keep a real dynamic import so TS does not down-level it to require().
const importOidcClient = new Function('m', 'return import(m)') as (m: string) => Promise<typeof OidcClient>;

interface OidcTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
}

interface OidcProfile {
  sub: string;
  email?: string | null;
  username?: string | null;
}

@Injectable()
export class OidcService {
  private clientPromise: Promise<typeof OidcClient> | null = null;
  private configPromise: Promise<OidcClient.Configuration> | null = null;

  constructor(
    private readonly instanceSettings: InstanceSettingsService,
    private readonly jwtService: JwtService,
  ) {
    // Rebuild the OIDC client the next time it is needed when settings change.
    this.instanceSettings.registerResetHandler(() => {
      this.configPromise = null;
    });
  }

  async isEnabled(): Promise<boolean> {
    return (await this.instanceSettings.getOidc()).enabled;
  }

  async buildLoginUrl(): Promise<{ url: string; tx: string }> {
    const oidc = await this.getOidcConfig();
    const client = await this.getClient();
    const config = await this.getConfig(oidc);
    const redirectUri = oidc.redirectUri!;
    const scopes = oidc.scopes;

    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const state = client.randomState();
    const nonce = client.randomNonce();

    const url = client.buildAuthorizationUrl(config, {
      redirect_uri: redirectUri,
      scope: scopes,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
      nonce,
    });

    const tx = this.jwtService.sign({ state, nonce, codeVerifier }, { expiresIn: '10m' });

    return { url: url.href, tx };
  }

  async handleCallback(currentUrl: URL, tx: string | undefined): Promise<OidcProfile> {
    if (!tx) {
      throw new UnauthorizedException('Missing OIDC transaction');
    }

    let transaction: OidcTransaction;
    try {
      transaction = this.jwtService.verify<OidcTransaction>(tx);
    } catch {
      throw new UnauthorizedException('Invalid OIDC transaction');
    }

    const oidc = await this.getOidcConfig();
    const client = await this.getClient();
    const config = await this.getConfig(oidc);

    const tokens = await client.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: transaction.codeVerifier,
      expectedState: transaction.state,
      expectedNonce: transaction.nonce,
      idTokenExpected: true,
    });

    const claims = tokens.claims();
    if (!claims?.sub) {
      throw new UnauthorizedException('OIDC response missing subject');
    }

    return {
      sub: String(claims.sub),
      email: typeof claims.email === 'string' ? claims.email : null,
      username: this.pickUsername(claims),
    };
  }

  private pickUsername(claims: Record<string, unknown>): string | null {
    const preferred = claims.preferred_username ?? claims.nickname ?? claims.name;
    return typeof preferred === 'string' ? preferred : null;
  }

  private async getOidcConfig(): Promise<ResolvedOidc> {
    const oidc = await this.instanceSettings.getOidc();
    if (!oidc.enabled) {
      throw new ServiceUnavailableException('Single sign-on is not configured');
    }
    return oidc;
  }

  async getRedirectUri(): Promise<string> {
    return (await this.getOidcConfig()).redirectUri!;
  }

  private getClient(): Promise<typeof OidcClient> {
    if (!this.clientPromise) {
      this.clientPromise = importOidcClient('openid-client');
    }
    return this.clientPromise;
  }

  private getConfig(oidc: ResolvedOidc): Promise<OidcClient.Configuration> {
    if (!this.configPromise) {
      this.configPromise = this.getClient().then((client) =>
        client.discovery(new URL(oidc.issuer!), oidc.clientId!, oidc.clientSecret!),
      );
    }
    return this.configPromise;
  }
}
