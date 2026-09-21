import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../common/decorators/roles.decorator';

export class CreateUserDto {
  @ApiProperty({ example: 'accountant.hoa', description: 'Unique username' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: 'hoa.le@school.edu.vn', description: 'Valid email address' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'Initial password' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Lê Thị Hoa', description: 'Full display name' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ example: '0987654321', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ enum: Role, example: Role.ACC, description: 'Assigned fixed role' })
  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;
}
