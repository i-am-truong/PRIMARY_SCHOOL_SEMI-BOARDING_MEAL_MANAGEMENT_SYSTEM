import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'coordinator.lan', description: 'Username or Email' })
  @IsNotEmpty({ message: 'Tên đăng nhập hoặc email không được để trống' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'User password (min 6 characters)' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;
}
