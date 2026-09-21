import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService, UserResponse } from '../services/users.service';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, Role } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@ApiTags('Users & Profiles (Domain 6: F-USR)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @Roles(Role.ADM, Role.MGR, Role.ACC, Role.PAR)
  @ApiOperation({
    summary: 'Get Current User Profile (F-USR-01)',
    description: 'Returns authenticated identity profile. For role PAR, includes linked children.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'User profile retrieved successfully.' })
  public async getProfile(@Req() req: any): Promise<{
    success: boolean;
    data: UserResponse;
    metadata: { timestamp: string };
  }> {
    const userId = req.user.id;
    const data = await this.usersService.getUserById(userId);
    return {
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString() },
    };
  }

  @Get()
  @Roles(Role.ADM)
  @ApiOperation({
    summary: 'List Users with Role Filter & Pagination (F-USR-02 / SCR-ADM-01)',
    description: 'Admin retrieves user accounts filtered by fixed 4-role model (ADM, MGR, ACC, PAR).',
  })
  @ApiQuery({ name: 'role', enum: Role, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'pageSize', type: Number, required: false })
  public async findAll(
    @Query('role') role?: Role,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<{
    success: boolean;
    data: UserResponse[];
    pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
    metadata: { timestamp: string };
  }> {
    const result = await this.usersService.getAllUsers({ role, search, page, pageSize });
    const currentPage = page && page > 0 ? Number(page) : 1;
    const limit = pageSize && pageSize > 0 ? Number(pageSize) : 20;

    return {
      success: true,
      data: result.users,
      pagination: {
        page: currentPage,
        pageSize: limit,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
      metadata: { timestamp: new Date().toISOString() },
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADM)
  @ApiOperation({
    summary: 'Create User Account with Fixed Role (F-USR-02 / SCR-ADM-01)',
    description: 'Administrator provisions a staff or parent user with an immutable assigned role.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'User created successfully.' })
  public async create(
    @Body() dto: CreateUserDto,
  ): Promise<{ success: boolean; data: UserResponse; metadata: { timestamp: string } }> {
    const data = await this.usersService.createUser(dto);
    return {
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString() },
    };
  }

  @Patch(':id')
  @Roles(Role.ADM)
  @ApiOperation({
    summary: 'Update User Profile or Status (F-USR-02 / SCR-ADM-01)',
    description: 'Administrator updates name, phone, role, or active status (toggle account lock).',
  })
  public async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<{ success: boolean; data: UserResponse; metadata: { timestamp: string } }> {
    const data = await this.usersService.updateUser(id, dto);
    return {
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString() },
    };
  }

  @Delete(':id')
  @Roles(Role.ADM)
  @ApiOperation({
    summary: 'Delete User Account (F-USR-02 / SCR-ADM-01)',
    description: 'Administrator deletes a user account.',
  })
  public async delete(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string; metadata: { timestamp: string } }> {
    const result = await this.usersService.deleteUser(id);
    return {
      ...result,
      metadata: { timestamp: new Date().toISOString() },
    };
  }
}
