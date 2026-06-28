import { execSync } from 'node:child_process';
import { dirname } from 'node:path';
import * as os from 'node:os';

// The generated server compose files and the chown helper run against the host Docker
// daemon, so their volume paths must be host paths. BASE_DIR is the host path that maps to
// /app. Instead of trusting the env var, ask Docker for the real source of the /app/servers
// bind and derive BASE_DIR from it, so a misconfigured BASE_DIR can't send servers to the
// wrong host folder. Falls back to the env var (e.g. local dev outside Docker).
function detectHostBaseDir(): string | undefined {
  try {
    const containerId = process.env.HOSTNAME || os.hostname();
    const source = execSync(`docker inspect ${containerId} --format '{{range .Mounts}}{{if eq .Destination "/app/servers"}}{{.Source}}{{end}}{{end}}'`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    }).trim();
    if (source) {
      const detected = dirname(source);
      if (process.env.BASE_DIR && process.env.BASE_DIR !== detected) {
        console.warn(`[config] BASE_DIR is "${process.env.BASE_DIR}" but the /app/servers mount resolves to host "${detected}". Using the detected path.`);
      }
      return detected;
    }
  } catch {
    // Docker unavailable (e.g. local dev) -> fall back to BASE_DIR env.
  }
  return undefined;
}

export default () => ({
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2d',
  jwtIssuer: process.env.JWT_ISSUER || 'minepanel',
  jwtAudience: process.env.JWT_AUDIENCE || 'minepanel-users',
  frontendUrl: process.env.FRONTEND_URL,
  composeProject: process.env.COMPOSE_PROJECT,
  defaultLanguage: process.env.DEFAULT_LANGUAGE ?? 'en',
  passwordResetTokenExpiresInMinutes: Number(process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES || 60),
  oidc: {
    issuer: process.env.OIDC_ISSUER,
    clientId: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    redirectUri: process.env.OIDC_REDIRECT_URI,
    scopes: process.env.OIDC_SCOPES || 'openid email profile',
    providerName: process.env.OIDC_PROVIDER_NAME || 'SSO',
    disablePasswordLogin: process.env.OIDC_DISABLE_PASSWORD_LOGIN === 'true',
    enabled: !!(
      process.env.OIDC_ISSUER &&
      process.env.OIDC_CLIENT_ID &&
      process.env.OIDC_CLIENT_SECRET &&
      process.env.OIDC_REDIRECT_URI
    ),
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  },
  serversDir: '/app/servers',
  baseDir: detectHostBaseDir() || process.env.BASE_DIR || '/app',
  backupBaseDir: process.env.BACKUP_BASE_DIR || undefined,
  database: {
    path: '/app/data/minepanel.db',
  },
});
