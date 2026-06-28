import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FilesService } from './files.service';
import * as fs from 'fs-extra';

jest.mock('fs-extra', () => ({
  ensureDirSync: jest.fn(),
  pathExists: jest.fn(),
  stat: jest.fn(),
  readdir: jest.fn(),
  readFile: jest.fn(),
}));

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
    it('should map "_root" to the servers directory', () => {
      expect(service.getFullPath('_root', 'a/b')).toBe(`${SERVERS_DIR}/a/b`);
    });

    it('should map ".world" to the global world library', () => {
      expect(service.getFullPath('.world', 'level')).toBe(`${SERVERS_DIR}/.world/worlds/level`);
    });

    it('should map a normal server id to its mc-data directory', () => {
      expect(service.getFullPath('srv', 'config/server.properties')).toBe(
        `${SERVERS_DIR}/srv/mc-data/config/server.properties`,
      );
    });

    it('should return the base path when filePath is empty', () => {
      expect(service.getFullPath('srv', '')).toBe(`${SERVERS_DIR}/srv/mc-data`);
    });

    it('should reject path traversal that escapes the base directory', () => {
      expect(() => service.getFullPath('srv', '../../../etc/passwd')).toThrow(BadRequestException);
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
