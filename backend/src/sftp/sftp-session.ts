
import { Logger } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Stream } from 'stream';

// Basic SFTP Protocol Constants
const OPEN_MODE = {
    READ: 0x01,
    WRITE: 0x02,
    APPEND: 0x04,
    CREATE: 0x08,
    TRUNCATE: 0x10,
    EXCL: 0x20,
};

const STATUS_CODE = {
    OK: 0,
    EOF: 1,
    NO_SUCH_FILE: 2,
    PERMISSION_DENIED: 3,
    FAILURE: 4,
    BAD_MESSAGE: 5,
    NO_CONNECTION: 6,
    CONNECTION_LOST: 7,
    OP_UNSUPPORTED: 8,
};

export class SftpSession {
    private readonly logger = new Logger(SftpSession.name);
    private handles: Map<string, { fd: number; path: string }> = new Map();
    private handleCounter = 0;

    constructor(
        private readonly serverId: string,
        private readonly rootPath: string,
        private readonly sftpStream: any, // SSH2 SFTP stream
    ) {
        this.setupHandlers();
    }

    private getHandleId(): string {
        return Buffer.from(String(++this.handleCounter)).toString('base64');
    }

    private resolvePath(reqPath: string): string {
        // Ensure path stays within rootPath
        const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
        const absolutePath = path.join(this.rootPath, safePath);

        // Security check: verify it's still inside rootPath
        if (!absolutePath.startsWith(this.rootPath)) {
            return this.rootPath;
        }
        return absolutePath;
    }

    private sendStatus(reqId: number, code: number, message: string = '') {
        return this.sftpStream.status(reqId, code, message);
    }

