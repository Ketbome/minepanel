// Test comment

import { Injectable, OnModuleInit, OnModuleDestroy, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { Server } from 'ssh2';
import * as fs from 'fs-extra';
import * as path from 'path';
import { AuthService } from '../auth/auth.service';
import { ServerManagementService } from '../server-management/server-management.service';
import { SftpSession } from './sftp-session';

@Injectable()
export class SftpService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SftpService.name);
    private server: Server;
    private readonly port = 2022;
    private readonly hostKeyPath = 'host.key';

    constructor(
        private readonly configService: ConfigService,
        private readonly authService: AuthService,
        private readonly serverManagementService: ServerManagementService,
    ) { }

    async onModuleInit() {
        await this.startServer();
    }

    async onModuleDestroy() {
        if (this.server) {
            this.server.close();
        }
    }

    private async startServer() {
        const hostKey = await this.getHostKey();

        this.server = new Server({
            hostKeys: [hostKey],
        }, (client) => {
            let authenticatedUser: any = null;
            let targetServerId: string = null;

            client.on('authentication', async (ctx) => {
                if (ctx.method !== 'password') {
                    return ctx.reject(['password'] as any);
                }

                const username = ctx.username;
                const password = ctx.password;

                // Parse username.serverId
                const parts = username.split('.');
                if (parts.length < 2) {
                    // Try to handle case where username itself has dots? 
                    // Assume last part is serverId? Or first part is username?
                    // Let's assume standard format: username.serverId
                    // If username has dots, this is ambiguous.
                    // Constraint: serverIds usually don't have dots (docker names).
                    // Usernames might?
                    // Let's take last part as serverId.
                }

                // Implementation: User can properly login with username.userId
                // But better: use separator like ':' ? standard ssh uses user.
                // Let's assume last part is serverId.
                const serverId = parts.pop();
                const userPart = parts.join('.'); // Rejoin the rest

                if (!serverId || !userPart) {
                    return ctx.reject();
                }

                try {
                    // 1. Authenticate User
                    const user = await this.authService.validateUser(userPart, password);
                    if (!user) {
                        this.logger.warn(`SFTP Auth failed for ${userPart}: Invalid credentials`);
                        return ctx.reject();
                    }

                    // 2. Locate Server
                    const exists = await this.serverManagementService.serverExists(serverId);
                    if (!exists) {
                        this.logger.warn(`SFTP Auth failed: Server ${serverId} not found`);
                        return ctx.reject();
                    }

                    // 3. Check SFTP Config
                    const serverPath = this.serverManagementService.getMcDataPath(serverId);
                    const configPath = path.join(serverPath, '.sftp-config.json');

                    if (!await fs.pathExists(configPath)) {
                        this.logger.warn(`SFTP Auth failed: SFTP disabled for ${serverId}`);
                        return ctx.reject();
                    }

                    const config = await fs.readJson(configPath);
                    if (!config.enabled) {
                        return ctx.reject();
                    }

                    // 4. Verify Access
                    if (config.allowedUser !== user.username && user.role !== 'ADMIN') {
                        this.logger.warn(`SFTP Auth failed: User ${user.username} not allowed on ${serverId}`);
                        return ctx.reject();
                    }

                    authenticatedUser = user;
                    targetServerId = serverId;
                    ctx.accept();

                } catch (e) {
                    this.logger.error(`SFTP Auth Error: ${e.message}`);
                    ctx.reject();
                }
            });

            client.on('ready', () => {
                client.on('session', (accept, reject) => {
                    const session = accept();
                    session.on('sftp', (acceptSftp, rejectSftp) => {
                        const sftpStream = acceptSftp();
                        const serverPath = this.serverManagementService.getMcDataPath(targetServerId);
                        new SftpSession(targetServerId, serverPath, sftpStream);
                    });
                });
            });

            client.on('error', (err) => {
                this.logger.error(`SFTP Client Error: ${err.message}`);
            });
        });

        this.server.listen(this.port, '0.0.0.0', () => {
            this.logger.log(`SFTP Server listening on port ${this.port}`);
        });
    }

    private async getHostKey(): Promise<string> {
        if (await fs.pathExists(this.hostKeyPath)) {
            const keyContent = await fs.readFile(this.hostKeyPath, 'utf8');
            // Ensure no whitespace issues
            return keyContent;
        }

        this.logger.error(`CWD: ${process.cwd()}`);
        this.logger.error(`Files: ${(await fs.readdir('.')).join(', ')}`);

        throw new Error(`SFTP Host Key missing at ${this.hostKeyPath}. Please run 'ssh-keygen -f host.key -N "" -t rsa' in backend directory.`);
    }

    // --- Service Methods ---

    async getStatus(serverId: string, user: any) {
        const serverPath = this.serverManagementService.getMcDataPath(serverId);
        const configPath = path.join(serverPath, '.sftp-config.json');
        let enabled = false;

        if (await fs.pathExists(configPath)) {
            const config = await fs.readJson(configPath);
            enabled = !!config.enabled;
        }

        // Public IP
        const host = this.configService.get('PUBLIC_IP') || 'localhost';

        return {
            enabled,
            host,
            port: this.port,
            username: `${user.username}.${serverId}`,
        };
    }

    async enableSftp(serverId: string, user: any) {
        // Check if server exists
        if (!await this.serverManagementService.serverExists(serverId)) {
            throw new NotFoundException('Server not found');
        }

        const serverPath = this.serverManagementService.getMcDataPath(serverId);
        const configPath = path.join(serverPath, '.sftp-config.json');

        // Create or update config
        await fs.writeJson(configPath, {
            enabled: true,
            allowedUser: user.username, // Lock to enabler
            updatedAt: new Date()
        }, { spaces: 2 });

        return this.getStatus(serverId, user);
    }

    async disableSftp(serverId: string, user: any) {
        if (!await this.serverManagementService.serverExists(serverId)) {
            throw new NotFoundException('Server not found');
        }

        const serverPath = this.serverManagementService.getMcDataPath(serverId);
        const configPath = path.join(serverPath, '.sftp-config.json');

        if (await fs.pathExists(configPath)) {
            // Can only disable if allowed?
            // Let's allow overwriting for now
            await fs.writeJson(configPath, {
                enabled: false,
                allowedUser: user.username,
                updatedAt: new Date()
            });
        }

        return { enabled: false };
    }
}
