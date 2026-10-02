import { readFileSync } from 'fs';
import { join } from 'path';
import { isVelocityBackend } from './velocity-backend';

describe('isVelocityBackend', () => {
  const java = (serverType: string, minecraftVersion?: string) => ({ edition: 'JAVA', serverType, minecraftVersion }) as any;

  it('accepts Paper-family servers on 1.19+, the latest and year-based versions', () => {
    for (const type of ['PAPER', 'PURPUR', 'LEAF', 'FOLIA', 'PUFFERFISH']) {
      expect(isVelocityBackend(java(type, '1.21.4'))).toBe(true);
    }
    expect(isVelocityBackend(java('PAPER', '1.19'))).toBe(true);
    expect(isVelocityBackend(java('PAPER', 'latest'))).toBe(true);
    expect(isVelocityBackend(java('PAPER', 'LATEST'))).toBe(true);
    expect(isVelocityBackend(java('PAPER', ''))).toBe(true);
    expect(isVelocityBackend(java('PAPER'))).toBe(true);
    expect(isVelocityBackend(java('PAPER', '26.1'))).toBe(true);
  });

  it('rejects older Paper, unknown versions, other types and Bedrock', () => {
    expect(isVelocityBackend(java('PAPER', '1.18.2'))).toBe(false);
    expect(isVelocityBackend(java('PAPER', 'SNAPSHOT'))).toBe(false);
    expect(isVelocityBackend(java('SPIGOT', '1.21'))).toBe(false);
    expect(isVelocityBackend(java('FABRIC', '1.21'))).toBe(false);
    expect(isVelocityBackend({ edition: 'BEDROCK', serverType: 'PAPER' } as any)).toBe(false);
  });
});

describe('velocity-backend.ts frontend copy', () => {
  it('is identical to the backend file', () => {
    const read = (relative: string) => readFileSync(join(__dirname, relative), 'utf8');

    expect(read('../../../frontend/src/lib/server-config/velocity-backend.ts')).toBe(read('velocity-backend.ts'));
  });
});
