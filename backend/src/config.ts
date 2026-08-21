import { execSync } from 'node:child_process';
import * as path from 'node:path';
import * as os from 'node:os';

export interface DockerMount {
  Type?: string;
  Name?: string;
  Source?: string;
  Destination?: string;
  Driver?: string;
}

// The generated server compose files and the chown helper run against the host Docker
// daemon, so their volume paths must be paths that daemon can resolve. Ask Docker where our
// own /app/servers and /app/data actually come from instead of trusting BASE_DIR, so a
// misconfigured env var cannot send servers to the wrong folder.
//
// Each mount's own Source is read verbatim, with no arithmetic on it. That is what makes
// named volumes work: there the source is /var/lib/docker/volumes/<name>/_data, which no
// amount of deriving from BASE_DIR would ever produce. It also keeps whatever path shape
// the platform reports (Docker Desktop rewrites binds to /host_mnt/... and /run/desktop/...)
// intact, since the daemon is the one resolving it back.
function readOwnMounts(): DockerMount[] {
  try {
    const containerId = process.env.HOSTNAME || os.hostname();
    const stdout = execSync(`docker inspect ${containerId} --format '{{json .Mounts}}'`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    }).trim();

    const parsed: unknown = JSON.parse(stdout || '[]');
    return Array.isArray(parsed) ? (parsed as DockerMount[]) : [];
  } catch {
    // Docker unavailable (e.g. local dev outside Docker) -> fall back to BASE_DIR.
    return [];
  }
}

// The deepest mount containing `containerPath`, so a single volume mounted at /app resolves
// just as well as separate /app/servers and /app/data mounts.
export function resolveHostPath(mounts: DockerMount[], containerPath: string): string | undefined {
  const containing = mounts
    .filter((mount) => {
      const destination = mount.Destination?.replace(/\/+$/, '');
      if (!destination) return false;
      return destination === containerPath || containerPath.startsWith(`${destination}/`);
    })
    .sort((a, b) => (b.Destination?.length ?? 0) - (a.Destination?.length ?? 0));

  const mount = containing[0];
  if (!mount?.Source) return undefined;

  // A non-local driver (NFS, CIFS, ...) reports a Source that is not necessarily where the
  // data lives, and bind-mounting it would hand the container an empty directory. Say so
  // rather than generating paths that look right and are not.
  if (mount.Type === 'volume' && mount.Driver && mount.Driver !== 'local') {
    console.warn(
      `[config] ${containerPath} comes from volume "${mount.Name}" on the "${mount.Driver}" driver, whose host path cannot be derived. ` +
        'Generated compose files will fall back to BASE_DIR, which is very likely wrong: use a bind mount or the local driver.',
    );
    return undefined;
  }

  const remainder = containerPath.slice(mount.Destination!.replace(/\/+$/, '').length);
  return path.join(mount.Source, remainder);
}

function detectHostDir(mounts: DockerMount[], containerPath: string, fallback: string): string {
  const detected = resolveHostPath(mounts, containerPath);
  if (!detected) {
    return fallback;
  }

  if (detected !== fallback) {
    console.warn(`[config] ${containerPath} resolves to host "${detected}", not "${fallback}". Using the detected path.`);
  }

  return detected;
}

const ownMounts = readOwnMounts();
const envBaseDir = process.env.BASE_DIR || '/app';

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
  serversHostDir: detectHostDir(ownMounts, '/app/servers', path.join(envBaseDir, 'servers')),
  dataHostDir: detectHostDir(ownMounts, '/app/data', path.join(envBaseDir, 'data')),
  backupBaseDir: process.env.BACKUP_BASE_DIR || undefined,
  database: {
    path: '/app/data/minepanel.db',
  },
});
