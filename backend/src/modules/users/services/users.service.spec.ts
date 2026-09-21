import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from '../repositories/users.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Role } from '../../../common/decorators/roles.decorator';

describe('UsersService (Domain 6: F-USR-02 - User Management)', () => {
  let usersService: UsersService;
  let usersRepository: UsersRepository;

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
    usersService = new UsersService(usersRepository);
  });

  it('should list all users and filter by Role', async () => {
    const allUsersResult = await usersService.getAllUsers();
    expect(allUsersResult.total).toBeGreaterThanOrEqual(4);

    const mgrUsersResult = await usersService.getAllUsers({ role: Role.MGR });
    expect(mgrUsersResult.users.length).toBeGreaterThan(0);
    expect(mgrUsersResult.users.every((u) => u.role === Role.MGR)).toBe(true);
  });

  it('should create a new user account with hashed password and sanitized response', async () => {
    const newUser = await usersService.createUser({
      username: 'teacher.anh',
      email: 'anh.le@school.edu.vn',
      password: 'SecurePass123!',
      fullName: 'Lê Tuấn Anh',
      phoneNumber: '0977112233',
      role: Role.MGR,
    });

    expect(newUser.id).toBeDefined();
    expect(newUser.username).toBe('teacher.anh');
    expect(newUser.role).toBe(Role.MGR);
    expect((newUser as any).passwordHash).toBeUndefined(); // Sensitive field must never be exposed
    expect(newUser.isActive).toBe(true);
  });

  it('should reject duplicate username with ConflictException', async () => {
    await expect(
      usersService.createUser({
        username: 'admin', // already exists
        email: 'unique.email@school.edu.vn',
        password: 'Password123!',
        fullName: 'Admin Hai',
        role: Role.ADM,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should reject duplicate email with ConflictException', async () => {
    await expect(
      usersService.createUser({
        username: 'unique.username',
        email: 'admin@school.edu.vn', // already exists
        password: 'Password123!',
        fullName: 'Admin Ba',
        role: Role.ADM,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should update user status and details', async () => {
    const user = await usersService.createUser({
      username: 'acc.test',
      email: 'acc.test@school.edu.vn',
      password: 'Password123!',
      fullName: 'Kế toán viên Test',
      role: Role.ACC,
    });

    const updated = await usersService.updateUser(user.id, {
      fullName: 'Kế toán trưởng Test',
      isActive: false, // Lock account
    });

    expect(updated.fullName).toBe('Kế toán trưởng Test');
    expect(updated.isActive).toBe(false);
  });

  it('should prevent deletion of primary administrator account', async () => {
    const adminUser = await usersRepository.findByUsernameOrEmail('admin');
    expect(adminUser).not.toBeNull();

    await expect(usersService.deleteUser(adminUser!.id)).rejects.toThrow(BadRequestException);
  });
});
