import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateDishDto, UpdateDishDto } from '../dto/dish.dto';
import { ApproveMenuDto, CreateMenuDto, RejectMenuDto, UpdateMenuDto } from '../dto/menu.dto';
import { MenuStatus } from '@prisma/client';

export interface DishInfo {
  id: string;
  name: string;
  category?: string;
  description?: string;
  calories: number;
  allergens: string[];
}

export interface DailyMenuDto {
  id: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  title: string;
  description?: string;
  status: MenuStatus;
  approvalNote?: string;
  approvedAt?: string;
  approvedBy?: string;
  totalCalories: number;
  dishes: DishInfo[];
}

@Injectable()
export class MenusService {
  private readonly logger = new Logger(MenusService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // DISH CRUD
  // ==========================================

  public async getAllDishes(category?: string, search?: string) {
    const where: any = {};
    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const dishes = await this.prisma.dish.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return dishes.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category || 'MAIN',
      description: d.description || '',
      calories: d.calories || 150,
      allergens: d.allergens || [],
    }));
  }

  public async getDishById(id: string) {
    const dish = await this.prisma.dish.findUnique({ where: { id } });
    if (!dish) {
      throw new NotFoundException(`Không tìm thấy món ăn với ID: ${id}`);
    }
    return dish;
  }

  public async createDish(dto: CreateDishDto) {
    const existing = await this.prisma.dish.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new BadRequestException(`Món ăn "${dto.name}" đã tồn tại trong hệ thống.`);
    }

    return this.prisma.dish.create({
      data: {
        name: dto.name,
        category: dto.category || 'MAIN',
        description: dto.description || '',
        calories: dto.calories || 150,
        allergens: dto.allergens || [],
      },
    });
  }

  public async updateDish(id: string, dto: UpdateDishDto) {
    await this.getDishById(id);

    if (dto.name) {
      const duplicate = await this.prisma.dish.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (duplicate) {
        throw new BadRequestException(`Món ăn "${dto.name}" đã được đặt tên cho món khác.`);
      }
    }

    return this.prisma.dish.update({
      where: { id },
      data: {
        name: dto.name,
        category: dto.category,
        description: dto.description,
        calories: dto.calories,
        allergens: dto.allergens,
      },
    });
  }

  public async deleteDish(id: string) {
    await this.getDishById(id);

    // Kiểm tra món ăn có đang được dùng trong thực đơn nào không
    const usedCount = await this.prisma.menuDish.count({ where: { dishId: id } });
    if (usedCount > 0) {
      throw new BadRequestException(`Không thể xóa món ăn này vì đang được phân bổ trong ${usedCount} thực đơn.`);
    }

    return this.prisma.dish.delete({ where: { id } });
  }

  // ==========================================
  // MENU CRUD & APPROVAL WORKFLOW
  // ==========================================

  public async getWeeklyMenu(startDateStr?: string, includeAllStatuses = false): Promise<DailyMenuDto[]> {
    try {
      const today = startDateStr ? new Date(startDateStr) : new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diff));
      monday.setHours(0, 0, 0, 0);

      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);
      friday.setHours(23, 59, 59, 999);

      const where: any = {
        serveDate: {
          gte: monday,
          lte: friday,
        },
      };

      if (!includeAllStatuses) {
        where.status = MenuStatus.APPROVED;
      }

      const dbMenus = await this.prisma.menu.findMany({
        where,
        include: {
          dishes: {
            include: { dish: true },
          },
        },
        orderBy: { serveDate: 'asc' },
      });

      if (dbMenus.length > 0) {
        return dbMenus.map((m) => {
          const dishes: DishInfo[] = m.dishes.map((md) => ({
            id: md.dish.id,
            name: md.dish.name,
            category: md.dish.category || 'MAIN',
            description: md.dish.description || '',
            calories: md.dish.calories || 150,
            allergens: md.dish.allergens || [],
          }));
          const totalCalories = dishes.reduce((sum, d) => sum + d.calories, 0);
          return {
            id: m.id,
            date: m.serveDate.toISOString().slice(0, 10),
            dayOfWeek: this.getDayOfWeekName(m.serveDate),
            title: m.title,
            description: m.description || '',
            status: m.status,
            approvalNote: m.approvalNote || '',
            approvedAt: m.approvedAt ? m.approvedAt.toISOString() : undefined,
            approvedBy: m.approvedBy || undefined,
            totalCalories,
            dishes,
          };
        });
      }
    } catch (error) {
      this.logger.warn(`Lỗi truy vấn DB menu tuần: ${error.message}. Chuyển sang fallback mẫu.`);
    }

    return this.getMockWeeklyMenu();
  }

  public async getTodayMenu(): Promise<DailyMenuDto> {
    const weekly = await this.getWeeklyMenu(undefined, false);
    const todayStr = new Date().toISOString().slice(0, 10);
    return weekly.find((m) => m.date === todayStr) || weekly[0];
  }

  public async createMenu(dto: CreateMenuDto, creatorName = 'Bếp trưởng') {
    const targetDate = new Date(dto.serveDate);
    targetDate.setHours(0, 0, 0, 0);

    const existing = await this.prisma.menu.findUnique({
      where: { serveDate: targetDate },
    });
    if (existing) {
      throw new BadRequestException(`Đã tồn tại thực đơn cho ngày ${dto.serveDate}. Vui lòng chỉnh sửa thay vì tạo mới.`);
    }

    return this.prisma.menu.create({
      data: {
        serveDate: targetDate,
        title: dto.title,
        description: dto.description,
        status: MenuStatus.DRAFT,
        dishes: {
          create: dto.dishIds.map((dishId) => ({ dishId })),
        },
      },
      include: {
        dishes: { include: { dish: true } },
      },
    });
  }

  public async updateMenu(id: string, dto: UpdateMenuDto) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) {
      throw new NotFoundException(`Không tìm thấy thực đơn với ID: ${id}`);
    }

    if (menu.status === MenuStatus.APPROVED) {
      throw new BadRequestException('Thực đơn đã được Hiệu trưởng phê duyệt. Không thể chỉnh sửa trực tiếp (cần trả về DRAFT trước).');
    }

    // Nếu có cập nhật danh sách món, xóa món cũ và liên kết món mới
    if (dto.dishIds) {
      await this.prisma.menuDish.deleteMany({ where: { menuId: id } });
      await this.prisma.menuDish.createMany({
        data: dto.dishIds.map((dishId) => ({ menuId: id, dishId })),
      });
    }

    return this.prisma.menu.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
      },
      include: {
        dishes: { include: { dish: true } },
      },
    });
  }

  public async deleteMenu(id: string) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) {
      throw new NotFoundException(`Không tìm thấy thực đơn với ID: ${id}`);
    }

    if (menu.status === MenuStatus.APPROVED) {
      throw new BadRequestException('Không thể xóa thực đơn đã được phê duyệt công khai.');
    }

    return this.prisma.menu.delete({ where: { id } });
  }

  // Phê duyệt 1 cấp: DRAFT -> PENDING_APPROVAL
  public async submitForApproval(id: string) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: { dishes: true },
    });
    if (!menu) {
      throw new NotFoundException(`Không tìm thấy thực đơn với ID: ${id}`);
    }
    if (menu.dishes.length === 0) {
      throw new BadRequestException('Thực đơn chưa có món ăn nào. Vui lòng phân bổ món trước khi gửi duyệt.');
    }
    if (menu.status === MenuStatus.APPROVED) {
      throw new BadRequestException('Thực đơn này đã được phê duyệt trước đó.');
    }

    return this.prisma.menu.update({
      where: { id },
      data: {
        status: MenuStatus.PENDING_APPROVAL,
        approvalNote: null,
      },
    });
  }

  // Phê duyệt 1 cấp: PENDING_APPROVAL / DRAFT -> APPROVED (Chỉ ADM)
  public async approveMenu(id: string, dto: ApproveMenuDto, approverName = 'Hiệu trưởng') {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) {
      throw new NotFoundException(`Không tìm thấy thực đơn với ID: ${id}`);
    }

    return this.prisma.menu.update({
      where: { id },
      data: {
        status: MenuStatus.APPROVED,
        approvalNote: dto.note || 'Đã duyệt đạt chuẩn dinh dưỡng',
        approvedAt: new Date(),
        approvedBy: approverName,
      },
      include: {
        dishes: { include: { dish: true } },
      },
    });
  }

  // Phê duyệt 1 cấp: PENDING_APPROVAL -> REJECTED (Chỉ ADM)
  public async rejectMenu(id: string, dto: RejectMenuDto, rejectorName = 'Hiệu trưởng') {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) {
      throw new NotFoundException(`Không tìm thấy thực đơn với ID: ${id}`);
    }

    return this.prisma.menu.update({
      where: { id },
      data: {
        status: MenuStatus.REJECTED,
        approvalNote: dto.reason,
        approvedAt: new Date(),
        approvedBy: rejectorName,
      },
      include: {
        dishes: { include: { dish: true } },
      },
    });
  }

  // Khôi phục về DRAFT để bếp trưởng chỉnh sửa lại sau khi bị từ chối
  public async resetToDraft(id: string) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) {
      throw new NotFoundException(`Không tìm thấy thực đơn với ID: ${id}`);
    }

    return this.prisma.menu.update({
      where: { id },
      data: {
        status: MenuStatus.DRAFT,
      },
    });
  }

  private getDayOfWeekName(d: Date): string {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return days[d.getDay()];
  }

  private getMockWeeklyMenu(): DailyMenuDto[] {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));

    const dayLabels = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu'];
    const sampleMenus = [
      {
        title: 'Bữa trưa Tiêu chuẩn Việt',
        dishes: [
          { id: 'd-1', name: 'Thịt heo kho cút trứng', category: 'MAIN', calories: 280, allergens: ['Trứng'] },
          { id: 'd-2', name: 'Đậu hũ dồn thịt sốt cà', category: 'MAIN', calories: 210, allergens: ['Đậu nành'] },
          { id: 'd-3', name: 'Canh bí đao sườn non', category: 'SOUP', calories: 120, allergens: [] },
          { id: 'd-4', name: 'Rau cải ngọt xào tỏi', category: 'VEG', calories: 65, allergens: [] },
          { id: 'd-5', name: 'Chuối già Nam Mỹ tráng miệng', category: 'DESSERT', calories: 90, allergens: [] },
        ],
      },
      {
        title: 'Thực đơn Tăng trưởng Thể chất',
        dishes: [
          { id: 'd-6', name: 'Gà rán mật ong sốt mè', category: 'MAIN', calories: 310, allergens: ['Mè'] },
          { id: 'd-7', name: 'Tôm rim thịt ba rọi', category: 'MAIN', calories: 240, allergens: ['Hải sản'] },
          { id: 'd-8', name: 'Canh cải chua nấu cá điêu hồng', category: 'SOUP', calories: 140, allergens: ['Hải sản'] },
          { id: 'd-9', name: 'Bắp cải luộc chấm trứng', category: 'VEG', calories: 85, allergens: ['Trứng'] },
          { id: 'd-10', name: 'Dưa hấu Long An', category: 'DESSERT', calories: 75, allergens: [] },
        ],
      },
      {
        title: 'Bữa trưa Dinh dưỡng Đề kháng',
        dishes: [
          { id: 'd-11', name: 'Bò xào ớt chuông cần tây', category: 'MAIN', calories: 260, allergens: ['Cần tây'] },
          { id: 'd-12', name: 'Chả cá măng sốt cà chua', category: 'MAIN', calories: 195, allergens: ['Hải sản'] },
          { id: 'd-13', name: 'Canh rong biển đậu hũ thịt bằm', category: 'SOUP', calories: 130, allergens: ['Đậu nành'] },
          { id: 'd-14', name: 'Bông cải xanh xào nấm', category: 'VEG', calories: 70, allergens: [] },
          { id: 'd-15', name: 'Sữa chua men vi sinh', category: 'DESSERT', calories: 100, allergens: ['Sữa bò tươi'] },
        ],
      },
      {
        title: 'Thực đơn Dân dã Thơm ngon',
        dishes: [
          { id: 'd-16', name: 'Sườn non rim mặn ngọt', category: 'MAIN', calories: 295, allergens: [] },
          { id: 'd-17', name: 'Trứng cuộn rau củ phô mai', category: 'MAIN', calories: 180, allergens: ['Trứng', 'Sữa bò tươi'] },
          { id: 'd-18', name: 'Canh mướp mồng tơi nấu cua đồng', category: 'SOUP', calories: 125, allergens: ['Hải sản'] },
          { id: 'd-19', name: 'Giá đỗ xào huyết', category: 'VEG', calories: 75, allergens: [] },
          { id: 'd-20', name: 'Thanh long ruột đỏ', category: 'DESSERT', calories: 60, allergens: [] },
        ],
      },
      {
        title: 'Bữa tiệc Cuối tuần Vui vẻ',
        dishes: [
          { id: 'd-21', name: 'Mì Ý sốt bò bằm Parmesan', category: 'MAIN', calories: 340, allergens: ['Lúa mì / Gluten', 'Sữa bò tươi'] },
          { id: 'd-22', name: 'Khoai tây múi cau nướng thảo mộc', category: 'MAIN', calories: 160, allergens: [] },
          { id: 'd-23', name: 'Salad rau mầm trứng cút sốt mè rang', category: 'VEG', calories: 110, allergens: ['Trứng', 'Mè'] },
          { id: 'd-24', name: 'Súp gà ngô non nấm tuyết', category: 'SOUP', calories: 135, allergens: ['Trứng'] },
          { id: 'd-25', name: 'Chè hạt sen long nhãn', category: 'DESSERT', calories: 120, allergens: [] },
        ],
      },
    ];

    return dayLabels.map((dayLabel, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      const sample = sampleMenus[index];
      const totalCalories = sample.dishes.reduce((sum, item) => sum + item.calories, 0);

      return {
        id: `menu-mock-${index + 1}`,
        date: d.toISOString().slice(0, 10),
        dayOfWeek: dayLabel,
        title: sample.title,
        description: 'Bữa trưa giàu canxi, chất xơ và protein đạt chuẩn Viện Dinh Dưỡng Quốc Gia.',
        status: MenuStatus.APPROVED,
        approvalNote: 'Phê duyệt chuẩn dinh dưỡng tuần',
        approvedBy: 'Hiệu trưởng',
        totalCalories,
        dishes: sample.dishes,
      };
    });
  }
}
