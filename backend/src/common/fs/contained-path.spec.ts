import * as fs from 'fs-extra';
import os from 'node:os';
import * as path from 'path';
import { assertContained, isInside } from './contained-path';

describe('assertContained', () => {
  let tmp: string;
  let root: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'contained-'));
    root = path.join(tmp, 'srv', 'mc-data');
    await fs.ensureDir(path.join(root, 'plugins'));
    await fs.outputFile(path.join(tmp, 'secret.db'), 'x');
  });

  afterEach(() => fs.remove(tmp));

  it('accepts regular and missing paths inside the root', async () => {
    await expect(assertContained(root, path.join(root, 'plugins'))).resolves.toBeUndefined();
    await expect(assertContained(root, path.join(root, 'new', 'dir', 'file.txt'))).resolves.toBeUndefined();
  });

  it('accepts links that resolve inside the root', async () => {
    await fs.symlink(path.join(root, 'plugins'), path.join(root, 'alias'));
    await expect(assertContained(root, path.join(root, 'alias', 'a.jar'))).resolves.toBeUndefined();
  });

  it('rejects links that leave the root, directly or through a parent', async () => {
    await fs.symlink(path.join(tmp, 'secret.db'), path.join(root, 'db'));
    await fs.symlink(tmp, path.join(root, 'up'));
    await expect(assertContained(root, path.join(root, 'db'))).rejects.toThrow('Invalid path');
    await expect(assertContained(root, path.join(root, 'up', 'secret.db'))).rejects.toThrow('Invalid path');
    await expect(assertContained(root, path.join(root, 'up', 'missing', 'file'))).rejects.toThrow('Invalid path');
  });

  it('rejects dangling links, whose target would be created on write', async () => {
    await fs.symlink(path.join(tmp, 'nowhere'), path.join(root, 'dangling'));
    await expect(assertContained(root, path.join(root, 'dangling'))).rejects.toThrow('Invalid path');
  });

  it('works when the root does not exist yet', async () => {
    const fresh = path.join(tmp, 'other', 'mc-data');
    await expect(assertContained(fresh, path.join(fresh, 'a'))).resolves.toBeUndefined();
  });

  it('isInside keeps sibling prefixes out', () => {
    expect(isInside('/a/b', '/a/b')).toBe(true);
    expect(isInside('/a/b', '/a/b/c')).toBe(true);
    expect(isInside('/a/b', '/a/bc')).toBe(false);
  });
});
