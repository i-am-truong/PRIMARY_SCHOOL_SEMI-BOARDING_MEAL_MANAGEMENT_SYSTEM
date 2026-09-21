import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService, AuthLoginResponse } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';

@ApiTags('Authentication (Domain 6: F-USR)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate User & Issue Access Token (F-USR-01 / SCR-AUTH-01)',
    description:
      'Validates credentials, checks active account status, and generates JWT containing fixed role (ADM, MGR, ACC, PAR).',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User authenticated successfully.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials or inactive account.',
  })
  public async login(
    @Body() dto: LoginDto,
  ): Promise<{ success: boolean; data: AuthLoginResponse; metadata: { timestamp: string } }> {
    const data = await this.authService.login(dto);
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
