import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;

  beforeEach(async () => {
    const mockAuthService = {
      validateUser: jest.fn(),
      generateJwt: jest.fn(),
      generateHash: jest.fn(),
      validateRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
    };

    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    mockRequest = {
      cookies: {},
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
    it('should return username and expires_in and set cookies on successful login', async () => {
      const mockPayload = { userId: 1, username: 'admin', role: 'ADMIN' };

      authService.validateUser.mockResolvedValue(mockPayload);
      authService.generateJwt.mockResolvedValue({
        access_token: 'jwt.access.token',
        refresh_token: 'jwt.refresh.token',
        username: 'admin',
        expires_in: 900,
      });

      const result = await controller.login(
        { username: 'admin', password: 'password' },
        mockResponse as Response,
      );

      expect(result).toEqual({
        username: 'admin',
        expires_in: 900,
      });
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.cookie).toHaveBeenCalledWith('access_token', 'jwt.access.token', expect.any(Object));
      expect(mockResponse.cookie).toHaveBeenCalledWith('refresh_token', 'jwt.refresh.token', expect.any(Object));
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        controller.login({ username: 'admin', password: 'wrong' }, mockResponse as Response)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should return new tokens when refresh token is valid', async () => {
      const mockPayload = { userId: 1, username: 'admin', role: 'ADMIN' };
      mockRequest.cookies = { refresh_token: 'valid.refresh.token' };

      authService.validateRefreshToken.mockResolvedValue(mockPayload);
      authService.generateJwt.mockResolvedValue({
        access_token: 'new.access.token',
        refresh_token: 'new.refresh.token',
        username: 'admin',
        expires_in: 900,
      });

      const result = await controller.refresh(mockRequest as Request, mockResponse as Response);

      expect(result).toEqual({
        username: 'admin',
        expires_in: 900,
      });
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
    });

    it('should throw UnauthorizedException when refresh token is missing', async () => {
      mockRequest.cookies = {};

      await expect(
        controller.refresh(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should clear cookies and throw when refresh token is invalid', async () => {
      mockRequest.cookies = { refresh_token: 'invalid.token' };
      authService.validateRefreshToken.mockResolvedValue(null);

      await expect(
        controller.refresh(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(UnauthorizedException);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('logout', () => {
    it('should clear cookies and revoke token', async () => {
      mockRequest.cookies = { refresh_token: 'token.to.revoke' };
      authService.revokeRefreshToken.mockResolvedValue(undefined);

      const result = await controller.logout(mockRequest as Request, mockResponse as Response);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(authService.revokeRefreshToken).toHaveBeenCalledWith('token.to.revoke');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token');
    });

    it('should still clear cookies even when no refresh token present', async () => {
      mockRequest.cookies = {};

      const result = await controller.logout(mockRequest as Request, mockResponse as Response);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(authService.revokeRefreshToken).not.toHaveBeenCalled();
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token');
    });
  });
});

