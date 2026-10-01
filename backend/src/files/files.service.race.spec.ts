import { ConflictException } from '@nestjs/common';
import os from 'node:os';
import * as fs from 'fs-extra';
import * as path from 'path';
import { FilesService } from './files.service';

// On a real filesystem: the mocked specs cannot show what happens between a check and
// the rename that follows it.
describe('FilesService.saveUpload without overwriting', () => {
  let root: string;
  let service: FilesService;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'files-race-'));
    service = new FilesService({ get: () => root } as any);
    await fs.ensureDir(path.join(root, 'srv', 'mc-data'));
  });

  afterEach(() => fs.remove(root));

  it('lets exactly one of several racing uploads take a name it must not replace', async () => {
    const staged = await Promise.all(
      Array.from({ length: 24 }, async (_, i) => {
        const file = path.join(root, '.uploads', `staged-${i}`);
        await fs.outputFile(file, `upload-${i}`);
        return file;
      }),
    );

    const results = await Promise.allSettled(staged.map((file) => service.saveUpload('srv', 'race.bin', file, false, false)));

    const winners = results.flatMap((result, index) => (result.status === 'fulfilled' ? [index] : []));
    expect(winners).toHaveLength(1);
    for (const result of results) {
      if (result.status === 'rejected') expect(result.reason).toBeInstanceOf(ConflictException);
    }
    // Nobody replaced the winner, and the losers' files are still theirs to clean up.
    expect(await fs.readFile(path.join(root, 'srv', 'mc-data', 'race.bin'), 'utf8')).toBe(`upload-${winners[0]}`);
    expect(await fs.pathExists(staged[winners[0]])).toBe(false);
    expect(await Promise.all(staged.filter((_, index) => index !== winners[0]).map((file) => fs.pathExists(file)))).toEqual(Array(23).fill(true));
  });

  it('still overwrites when told to', async () => {
    const target = path.join(root, 'srv', 'mc-data', 'a.txt');
    await fs.outputFile(target, 'old');
    const file = path.join(root, '.uploads', 'staged');
    await fs.outputFile(file, 'new');

    await service.saveUpload('srv', 'a.txt', file, false, true);
    expect(await fs.readFile(target, 'utf8')).toBe('new');
  });
});