    private setupHandlers() {
        this.sftpStream.on('OPEN', async (reqid: number, filename: string, flags: number, attrs: any) => {
            try {
                const targetPath = this.resolvePath(filename);
                this.logger.log(`[${this.serverId}] OPEN ${filename}`);

                let fsFlags = 'r';
                if (flags & OPEN_MODE.WRITE) fsFlags = 'w';
                if (flags & OPEN_MODE.APPEND) fsFlags = 'a';
                if (flags & OPEN_MODE.READ && flags & OPEN_MODE.WRITE) fsFlags = 'r+';

                // Ensure directory exists for write
                if (fsFlags !== 'r') {
                    await fs.ensureDir(path.dirname(targetPath));
                }

                const fd = await fs.open(targetPath, fsFlags);
                const handle = this.getHandleId();
                this.handles.set(handle, { fd, path: targetPath });

                const handleBuffer = Buffer.from(handle);
                this.sftpStream.handle(reqid, handleBuffer);
            } catch (err) {
                this.logger.warn(`[${this.serverId}] OPEN ERROR ${filename}: ${err.message}`);
                this.sendStatus(reqid, STATUS_CODE.FAILURE, err.message);
            }
        });

        this.sftpStream.on('READ', async (reqid: number, handle: Buffer, offset: number, length: number) => {
            const handleId = handle.toString();
            const handleObj = this.handles.get(handleId);
            if (!handleObj) return this.sendStatus(reqid, STATUS_CODE.FAILURE, 'Invalid handle');

            try {
                const buffer = Buffer.alloc(length);
                const { bytesRead } = await fs.read(handleObj.fd, buffer, 0, length, offset);
                if (bytesRead === 0) {
                    return this.sendStatus(reqid, STATUS_CODE.EOF);
                }
                this.sftpStream.data(reqid, buffer.slice(0, bytesRead));
            } catch (err) {
                this.sendStatus(reqid, STATUS_CODE.FAILURE, err.message);
            }
        });

        this.sftpStream.on('WRITE', async (reqid: number, handle: Buffer, offset: number, data: Buffer) => {
            const handleId = handle.toString();
            const handleObj = this.handles.get(handleId);
            if (!handleObj) return this.sendStatus(reqid, STATUS_CODE.FAILURE, 'Invalid handle');

            try {
                await fs.write(handleObj.fd, data, 0, data.length, offset);
                this.sendStatus(reqid, STATUS_CODE.OK);
                this.logger.log(`[${this.serverId}] WRITE ${handleObj.path} offset=${offset} len=${data.length}`);
            } catch (err) {
                this.sendStatus(reqid, STATUS_CODE.FAILURE, err.message);
            }
        });

        this.sftpStream.on('CLOSE', async (reqid: number, handle: Buffer) => {
            const handleId = handle.toString();
            const handleObj = this.handles.get(handleId);
            if (!handleObj) return this.sendStatus(reqid, STATUS_CODE.FAILURE, 'Invalid handle');

            try {
                await fs.close(handleObj.fd);
                this.handles.delete(handleId);
                this.sendStatus(reqid, STATUS_CODE.OK);
                this.logger.log(`[${this.serverId}] CLOSE ${handleObj.path}`);
            } catch (err) {
                this.sendStatus(reqid, STATUS_CODE.FAILURE, err.message);
            }
        });

        this.sftpStream.on('STAT', async (reqid: number, filename: string) => {
            try {
                const targetPath = this.resolvePath(filename);
                const stats = await fs.stat(targetPath);
                this.sftpStream.attrs(reqid, this.statsToAttrs(stats));
            } catch (err) {
                this.sendStatus(reqid, STATUS_CODE.NO_SUCH_FILE, err.message);
            }
        });

        this.sftpStream.on('LSTAT', async (reqid: number, filename: string) => {
            try {
                const targetPath = this.resolvePath(filename);
                const stats = await fs.lstat(targetPath);
                this.sftpStream.attrs(reqid, this.statsToAttrs(stats));
            } catch (err) {
                this.sendStatus(reqid, STATUS_CODE.NO_SUCH_FILE, err.message);
            }
        });

        this.sftpStream.on('FSTAT', async (reqid: number, handle: Buffer) => {
            const handleId = handle.toString();
            const handleObj = this.handles.get(handleId);
            if (!handleObj) return this.sendStatus(reqid, STATUS_CODE.FAILURE, 'Invalid handle');

            try {
                const stats = await fs.fstat(handleObj.fd);
                this.sftpStream.attrs(reqid, this.statsToAttrs(stats));
            } catch (err) {
                this.sendStatus(reqid, STATUS_CODE.FAILURE, err.message);
            }
        });

        this.sftpStream.on('OPENDIR', async (reqid: number, pathName: string) => {
            try {
                const targetPath = this.resolvePath(pathName);
                // Verify path is directory
                const stats = await fs.stat(targetPath);
                if (!stats.isDirectory()) {
                    return this.sendStatus(reqid, STATUS_CODE.FAILURE, 'Not a directory');
                }

                // Just return a pseudo handle, we will read dir in READDIR
                // But usually we need to keep state of reading position. 
                // Simplified: store path and read all at once? No, large dirs fail.
                // Store iterator?
                const files = await fs.readdir(targetPath);
                const handle = this.getHandleId();
                // Store the full list in handle
                // @ts-ignore
                this.handles.set(handle, { path: targetPath, files: files, index: 0, isDir: true });

                const handleBuffer = Buffer.from(handle);
                this.sftpStream.handle(reqid, handleBuffer);
                this.logger.log(`[${this.serverId}] OPENDIR ${pathName}`);
            } catch (err) {
                this.sendStatus(reqid, STATUS_CODE.FAILURE, err.message);
            }
        });

        this.sftpStream.on('READDIR', async (reqid: number, handle: Buffer) => {
            const handleId = handle.toString();
            const handleObj: any = this.handles.get(handleId);
            if (!handleObj || !handleObj.isDir) return this.sendStatus(reqid, STATUS_CODE.FAILURE, 'Invalid handle');

            try {
                if (handleObj.index >= handleObj.files.length) {
                    return this.sendStatus(reqid, STATUS_CODE.EOF);
                }

                // Send batch of files?
                const filesToSend = handleObj.files.slice(handleObj.index);
                // Limit batch size? Maybe just send all if small enough.
                // SFTP usually sends one name per packet or small batch.
                // ssh2 docs say: just return array of objects.

                const responseList = [];
                for (const filename of filesToSend) {
                    const filePath = path.join(handleObj.path, filename);
                    try {
                        const stats = await fs.stat(filePath);
                        responseList.push({
                            filename: filename,
                            longname: this.formatLongname(filename, stats),
                            attrs: this.statsToAttrs(stats)
                        });
                    } catch (e) {
                        // ignore errors for specific files (maybe permissions)
                    }
                }

                handleObj.index = handleObj.files.length; // Mark all sent
                this.sftpStream.name(reqid, responseList);
            } catch (err) {
                this.sendStatus(reqid, STATUS_CODE.FAILURE, err.message);
            }
        });

        this.sftpStream.on('REMOVE', async (reqid: number, filename: string) => {
            try {
                const targetPath = this.resolvePath(filename);
                await fs.unlink(targetPath);
                this.sendStatus(reqid, STATUS_CODE.OK);
                this.logger.log(`[${this.serverId}] REMOVE ${filename}`);
            } catch (err) {
                this.sendStatus(reqid, STATUS_CODE.FAILURE, err.message);
            }
        });

        this.sftpStream.on('MKDIR', async (reqid: number, pathName: string, attrs: any) => {
            try {
                const targetPath = this.resolvePath(pathName);
                await fs.mkdir(targetPath);
                this.sendStatus(reqid, STATUS_CODE.OK);
                this.logger.log(`[${this.serverId}] MKDIR ${pathName}`);
            } catch (err) {
                this.sendStatus(reqid, STATUS_CODE.FAILURE, err.message);
            }
        });

        this.sftpStream.on('RMDIR', async (reqid: number, pathName: string) => {
            try {
                const targetPath = this.resolvePath(pathName);
                await fs.rmdir(targetPath);
                this.sendStatus(reqid, STATUS_CODE.OK);
                this.logger.log(`[${this.serverId}] RMDIR ${pathName}`);
            } catch (err) {
                this.sendStatus(reqid, STATUS_CODE.FAILURE, err.message);
            }
        });

        this.sftpStream.on('REALPATH', async (reqid: number, pathName: string) => {
            // Just normalize.
            // Client expects absolute path format (from root).
            let result = pathName;
            if (pathName === '.') result = '/';
            // We virtualize root as /.
            this.sftpStream.name(reqid, [{ filename: result, longname: result, attrs: {} }]);
        });

        this.sftpStream.on('RENAME', async (reqid: number, oldPath: string, newPath: string) => {
            try {
                const targetOld = this.resolvePath(oldPath);
                const targetNew = this.resolvePath(newPath);
                await fs.rename(targetOld, targetNew);
                this.sendStatus(reqid, STATUS_CODE.OK);
                this.logger.log(`[${this.serverId}] RENAME ${oldPath} -> ${newPath}`);
            } catch (err) {
                this.sendStatus(reqid, STATUS_CODE.FAILURE, err.message);
            }
        });
    }

    private statsToAttrs(stats: fs.Stats) {
        return {
            mode: stats.mode,
            uid: stats.uid || 0,
            gid: stats.gid || 0,
            size: stats.size,
            atime: stats.atime.getTime() / 1000,
            mtime: stats.mtime.getTime() / 1000,
        };
    }

    private formatLongname(filename: string, stats: fs.Stats): string {
        // Simplified implementation of 'ls -l' style string
        // Example: -rw-r--r-- 1 user group 1234 Jan 01 12:00 filename
        const date = stats.mtime.toDateString();
        return `${stats.isDirectory() ? 'd' : '-'}rwxrwxrwx 1 user group ${stats.size} ${date} ${filename}`;
    }
}
