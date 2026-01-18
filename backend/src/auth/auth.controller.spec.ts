import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockAuthService = {
      validateUser: jest.fn(),
      generateJwt: jest.fn(),
      generateHash: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return access token on successful login', async () => {
      const mockPayload = { userId: 1, username: 'admin', role: 'ADMIN' };

      authService.validateUser.mockResolvedValue(mockPayload);
      authService.generateJwt.mockResolvedValue({
        access_token: 'jwt.token.here',
        username: 'admin',
      });

      const result = await controller.login({ username: 'admin', password: 'password' });

      expect(result).toEqual({
        access_token: 'jwt.token.here',
        username: 'admin',
      });
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(controller.login({ username: 'admin', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
    });
  });
});
