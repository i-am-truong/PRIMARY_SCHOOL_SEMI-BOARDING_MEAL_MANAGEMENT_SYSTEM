import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersRepository } from '../../users/repositories/users.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Role } from '../../../common/decorators/roles.decorator';

describe('AuthService (Domain 6: F-USR-01 - User Authentication)', () => {
  let authService: AuthService;
  let usersRepository: UsersRepository;
  let jwtService: JwtService;

  beforeEach(() => {
    const prismaMock = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    } as unknown as PrismaService;

    usersRepository = new UsersRepository(prismaMock);
    jwtService = new JwtService({ secret: 'testSecretKey', signOptions: { expiresIn: '1h' } });
    authService = new AuthService(usersRepository, jwtService);
  });

  it('should authenticate valid admin user and return JWT bearer payload', async () => {
    const response = await authService.login({
      username: 'admin',
      password: 'admin123',
    });

    expect(response.accessToken).toBeDefined();
    expect(response.tokenType).toBe('Bearer');
    expect(response.user.username).toBe('admin');
    expect(response.user.role).toBe(Role.ADM);
    expect(response.user.fullName).toContain('Nguyễn Văn Hiệu Trưởng');

    // Decode and verify token
    const decoded = jwtService.verify(response.accessToken, { secret: 'testSecretKey' });
    expect(decoded.sub).toBe(response.user.id);
    expect(decoded.role).toBe(Role.ADM);
  });

  it('should authenticate coordinator user (MGR) with valid credentials', async () => {
    const response = await authService.login({
      username: 'coordinator.lan',
      password: 'mgr123',
    });

    expect(response.accessToken).toBeDefined();
    expect(response.user.role).toBe(Role.MGR);
    expect(response.user.roleName).toBe('Phụ trách Bán trú');
  });

  it('should throw UnauthorizedException when password does not match', async () => {
    await expect(
      authService.login({
        username: 'admin',
        password: 'WrongPassword!',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when username does not exist', async () => {
    await expect(
      authService.login({
        username: 'unknown.user',
        password: 'Password123!',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when account is deactivated (isActive = false)', async () => {
    // Create inactive user
    const salt = bcrypt.genSaltSync(10);
    const inactiveUser = await usersRepository.create({
      username: 'locked.user',
      email: 'locked@school.edu.vn',
      passwordHash: bcrypt.hashSync('pass123', salt),
      fullName: 'Tài khoản bị khóa',
      role: Role.PAR,
      isActive: false,
    });

    await expect(
      authService.login({
        username: 'locked.user',
        password: 'pass123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
