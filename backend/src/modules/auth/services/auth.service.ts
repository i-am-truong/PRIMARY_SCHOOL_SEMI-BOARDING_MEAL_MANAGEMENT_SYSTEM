import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersRepository, UserEntity } from '../../users/repositories/users.repository';
import { LoginDto } from '../dto/login.dto';
import { Role } from '../../../common/decorators/roles.decorator';

export interface AuthLoginResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    phone?: string | null;
    role: Role;
    roleName: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  public async login(dto: LoginDto): Promise<AuthLoginResponse> {
    const user = await this.usersRepository.findByUsernameOrEmail(dto.username);
    if (!user) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị tạm khóa. Vui lòng liên hệ Quản trị viên.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác.');
    }

    // Update lastLoginAt
    await this.usersRepository.update(user.id, { lastLoginAt: new Date() });

    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const accessToken = this.jwtService.sign(payload);
    const expiresIn = 28800; // 8 hours

    return {
      accessToken,
      expiresIn,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phone: user.phoneNumber,
        role: user.role,
        roleName: this.getRoleVietnameseName(user.role),
      },
    };
  }

  public async validateUserById(id: string): Promise<UserEntity | null> {
    const user = await this.usersRepository.findById(id);
    if (user && user.isActive) {
      return user;
    }
    return null;
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
