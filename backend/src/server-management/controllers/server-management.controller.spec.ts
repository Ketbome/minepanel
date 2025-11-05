import { Test, TestingModule } from '@nestjs/testing';
import { ServerManagementController } from './server-management.controller';

describe('ServerManagementController', () => {
  let controller: ServerManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServerManagementController],
    }).compile();

    controller = module.get<ServerManagementController>(ServerManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
