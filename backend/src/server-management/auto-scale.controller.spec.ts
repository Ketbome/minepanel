import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AutoScaleController } from './auto-scale.controller';
import { ServerManagementService } from './server-management.service';
import { ProxyService } from '../proxy/proxy.service';

const TOKEN = 'super-secret-token';
const AUTH = `Bearer ${TOKEN}`;

describe('AutoScaleController', () => {
  let controller: AutoScaleController;
  let serverService: jest.Mocked<ServerManagementService>;
  let proxyService: jest.Mocked<ProxyService>;
  let token: string | undefined;

  beforeEach(async () => {
    token = TOKEN;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AutoScaleController],
      providers: [
        { provide: ConfigService, useValue: { get: jest.fn(() => token) } },
        {
          provide: ServerManagementService,
          useValue: { getServerStatus: jest.fn(), startServer: jest.fn(), stopServer: jest.fn() },
        },
        { provide: ProxyService, useValue: { getAllMappings: jest.fn() } },
      ],
    }).compile();

    controller = module.get(AutoScaleController);
    serverService = module.get(ServerManagementService);
    proxyService = module.get(ProxyService);

    proxyService.getAllMappings.mockResolvedValue([{ host: 'survival.mc.example.com', backend: 'survival:25565' }]);
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
});
