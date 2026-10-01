import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FilesService } from './files.service';
import * as fs from 'fs-extra';

jest.mock('fs-extra', () => ({
  ensureDirSync: jest.fn(),
  emptyDirSync: jest.fn(),
  pathExists: jest.fn(),
  stat: jest.fn(),
  readdir: jest.fn(),
  readFile: jest.fn(),
  realpath: jest.fn(async (target: string) => target),
}));

jest.mock('src/common/fs/contained-path', () => ({ assertContained: jest.fn().mockResolvedValue(undefined) }));

describe('FilesService', () => {
  let service: FilesService;
  const SERVERS_DIR = '/app/servers';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: ConfigService, useValue: { get: () => SERVERS_DIR } },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
  });

  describe('getFullPath', () => {
    it('should map "_root" to the servers directory', async () => {
      expect(await service.getFullPath('_root', 'a/b')).toBe(`${SERVERS_DIR}/a/b`);
    });

    it('should map ".world" to the global world library', async () => {
      expect(await service.getFullPath('.world', 'level')).toBe(`${SERVERS_DIR}/.world/worlds/level`);
    });

    it('should map a normal server id to its mc-data directory', async () => {
      expect(await service.getFullPath('srv', 'config/server.properties')).toBe(
        `${SERVERS_DIR}/srv/mc-data/config/server.properties`,
      );
    });

    it('should return the base path when filePath is empty', async () => {
      expect(await service.getFullPath('srv', '')).toBe(`${SERVERS_DIR}/srv/mc-data`);
    });

    it('should reject path traversal that escapes the base directory', async () => {
      await expect(service.getFullPath('srv', '../../../etc/passwd')).rejects.toThrow(BadRequestException);
    });

    it('should reject a server id that is not a plain folder name', async () => {
      for (const serverId of ['../outside', '../../tmp/x', 'a/b', '..', '']) {
        await expect(service.getFullPath(serverId, 'file.txt')).rejects.toThrow(BadRequestException);
      }
    });

    it('should reject paths that escape into a sibling of the base directory', async () => {
      await expect(service.getFullPath('_root', '../servers-evil/secret.txt')).rejects.toThrow(BadRequestException);
      await expect(service.getFullPath('.world', '../worlds-old')).rejects.toThrow(BadRequestException);
    });
  });

  describe('listFiles', () => {
    it('should throw NotFoundException when the directory does not exist', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(false);

      await expect(service.listFiles('srv', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('should sort directories first, then files by name', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
      (fs.stat as unknown as jest.Mock).mockImplementation((p: string) =>
        Promise.resolve({
          isDirectory: () => p === `${SERVERS_DIR}/srv/mc-data`,
          size: 10,
          mtime: new Date(),
        }),
      );
      (fs.readdir as unknown as jest.Mock).mockResolvedValue([
        { name: 'b.txt', isDirectory: () => false },
        { name: 'a-dir', isDirectory: () => true },
        { name: 'a.txt', isDirectory: () => false },
      ]);

      const result = await service.listFiles('srv', '');

      expect(result.map((f) => f.name)).toEqual(['a-dir', 'a.txt', 'b.txt']);
    });

    it('hides server.json and the compose file from non-admins in the global browser', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
      (fs.stat as unknown as jest.Mock).mockResolvedValue({ isDirectory: () => true, size: 1, mtime: new Date() });
      (fs.readdir as unknown as jest.Mock).mockResolvedValue([
        { name: 'server.json', isDirectory: () => false },
        { name: 'docker-compose.yml', isDirectory: () => false },
        { name: 'mc-data', isDirectory: () => true },
      ]);

      expect((await service.listFiles('_root', 'srv')).map((f) => f.name)).toEqual(['mc-data']);
      expect(await service.listFiles('_root', 'srv', true)).toHaveLength(3);
    });
  });

  describe('admin-only files', () => {
    it('lets only admins read server.json and the compose file through _root, links included', async () => {
      await expect(service.getFullPath('_root', 'srv/server.json')).rejects.toThrow(ForbiddenException);
      await expect(service.getFullPath('_root', 'srv/docker-compose.yml')).rejects.toThrow(ForbiddenException);
      expect(await service.getFullPath('_root', 'srv/server.json', true)).toBe(`${SERVERS_DIR}/srv/server.json`);
      expect(await service.getFullPath('_root', 'srv/mc-data/server.json')).toBe(`${SERVERS_DIR}/srv/mc-data/server.json`);

      (fs.realpath as unknown as jest.Mock).mockImplementation(async (target: string) => (target.endsWith('/link') ? `${SERVERS_DIR}/srv/server.json` : target));
      await expect(service.getFullPath('_root', 'srv/mc-data/link')).rejects.toThrow(ForbiddenException);
    });

    // Another user's half-received upload is readable content: .part is the file so far and
    // .json names the owner and the target path.
    it.each(['.upload-sessions', '.uploads'])('keeps %s out of reach of non-admins, links included', async (dir) => {
      await expect(service.getFullPath('_root', dir)).rejects.toThrow(ForbiddenException);
      await expect(service.getFullPath('_root', `${dir}/0a1b2c.part`)).rejects.toThrow(ForbiddenException);
      await expect(service.getFullPath('_root', `${dir}/0a1b2c.json`)).rejects.toThrow(ForbiddenException);
      await expect(service.readFile('_root', `${dir}/0a1b2c.part`)).rejects.toThrow(ForbiddenException);
      expect(await service.getFullPath('_root', `${dir}/0a1b2c.part`, true)).toBe(`${SERVERS_DIR}/${dir}/0a1b2c.part`);

      // A link planted in mc-data that points into the staging folder.
      (fs.realpath as unknown as jest.Mock).mockImplementation(async (target: string) => (target.endsWith('/staging-link') ? `${SERVERS_DIR}/${dir}/0a1b2c.part` : target));
      await expect(service.getFullPath('_root', 'srv/mc-data/staging-link')).rejects.toThrow(ForbiddenException);
      (fs.realpath as unknown as jest.Mock).mockImplementation(async (target: string) => target);
    });

    it('does not list the staging folders to non-admins', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
      (fs.stat as unknown as jest.Mock).mockResolvedValue({ isDirectory: () => true, size: 0, mtime: new Date() });
      (fs.readdir as unknown as jest.Mock).mockResolvedValue(['.upload-sessions', '.uploads', '.world', 'srv'].map((name) => ({ name, isDirectory: () => true })));

      expect((await service.listFiles('_root', '')).map((f) => f.name)).toEqual(['.world', 'srv']);
      expect((await service.listFiles('_root', '', true)).map((f) => f.name)).toEqual(['.upload-sessions', '.uploads', '.world', 'srv']);
    });
  });

  describe('readFile', () => {
    it('should throw BadRequestException when the path is a directory', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
      (fs.stat as unknown as jest.Mock).mockResolvedValue({ isDirectory: () => true, size: 0 });

      await expect(service.readFile('srv', 'folder')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when the file is larger than 5MB', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
      (fs.stat as unknown as jest.Mock).mockResolvedValue({ isDirectory: () => false, size: 6 * 1024 * 1024 });

      await expect(service.readFile('srv', 'big.log')).rejects.toThrow(BadRequestException);
    });

    it('should return the file content for a readable text file', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
      (fs.stat as unknown as jest.Mock).mockResolvedValue({ isDirectory: () => false, size: 12 });
      (fs.readFile as unknown as jest.Mock).mockResolvedValue('hello world');

      const result = await service.readFile('srv', 'note.txt');

      expect(result).toEqual({ content: 'hello world', encoding: 'utf-8' });
    });
  });
});
