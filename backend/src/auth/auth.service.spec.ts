import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/services/users.service';
import { PayloadToken } from './models/token.model';
import { RefreshToken } from './entities/refresh-token.entity';
import { Repository } from 'typeorm';

jest.mock('bcrypt');
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({ toString: () => 'mock-random-token' })),
}));

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: jest.Mocked<JwtService>;
  let usersService: jest.Mocked<UsersService>;
  let refreshTokenRepo: jest.Mocked<Repository<RefreshToken>>;

  const mockUser = {
    id: 1,
    username: 'testuser',
    password: 'hashedPassword123',
    role: 'USER',
    isActive: true,
  };

  beforeEach(async () => {
    const mockJwtService = {
      sign: jest.fn(),
    };

    const mockUsersService = {
      getUserByUsername: jest.fn(),
      getUserById: jest.fn(),
    };

    const mockRefreshTokenRepo = {
      save: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRefreshTokenRepo },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
    usersService = module.get(UsersService);
    refreshTokenRepo = module.get(getRepositoryToken(RefreshToken));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return payload when credentials are valid', async () => {
      usersService.getUserByUsername.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('testuser', 'password123');

      expect(result).toEqual({
        userId: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
      });
      expect(usersService.getUserByUsername).toHaveBeenCalledWith('testuser');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.password);
    });

    it('should return null when user is not found', async () => {
      usersService.getUserByUsername.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent', 'password');

      expect(result).toBeNull();
    });

    it('should return null when user is inactive', async () => {
      usersService.getUserByUsername.mockResolvedValue({ ...mockUser, isActive: false } as any);

      const result = await service.validateUser('testuser', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      usersService.getUserByUsername.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('testuser', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should return null and log error on exception', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      usersService.getUserByUsername.mockRejectedValue(new Error('DB error'));

      const result = await service.validateUser('testuser', 'password');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('generateJwt', () => {
    it('should return access token, refresh token, username and expires_in', async () => {
      const mockAccessToken = 'jwt.access.token';
      const mockHashedToken = 'hashed.refresh.token';
      
      jwtService.sign.mockReturnValue(mockAccessToken);
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedToken);
      refreshTokenRepo.save.mockResolvedValue({} as any);

      const payload: PayloadToken = {
        userId: 1,
        username: 'testuser',
        role: 'USER',
      };

      const result = await service.generateJwt(payload);

      expect(result).toEqual({
        access_token: mockAccessToken,
        refresh_token: 'mock-random-token',
        username: 'testuser',
        expires_in: 900,
      });
      expect(jwtService.sign).toHaveBeenCalledWith(payload);
      expect(refreshTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          token: mockHashedToken,
          revoked: false,
        })
      );
    });
  });

  describe('generateHash', () => {
    it('should hash password with bcrypt', async () => {
      const hashedPassword = 'hashed$password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await service.generateHash('mypassword');

      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 12);
    });
  });
});
