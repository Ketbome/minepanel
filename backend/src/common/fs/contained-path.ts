import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';

export const isInside = (root: string, target: string): boolean => target === root || target.startsWith(root + path.sep);

// Resolves every symlink along `target`. Missing trailing segments are kept as
// they are, since they cannot be links yet. A dangling link throws: writing
// through it would create its target wherever it points.
async function realPath(target: string): Promise<string> {
  let existing = target;
  while (!(await fs.lstat(existing).then(() => true, () => false))) {
    const parent = path.dirname(existing);
    if (parent === existing) break;
    existing = parent;
  }

  const real = await fs.realpath(existing);
  return path.join(real, path.relative(existing, target));
}

// Game containers write into mc-data and can plant symlinks there. The panel
// runs as root, so every path it follows on their behalf must stay inside
// `root` once links are resolved. Links that resolve inside `root` are fine.
export async function assertContained(root: string, target: string): Promise<void> {
  const [realRoot, realTarget] = await Promise.all([realPath(root), realPath(target).catch(() => null)]);
  if (!realTarget || !isInside(realRoot, realTarget)) {
    throw new BadRequestException('Invalid path');
  }
}
