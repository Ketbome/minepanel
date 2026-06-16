import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type * as OidcClient from 'openid-client';

// openid-client v6 is ESM-only; keep a real dynamic import so TS does not down-level it to require().
const importOidcClient = new Function('m', 'return import(m)') as (m: string) => Promise<typeof OidcClient>;

interface OidcConfig {
  enabled: boolean;
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
}

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
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  get enabled(): boolean {
    return !!this.configService.get('oidc')?.enabled;
  }

  async buildLoginUrl(): Promise<{ url: string; tx: string }> {
    const client = await this.getClient();
    const config = await this.getConfig();
    const { redirectUri, scopes } = this.getOidcConfig();

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

    const client = await this.getClient();
    const config = await this.getConfig();

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

  private getOidcConfig(): OidcConfig {
    const oidc = this.configService.get<OidcConfig>('oidc');
    if (!oidc?.enabled) {
      throw new ServiceUnavailableException('Single sign-on is not configured');
    }
    return oidc;
  }

  private getClient(): Promise<typeof OidcClient> {
    if (!this.clientPromise) {
      this.clientPromise = importOidcClient('openid-client');
    }
    return this.clientPromise;
  }

  private getConfig(): Promise<OidcClient.Configuration> {
    if (!this.configPromise) {
      const { issuer, clientId, clientSecret } = this.getOidcConfig();
      this.configPromise = this.getClient().then((client) =>
        client.discovery(new URL(issuer), clientId, clientSecret),
      );
    }
    return this.configPromise;
  }
}
