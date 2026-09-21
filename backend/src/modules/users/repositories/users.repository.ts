import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { Role } from '../../../common/decorators/roles.decorator';

export interface UserEntity {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phoneNumber?: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
  students?: any[];
}

@Injectable()
export class UsersRepository {
  private readonly logger = new Logger(UsersRepository.name);
  private users = new Map<string, UserEntity>();

  constructor(private readonly prisma: PrismaService) {
    this.seedDefaultUsers();
  }

  private seedDefaultUsers() {
    // Generate standard saltSync for fast deterministic startup
    const salt = bcrypt.genSaltSync(10);

    const defaultSeed: Omit<UserEntity, 'createdAt' | 'updatedAt'>[] = [
      {
        id: 'usr-adm-001',
        username: 'admin',
        email: 'admin@school.edu.vn',
        passwordHash: bcrypt.hashSync('admin123', salt),
        fullName: 'Nguyễn Văn Hiệu Trưởng',
        phoneNumber: '0901111222',
        role: Role.ADM,
        isActive: true,
        lastLoginAt: new Date(),
      },
      {
        id: 'usr-mgr-002',
        username: 'coordinator.lan',
        email: 'lan.tran@school.edu.vn',
        passwordHash: bcrypt.hashSync('mgr123', salt),
        fullName: 'Trần Thị Lan (Phụ trách Bán trú)',
        phoneNumber: '0912345678',
        role: Role.MGR,
        isActive: true,
        lastLoginAt: new Date(),
      },
      {
        id: 'usr-acc-003',
        username: 'accountant.hoa',
        email: 'hoa.le@school.edu.vn',
        passwordHash: bcrypt.hashSync('acc123', salt),
        fullName: 'Lê Thị Hoa (Kế toán)',
        phoneNumber: '0987654321',
        role: Role.ACC,
        isActive: true,
        lastLoginAt: new Date(),
      },
      {
        id: 'usr-par-004',
        username: 'parent.minh',
        email: 'minh.nguyen@gmail.com',
        passwordHash: bcrypt.hashSync('par123', salt),
        fullName: 'Nguyễn Văn Minh (Phụ huynh)',
        phoneNumber: '0933445566',
        role: Role.PAR,
        isActive: true,
        lastLoginAt: new Date(),
        students: [
          {
            studentId: 'hs-1052',
            studentCode: 'HS2026-042',
            fullName: 'Nguyễn Hoàng Nam',
            className: '2A',
            hasSevereAllergy: true,
          },
        ],
      },
    ];

    const now = new Date();
    for (const u of defaultSeed) {
      this.users.set(u.id, {
        ...u,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  public async findById(id: string): Promise<UserEntity | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: { students: { include: { student: true } } },
      });
      if (user) return user as unknown as UserEntity;
    } catch {
      // Prisma offline, fallback to memory
    }
    return this.users.get(id) || null;
  }

  public async findByUsernameOrEmail(identifier: string): Promise<UserEntity | null> {
    const trimmed = identifier.trim().toLowerCase();

    // 1. Try Prisma
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: trimmed }, { id: identifier }],
        },
      });
      if (user) return user as unknown as UserEntity;
    } catch {
      // Offline mode
    }

    // 2. In-Memory lookup
    for (const user of this.users.values()) {
      if (
        user.username.toLowerCase() === trimmed ||
        user.email.toLowerCase() === trimmed
      ) {
        return user;
      }
    }
    return null;
  }

  public async findByEmail(email: string): Promise<UserEntity | null> {
    return this.findByUsernameOrEmail(email);
  }

  public async findAll(filter?: { role?: Role; search?: string }): Promise<UserEntity[]> {
    let result = Array.from(this.users.values());

    if (filter?.role) {
      result = result.filter((u) => u.role === filter.role);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      );
    }

    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async create(data: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserEntity> {
    const id = `usr-${data.role.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const now = new Date();

    const newUser: UserEntity = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(id, newUser);

    // Sync to Prisma if available
    try {
      await this.prisma.user.create({
        data: {
          id: newUser.id,
          email: newUser.email,
          passwordHash: newUser.passwordHash,
          fullName: newUser.fullName,
          phoneNumber: newUser.phoneNumber,
          role: newUser.role as any,
          isActive: newUser.isActive,
        },
      });
    } catch {
      this.logger.debug('Prisma sync skipped for user creation (Offline mode).');
    }

    return newUser;
  }

  public async update(id: string, data: Partial<UserEntity>): Promise<UserEntity | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated: UserEntity = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    this.users.set(id, updated);

    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          fullName: updated.fullName,
          phoneNumber: updated.phoneNumber,
          role: updated.role as any,
          isActive: updated.isActive,
        },
      });
    } catch {
      // Offline mode
    }

    return updated;
  }

  public async delete(id: string): Promise<boolean> {
    const exists = this.users.has(id);
    this.users.delete(id);
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch {
      // Offline mode
    }
    return exists;
  }
}
