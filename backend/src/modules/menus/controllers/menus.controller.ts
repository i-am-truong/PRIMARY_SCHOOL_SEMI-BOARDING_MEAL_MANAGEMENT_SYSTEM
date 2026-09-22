import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MenusService, DailyMenuDto } from '../services/menus.service';

@ApiTags('Menus & Dishes')
@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Get('weekly')
  @ApiOperation({
    summary: 'Lấy thực đơn cả tuần',
    description: 'Trả về thực đơn từ Thứ Hai đến Thứ Sáu kèm calories và thành phần dị ứng',
  })
  public async getWeeklyMenu(@Query('startDate') startDate?: string): Promise<{ success: boolean; data: DailyMenuDto[] }> {
    const data = await this.menusService.getWeeklyMenu(startDate);
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
}
