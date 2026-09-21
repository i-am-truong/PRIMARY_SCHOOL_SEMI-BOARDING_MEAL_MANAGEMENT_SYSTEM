import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository, UserEntity } from '../repositories/users.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { Role } from '../../../common/decorators/roles.decorator';

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  role: Role;
  roleName: string;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date | null;
  students?: any[];
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  public async getUserById(id: string): Promise<UserResponse> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với mã ${id}`);
    }
    return this.sanitizeUser(user);
  }

  public async getAllUsers(filter?: {
    role?: Role;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ users: UserResponse[]; total: number }> {
    const allUsers = await this.usersRepository.findAll({
      role: filter?.role,
      search: filter?.search,
    });

    const page = filter?.page && filter.page > 0 ? Number(filter.page) : 1;
    const pageSize = filter?.pageSize && filter.pageSize > 0 ? Number(filter.pageSize) : 20;
    const startIndex = (page - 1) * pageSize;

    const pagedUsers = allUsers.slice(startIndex, startIndex + pageSize);

    return {
      users: pagedUsers.map((u) => this.sanitizeUser(u)),
      total: allUsers.length,
    };
  }

  public async createUser(dto: CreateUserDto): Promise<UserResponse> {
    const existing = await this.usersRepository.findByUsernameOrEmail(dto.username);
    if (existing) {
      throw new ConflictException(`Tên đăng nhập "${dto.username}" đã được sử dụng.`);
    }

    const existingEmail = await this.usersRepository.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException(`Email "${dto.email}" đã được đăng ký.`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const newUser = await this.usersRepository.create({
      username: dto.username,
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      phoneNumber: dto.phoneNumber,
      role: dto.role,
      isActive: true,
      lastLoginAt: null,
    });

    return this.sanitizeUser(newUser);
  }

  public async updateUser(id: string, dto: UpdateUserDto): Promise<UserResponse> {
    const existing = await this.usersRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy người dùng với mã ${id}`);
    }

    const updated = await this.usersRepository.update(id, {
      fullName: dto.fullName,
      phoneNumber: dto.phoneNumber,
      role: dto.role,
      isActive: dto.isActive,
    });

    if (!updated) {
      throw new BadRequestException('Không thể cập nhật thông tin người dùng.');
    }

    return this.sanitizeUser(updated);
  }

  public async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.usersRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy người dùng với mã ${id}`);
    }

    // Safety: prevent deleting primary administrator
    if (existing.username === 'admin') {
      throw new BadRequestException('Không thể xóa tài khoản Quản trị viên gốc.');
    }

    await this.usersRepository.delete(id);
    return {
      success: true,
      message: `Đã xóa tài khoản "${existing.username}" thành công.`,
    };
  }

  private sanitizeUser(user: UserEntity): UserResponse {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      roleName: this.getRoleVietnameseName(user.role),
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      students: user.students,
    };
  }

  private getRoleVietnameseName(role: Role): string {
    switch (role) {
      case Role.ADM:
        return 'Quản trị viên / Hiệu trưởng';
      case Role.MGR:
        return 'Phụ trách Bán trú';
      case Role.ACC:
        return 'Kế toán Bán trú';
      case Role.PAR:
        return 'Phụ huynh Học sinh';
      default:
        return 'Người dùng';
    }
  }
}
