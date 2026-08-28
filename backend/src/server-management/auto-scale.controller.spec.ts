import { Test, TestingModule } from '@nestjs/testing';
import { InstanceSettingsService } from '../settings/instance-settings.service';
import { NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AutoScaleController } from './auto-scale.controller';
import { ServerManagementService } from './server-management.service';
import { ProxyService } from '../proxy/proxy.service';
import { DockerComposeService } from '../docker-compose/docker-compose.service';

jest.mock('node:net', () => ({ connect: jest.fn() }));
import { connect } from 'node:net';
import { EventEmitter } from 'node:events';

const TOKEN = 'super-secret-token';
const AUTH = `Bearer ${TOKEN}`;

describe('AutoScaleController', () => {
  let controller: AutoScaleController;
  let serverService: jest.Mocked<ServerManagementService>;
  let proxyService: jest.Mocked<ProxyService>;
  let composeService: jest.Mocked<DockerComposeService>;
  let token: string | undefined;

  beforeEach(async () => {
    token = TOKEN;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AutoScaleController],
      providers: [
        { provide: InstanceSettingsService, useValue: { getAutoScaleToken: jest.fn(async () => token ?? null) } },
        {
          provide: ServerManagementService,
          useValue: { getServerStatus: jest.fn(), startServer: jest.fn(), stopServer: jest.fn() },
        },
        { provide: ProxyService, useValue: { getAllMappings: jest.fn() } },
        { provide: DockerComposeService, useValue: { getServerConfig: jest.fn() } },
      ],
    }).compile();

    controller = module.get(AutoScaleController);
    serverService = module.get(ServerManagementService);
    proxyService = module.get(ProxyService);
    composeService = module.get(DockerComposeService);

    proxyService.getAllMappings.mockResolvedValue([{ host: 'survival.mc.example.com', backend: 'survival:25565' }]);
    composeService.getServerConfig.mockResolvedValue({ id: 'survival' } as any);
  });

  it('rejects a wrong token', async () => {
    await expect(controller.autoScale('Bearer nope', { action: 'up', backend: 'survival:25565' })).rejects.toThrow(UnauthorizedException);
  });

  it('is disabled when no token is configured', async () => {
    token = undefined;
    await expect(controller.autoScale(AUTH, { action: 'up', backend: 'survival:25565' })).rejects.toThrow(NotFoundException);
  });

  it('rejects a backend that is not in routes.json', async () => {
    await expect(controller.autoScale(AUTH, { action: 'up', backend: 'unknown:25565' })).rejects.toThrow(NotFoundException);
  });

  it('does not restart a server that is already running', async () => {
    serverService.getServerStatus.mockResolvedValue('running');

    await expect(controller.autoScale(AUTH, { action: 'up', backend: 'survival:25565' })).resolves.toEqual({
      serverId: 'survival',
      status: 'running',
    });
    expect(serverService.startServer).not.toHaveBeenCalled();
  });

  it('stops the server on scale down', async () => {
    serverService.stopServer.mockResolvedValue(true);

    await expect(controller.autoScale(AUTH, { action: 'down', serverAddress: 'survival.mc.example.com' })).resolves.toEqual({
      serverId: 'survival',
      status: 'stopped',
    });
    expect(serverService.stopServer).toHaveBeenCalledWith('survival');
  });

  it('leaves a server alone when auto-scaling is disabled for it', async () => {
    composeService.getServerConfig.mockResolvedValue({ id: 'survival', useAutoScale: false } as any);

    await expect(controller.autoScale(AUTH, { action: 'down', backend: 'survival:25565' })).resolves.toEqual({
      serverId: 'survival',
      status: 'skipped',
    });
    expect(serverService.stopServer).not.toHaveBeenCalled();
  });

  it('refuses to wake a server that opted out of auto-scaling', async () => {
    composeService.getServerConfig.mockResolvedValue({ id: 'survival', useAutoScale: false } as any);

    await expect(controller.autoScale(AUTH, { action: 'up', backend: 'survival:25565' })).rejects.toThrow(ServiceUnavailableException);
    expect(serverService.startServer).not.toHaveBeenCalled();
  });

  it('keeps scaling servers without the opt-out label', async () => {
    composeService.getServerConfig.mockResolvedValue({ id: 'survival', useAutoScale: undefined } as any);
    serverService.stopServer.mockResolvedValue(true);

    await expect(controller.autoScale(AUTH, { action: 'down', backend: 'survival:25565' })).resolves.toEqual({
      serverId: 'survival',
      status: 'stopped',
    });
    expect(serverService.stopServer).toHaveBeenCalledWith('survival');
  });
  describe('scale up', () => {
    const stubSocket = (event: 'connect' | 'timeout' | 'error') => {
      (connect as jest.Mock).mockImplementation(() => {
        const socket = Object.assign(new EventEmitter(), { destroy: jest.fn() });
        process.nextTick(() => socket.emit(event));
        return socket;
      });
    };

    it('starts a stopped server and waits for its port', async () => {
      serverService.getServerStatus.mockResolvedValue('stopped');
      serverService.startServer.mockResolvedValue(true);
      stubSocket('connect');

      const result = await controller.autoScale(AUTH, { action: 'up', serverAddress: 'survival.mc.example.com' } as any);

      expect(result).toEqual({ serverId: 'survival', status: 'running' });
      expect(serverService.startServer).toHaveBeenCalledWith('survival');
      expect(connect).toHaveBeenCalledWith(expect.objectContaining({ host: 'survival', port: 25565 }));
    });

    it('fails when the server cannot be started', async () => {
      serverService.getServerStatus.mockResolvedValue('stopped');
      serverService.startServer.mockResolvedValue(false);
      await expect(controller.autoScale(AUTH, { action: 'up', backend: 'survival:25565' } as any)).rejects.toThrow(ServiceUnavailableException);
    });

    it('fails when the port never opens', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      try {
        serverService.getServerStatus.mockResolvedValue('stopped');
        serverService.startServer.mockResolvedValue(true);
        stubSocket('timeout');

        const pending = controller.autoScale(AUTH, { action: 'up', backend: 'survival:25565' } as any);
        const assertion = expect(pending).rejects.toThrow('still starting');
        await jest.advanceTimersByTimeAsync(160_000);
        await assertion;
      } finally {
        jest.useRealTimers();
      }
    });

    it('fails when the server cannot be stopped', async () => {
      serverService.stopServer.mockResolvedValue(false);
      await expect(controller.autoScale(AUTH, { action: 'down', backend: 'survival:25565' } as any)).rejects.toThrow('Failed to stop');
    });

    it('rejects a missing bearer prefix and falls back to the default port', async () => {
      await expect(controller.autoScale(TOKEN, { action: 'down', backend: 'survival:25565' } as any)).rejects.toThrow(UnauthorizedException);

      proxyService.getAllMappings.mockResolvedValue([{ host: 'h', backend: 'lobby:abc' }]);
      serverService.getServerStatus.mockResolvedValue('running');
      expect(await controller.autoScale(AUTH, { action: 'up', backend: 'lobby:abc' } as any)).toEqual({ serverId: 'lobby', status: 'running' });
    });
  });
});
