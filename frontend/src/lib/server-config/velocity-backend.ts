// Which servers can join the Velocity network: the ones that read modern forwarding
// from paper-global.yml, which replaced paper.yml in 1.19. Year-based versions
// (26.1, ...) are newer still.
// This file is duplicated byte-for-byte at backend/src/proxy/velocity-backend.ts and
// frontend/src/lib/server-config/velocity-backend.ts; velocity-backend.spec.ts fails if they drift.

export const VELOCITY_BACKEND_TYPES = ['PAPER', 'PURPUR', 'LEAF', 'FOLIA', 'PUFFERFISH'];

const hasPaperGlobalConfig = (version?: string): boolean => {
  const trimmed = version?.trim() ?? '';
  const match = /^(\d+)\.(\d+)/.exec(trimmed);
  if (!match) return !trimmed || trimmed.toLowerCase() === 'latest';
  return Number(match[1]) > 1 || Number(match[2]) >= 19;
};

export function isVelocityBackend(config: { edition?: string; serverType?: string; minecraftVersion?: string }): boolean {
  return (config.edition ?? 'JAVA') === 'JAVA' && VELOCITY_BACKEND_TYPES.includes(config.serverType ?? '') && hasPaperGlobalConfig(config.minecraftVersion);
}
