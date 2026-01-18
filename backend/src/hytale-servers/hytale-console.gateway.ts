import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AttachConsoleStrategy, AttachSession } from '../shared/strategies/attach-console.strategy';
import { HytaleServersService } from './hytale-servers.service';

/**
 * WebSocket Gateway for Hytale server console
 * Provides real-time bidirectional communication with Hytale containers
 */
@WebSocketGateway({
  namespace: '/hytale-console',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class HytaleConsoleGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(HytaleConsoleGateway.name);
  private clientSessions: Map<string, { serverId: string; session: AttachSession | null }> =
    new Map();

  constructor(
    private readonly attachStrategy: AttachConsoleStrategy,
    private readonly hytaleService: HytaleServersService,
  ) {}

  /**
   * Handle new client connection
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.cleanupClientSession(client.id);
  }

  /**
   * Attach to a Hytale server console
   */
  @SubscribeMessage('attach')
  async handleAttach(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { serverId: string },
  ) {
    const { serverId } = data;

    if (!serverId) {
      client.emit('error', { message: 'Server ID required' });
      return;
    }

    // Check if server exists and is running
    const status = await this.hytaleService.getServerStatus(serverId);
    if (status !== 'running') {
      client.emit('error', { message: `Server is not running (status: ${status})` });
      return;
    }

    // Clean up any existing session for this client
    this.cleanupClientSession(client.id);

    this.logger.log(`Attaching client ${client.id} to server ${serverId}`);

    // Create attach session
    const session = this.attachStrategy.createAttachSession(
      serverId,
      // On output - send to client
      (output: string) => {
        client.emit('output', { data: output });
      },
      // On error
      (error: Error) => {
        client.emit('error', { message: error.message });
        this.cleanupClientSession(client.id);
      },
      // On close
      () => {
        client.emit('detached', { serverId });
        this.cleanupClientSession(client.id);
      },
    );

    if (!session) {
      client.emit('error', { message: 'Failed to attach to server' });
      return;
    }

    this.clientSessions.set(client.id, { serverId, session });

    // Send initial logs
    const logs = await this.hytaleService.getServerLogs(serverId, 50);
    client.emit('initial-logs', { logs: logs.logs });

    client.emit('attached', { serverId });
    this.logger.log(`Client ${client.id} attached to ${serverId}`);
  }

  /**
   * Detach from a server console
   */
  @SubscribeMessage('detach')
  handleDetach(@ConnectedSocket() client: Socket) {
    const sessionInfo = this.clientSessions.get(client.id);
    if (sessionInfo) {
      this.logger.log(`Detaching client ${client.id} from ${sessionInfo.serverId}`);
      this.cleanupClientSession(client.id);
      client.emit('detached', { serverId: sessionInfo.serverId });
    }
  }

  /**
   * Send input to the attached server
   */
  @SubscribeMessage('input')
  handleInput(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { input: string },
  ) {
    const sessionInfo = this.clientSessions.get(client.id);

    if (!sessionInfo?.session) {
      client.emit('error', { message: 'Not attached to any server' });
      return;
    }

    const { input } = data;
    if (typeof input !== 'string') {
      client.emit('error', { message: 'Invalid input' });
      return;
    }

    // Write to the attached process
    const success = this.attachStrategy.writeToSession(sessionInfo.serverId, input + '\n');

    if (!success) {
      client.emit('error', { message: 'Failed to send input' });
    }
  }

  /**
   * Get current server status
   */
  @SubscribeMessage('status')
  async handleStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { serverId: string },
  ) {
    const status = await this.hytaleService.getServerStatus(data.serverId);
    client.emit('status', { serverId: data.serverId, status });
  }

  /**
   * Request recent logs (non-streaming)
   */
  @SubscribeMessage('get-logs')
  async handleGetLogs(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { serverId: string; lines?: number },
  ) {
    const logs = await this.hytaleService.getServerLogs(data.serverId, data.lines || 100);
    client.emit('logs', {
      serverId: data.serverId,
      logs: logs.logs,
      hasErrors: logs.hasErrors,
    });
  }

  /**
   * Clean up session for a client
   */
  private cleanupClientSession(clientId: string) {
    const sessionInfo = this.clientSessions.get(clientId);
    if (sessionInfo?.session) {
      this.attachStrategy.destroySession(sessionInfo.serverId);
    }
    this.clientSessions.delete(clientId);
  }
}
