import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import { isInsideContainer, ownContainerIds } from './common/docker/own-container';

export interface DockerMount {
  Type?: string;
  Name?: string;
  Source?: string;
  Destination?: string;
  Driver?: string;
  // Not reported by `docker inspect .Mounts`: a volume mounted with a subpath still lists the
  // volume root as its Source, so readOwnMounts copies it in from .HostConfig.Mounts.
  Subpath?: string;
}

// The mount request that produced a .Mounts entry, matched back to it by Target.
interface MountSpec {
  Target?: string;
  VolumeOptions?: { Subpath?: string };
}

// The generated server compose files and the chown helper run against the host Docker
// daemon, so their volume paths must be paths that daemon can resolve. Ask Docker where our
// own /app/servers and /app/data actually come from instead of trusting BASE_DIR, so a
// misconfigured env var cannot send servers to the wrong folder.
//
// Each mount's own Source is what gets read, with no arithmetic beyond the subpath the
// daemon itself applied. That is what makes named volumes work: there the source is
// /var/lib/docker/volumes/<name>/_data, which no amount of deriving from BASE_DIR would
// ever produce. It also keeps whatever path shape the platform reports (Docker Desktop
// rewrites binds to /host_mnt/... and /run/desktop/...) intact, since the daemon is the
// one resolving it back.
function inspectMounts(containerId: string): string {
  // execFileSync, not execSync: HOSTNAME is whatever the container spec says, and there is
  // no reason to hand it to a shell to reinterpret.
  // .Mounts says what is mounted where; .HostConfig.Mounts is the request that produced it
  // and the only place a volume subpath survives.
  return execFileSync(
    'docker',
    ['inspect', containerId, '--format', '{"mounts":{{json .Mounts}},"spec":{{json .HostConfig.Mounts}}}'],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15000,
    },
  ).trim();
}

function parseMounts(stdout: string): DockerMount[] {
  const parsed = JSON.parse(stdout || '{}') as { mounts?: unknown; spec?: unknown };
  const mounts = Array.isArray(parsed.mounts) ? (parsed.mounts as DockerMount[]) : [];
  const spec = Array.isArray(parsed.spec) ? (parsed.spec as MountSpec[]) : [];

  return mounts.map((mount) => {
    const subpath = spec.find((entry) => entry.Target === mount.Destination)?.VolumeOptions?.Subpath;
    return subpath ? { ...mount, Subpath: subpath } : mount;
  });
}

function describeFailure(error: unknown): string {
  const failure = error as { stderr?: string; message?: string };
  return (failure.stderr?.trim() || failure.message || String(error)).split('\n')[0];
}

// The daemon can be slow to answer right after an update, while it is still extracting
// images, and the answer is fixed for the life of the process, so a timeout is worth a
// second try. "No such object" is not: that id is simply not ours.
function isTransient(error: unknown): boolean {
  const failure = error as { code?: string; signal?: string };
  return failure.code === 'ETIMEDOUT' || failure.signal === 'SIGTERM';
}

function pause(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// `[]` means the panel is not running in a container, where BASE_DIR is the right answer.
// `undefined` means it is, but could not find out what is mounted where: every host path
// derived from here is then a guess, and the callers must treat it as one.
export function readOwnMounts(
  ids: string[],
  inContainer: boolean,
  inspect: (containerId: string) => string = inspectMounts,
  attempts = 3,
  retryDelayMs = 2000,
): DockerMount[] | undefined {
  const failures: string[] = [];

  for (const id of ids) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return parseMounts(inspect(id));
      } catch (error) {
        failures.push(`${id}: ${describeFailure(error)}`);
        if (!isTransient(error) || attempt === attempts) break;
        pause(retryDelayMs);
      }
    }
  }

  if (!inContainer) return [];

  console.warn(
    `[config] could not inspect the panel's own container to find its mounts (${failures.join('; ') || 'no container id known'}). ` +
      'Host paths cannot be derived, so servers and mc-router will refuse to start until the panel is restarted with a working `docker inspect`.',
  );
  return undefined;
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

  // With a subpath the container sees <Source>/<Subpath> at the destination, while Source
  // alone points at the volume root. Handing the daemon that root makes it create the
  // directory the compose file asks for, empty, next to the real data.
  const source = mount.Subpath ? path.join(mount.Source, mount.Subpath) : mount.Source;
  const remainder = containerPath.slice(mount.Destination!.replace(/\/+$/, '').length);
  return path.join(source, remainder);
}

// Container paths we are running in Docker but could not resolve to a host path. The
// fallback used for these is a guess, so anything about to write a bind mount with one
// should refuse rather than hand the daemon a path that does not exist.
const unresolvedHostPaths: string[] = [];

function detectHostDir(mounts: DockerMount[] | undefined, containerPath: string, fallback: string): string {
  if (!mounts) {
    unresolvedHostPaths.push(containerPath);
    console.warn(`[config] the host path of ${containerPath} is unknown. Falling back to "${fallback}", which is a path inside this container, not on the host.`);
    return fallback;
  }

  const detected = resolveHostPath(mounts, containerPath);
  if (!detected) {
    // No mounts at all means we are not in a container (local dev), where BASE_DIR is a
    // real host path and the right answer. Having mounts but not this one is a
    // misconfiguration: the fallback is a path inside this container.
    if (mounts.length > 0) {
      unresolvedHostPaths.push(containerPath);
      console.warn(
        `[config] nothing is mounted at ${containerPath}, so its host path is unknown. Falling back to "${fallback}", ` +
          'which is almost certainly wrong on the host. Mount a directory or a named volume there.',
      );
    }
    return fallback;
  }

  if (detected !== fallback) {
    console.warn(`[config] ${containerPath} resolves to host "${detected}", not "${fallback}". Using the detected path.`);
  }

  return detected;
}

// Resolved once at import: the factory below can be called more than once, and detection
// shells out to `docker inspect` and warns on the way.
const ownMounts = readOwnMounts(ownContainerIds(), isInsideContainer());
const envBaseDir = process.env.BASE_DIR || '/app';
const serversHostDir = detectHostDir(ownMounts, '/app/servers', path.join(envBaseDir, 'servers'));
const dataHostDir = detectHostDir(ownMounts, '/app/data', path.join(envBaseDir, 'data'));

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
  serversHostDir,
  dataHostDir,
  unresolvedHostPaths,
  backupBaseDir: process.env.BACKUP_BASE_DIR || undefined,
  database: {
    path: '/app/data/minepanel.db',
  },
});
