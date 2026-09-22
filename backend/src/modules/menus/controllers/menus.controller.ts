import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Role, Roles } from '../../../common/decorators/roles.decorator';
import { MenusService, DailyMenuDto } from '../services/menus.service';
import { CreateDishDto, UpdateDishDto } from '../dto/dish.dto';
import { ApproveMenuDto, CreateMenuDto, RejectMenuDto, UpdateMenuDto } from '../dto/menu.dto';

@ApiTags('Menus & Dishes (Domain 2)')
@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  // ==========================================
  // DISH CONTROLLER ENDPOINTS
  // ==========================================

  @Get('dishes')
  @ApiOperation({
    summary: 'Lấy danh mục món ăn (Ngân hàng món ăn)',
    description: 'Trả về danh sách món ăn, có thể lọc theo phân loại (MAIN, SOUP, VEG, DESSERT) và từ khóa',
  })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  public async getDishes(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.menusService.getAllDishes(category, search);
    return { success: true, data };
  }

  @Post('dishes')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADM, Role.MGR)
  @ApiOperation({ summary: 'Thêm món ăn mới vào ngân hàng món ăn' })
  public async createDish(@Body() dto: CreateDishDto) {
    const data = await this.menusService.createDish(dto);
    return { success: true, data, message: 'Đã tạo món ăn thành công' };
  }

  @Put('dishes/:id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADM, Role.MGR)
  @ApiOperation({ summary: 'Cập nhật thông tin món ăn' })
  public async updateDish(@Param('id') id: string, @Body() dto: UpdateDishDto) {
    const data = await this.menusService.updateDish(id, dto);
    return { success: true, data, message: 'Đã cập nhật món ăn thành công' };
  }

  @Delete('dishes/:id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADM, Role.MGR)
  @ApiOperation({ summary: 'Xóa món ăn khỏi ngân hàng' })
  public async deleteDish(@Param('id') id: string) {
    await this.menusService.deleteDish(id);
    return { success: true, message: 'Đã xóa món ăn thành công' };
  }

  // ==========================================
  // MENU CONTROLLER & APPROVAL WORKFLOW
  // ==========================================

  @Get('weekly')
  @ApiOperation({
    summary: 'Lấy thực đơn cả tuần',
    description: 'Trả về thực đơn từ Thứ Hai đến Thứ Sáu. Nếu includeDrafts=true (cho Quản trị viên/Bếp), sẽ trả về cả thực đơn chờ duyệt.',
  })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'includeDrafts', required: false })
  public async getWeeklyMenu(
    @Query('startDate') startDate?: string,
    @Query('includeDrafts') includeDrafts?: string,
  ): Promise<{ success: boolean; data: DailyMenuDto[] }> {
    const shouldIncludeDrafts = includeDrafts === 'true';
    const data = await this.menusService.getWeeklyMenu(startDate, shouldIncludeDrafts);
    return { success: true, data };
  }

  @Get('today')
  @ApiOperation({
    summary: 'Lấy thực đơn hôm nay',
  })
  public async getTodayMenu(): Promise<{ success: boolean; data: DailyMenuDto }> {
    const data = await this.menusService.getTodayMenu();
    return { success: true, data };
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADM, Role.MGR)
  @ApiOperation({ summary: 'Tạo thực đơn ngày mới (Trạng thái DRAFT)' })
  public async createMenu(@Body() dto: CreateMenuDto, @Req() req: any) {
    const creatorName = req.user?.fullName || 'Quản lý Bán trú';
    const data = await this.menusService.createMenu(dto, creatorName);
    return { success: true, data, message: 'Đã tạo bản nháp thực đơn thành công' };
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADM, Role.MGR)
  @ApiOperation({ summary: 'Cập nhật nội dung & món ăn trong thực đơn' })
  public async updateMenu(@Param('id') id: string, @Body() dto: UpdateMenuDto) {
    const data = await this.menusService.updateMenu(id, dto);
    return { success: true, data, message: 'Đã cập nhật thực đơn thành công' };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADM, Role.MGR)
  @ApiOperation({ summary: 'Xóa bản nháp thực đơn' })
  public async deleteMenu(@Param('id') id: string) {
    await this.menusService.deleteMenu(id);
    return { success: true, message: 'Đã xóa thực đơn' };
  }

  @Patch(':id/submit-approval')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADM, Role.MGR)
  @ApiOperation({
    summary: 'Gửi thực đơn chờ phê duyệt (DRAFT -> PENDING_APPROVAL)',
  })
  public async submitForApproval(@Param('id') id: string) {
    const data = await this.menusService.submitForApproval(id);
    return {
      success: true,
      data,
      message: 'Đã gửi thực đơn cho Ban Giám Hiệu phê duyệt',
    };
  }

  @Patch(':id/approve')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADM)
  @ApiOperation({
    summary: 'Phê duyệt xuất bản thực đơn (Chỉ Hiệu trưởng/ADM)',
  })
  public async approveMenu(
    @Param('id') id: string,
    @Body() dto: ApproveMenuDto,
    @Req() req: any,
  ) {
    const approver = req.user?.fullName || 'Hiệu trưởng';
    const data = await this.menusService.approveMenu(id, dto, approver);
    return {
      success: true,
      data,
      message: 'Đã phê duyệt và xuất bản thực đơn công khai thành công',
    };
  }

  @Patch(':id/reject')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADM)
  @ApiOperation({
    summary: 'Từ chối thực đơn kèm phản hồi (Chỉ Hiệu trưởng/ADM)',
  })
  public async rejectMenu(
    @Param('id') id: string,
    @Body() dto: RejectMenuDto,
    @Req() req: any,
  ) {
    const rejector = req.user?.fullName || 'Hiệu trưởng';
    const data = await this.menusService.rejectMenu(id, dto, rejector);
    return {
      success: true,
      data,
      message: 'Đã từ chối thực đơn và gửi phản hồi chỉnh sửa cho Bếp',
    };
  }

  @Patch(':id/reset-draft')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADM, Role.MGR)
  @ApiOperation({
    summary: 'Thu hồi về bản nháp để chỉnh sửa lại (REJECTED -> DRAFT)',
  })
  public async resetToDraft(@Param('id') id: string) {
    const data = await this.menusService.resetToDraft(id);
    return {
      success: true,
      data,
      message: 'Đã chuyển thực đơn về bản nháp để chỉnh sửa',
    };
  }
}
