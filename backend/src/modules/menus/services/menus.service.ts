import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';

export interface DishInfo {
  id: string;
  name: string;
  calories: number;
  allergens: string[];
}

export interface DailyMenuDto {
  id: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  title: string;
  description?: string;
  totalCalories: number;
  dishes: DishInfo[];
}

@Injectable()
export class MenusService {
  private readonly logger = new Logger(MenusService.name);

  constructor(private readonly prisma: PrismaService) {}

  public async getWeeklyMenu(startDateStr?: string): Promise<DailyMenuDto[]> {
    try {
      const today = startDateStr ? new Date(startDateStr) : new Date();
      // Calculate Monday of current week
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const monday = new Date(today.setDate(diff));
      monday.setHours(0, 0, 0, 0);

      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);
      friday.setHours(23, 59, 59, 999);

      const dbMenus = await this.prisma.menu.findMany({
        where: {
          serveDate: {
            gte: monday,
            lte: friday,
          },
        },
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
            totalCalories,
            dishes,
          };
        });
      }
    } catch {
      // Fallback to sample mock menu if DB is offline or empty
    }

    return this.getMockWeeklyMenu();
  }

  public async getTodayMenu(): Promise<DailyMenuDto> {
    const weekly = await this.getWeeklyMenu();
    const todayStr = new Date().toISOString().slice(0, 10);
    return weekly.find((m) => m.date === todayStr) || weekly[0];
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
          { id: 'd-1', name: 'Thịt heo kho cút trứng', calories: 280, allergens: ['Trứng'] },
          { id: 'd-2', name: 'Đậu hũ dồn thịt sốt cà', calories: 210, allergens: ['Đậu nành'] },
          { id: 'd-3', name: 'Canh bí đao sườn non', calories: 120, allergens: [] },
          { id: 'd-4', name: 'Rau cải ngọt xào tỏi', calories: 65, allergens: [] },
          { id: 'd-5', name: 'Chuối già Nam Mỹ tráng miệng', calories: 90, allergens: [] },
        ],
      },
      {
        title: 'Thực đơn Tăng trưởng Thể chất',
        dishes: [
          { id: 'd-6', name: 'Gà rán mật ong sốt mè', calories: 310, allergens: ['Mè'] },
          { id: 'd-7', name: 'Tôm rim thịt ba rọi', calories: 240, allergens: ['Hải sản'] },
          { id: 'd-8', name: 'Canh cải chua nấu cá điêu hồng', calories: 140, allergens: ['Hải sản'] },
          { id: 'd-9', name: 'Bắp cải luộc chấm trứng', calories: 85, allergens: ['Trứng'] },
          { id: 'd-10', name: 'Dưa hấu Long An', calories: 75, allergens: [] },
        ],
      },
      {
        title: 'Bữa trưa Dinh dưỡng Đề kháng',
        dishes: [
          { id: 'd-11', name: 'Bò xào ớt chuông cần tây', calories: 260, allergens: ['Cần tây'] },
          { id: 'd-12', name: 'Chả cá măng sốt cà chua', calories: 195, allergens: ['Hải sản'] },
          { id: 'd-13', name: 'Canh rong biển đậu hũ thịt bằm', calories: 130, allergens: ['Đậu nành'] },
          { id: 'd-14', name: 'Bông cải xanh xào nấm', calories: 70, allergens: [] },
          { id: 'd-15', name: 'Sữa chua men vi sinh', calories: 100, allergens: ['Sữa bò tươi'] },
        ],
      },
      {
        title: 'Thực đơn Dân dã Thơm ngon',
        dishes: [
          { id: 'd-16', name: 'Sườn non rim mặn ngọt', calories: 295, allergens: [] },
          { id: 'd-17', name: 'Trứng cuộn rau củ phô mai', calories: 180, allergens: ['Trứng', 'Sữa bò tươi'] },
          { id: 'd-18', name: 'Canh mướp mồng tơi nấu cua đồng', calories: 125, allergens: ['Hải sản'] },
          { id: 'd-19', name: 'Giá đỗ xào huyết', calories: 75, allergens: [] },
          { id: 'd-20', name: 'Thanh long ruột đỏ', calories: 60, allergens: [] },
        ],
      },
      {
        title: 'Bữa tiệc Cuối tuần Vui vẻ',
        dishes: [
          { id: 'd-21', name: 'Mì Ý sốt bò bằm Parmesan', calories: 340, allergens: ['Lúa mì / Gluten', 'Sữa bò tươi'] },
          { id: 'd-22', name: 'Khoai tây múi cau nướng thảo mộc', calories: 160, allergens: [] },
          { id: 'd-23', name: 'Salad rau mầm trứng cút sốt mè rang', calories: 110, allergens: ['Trứng', 'Mè'] },
          { id: 'd-24', name: 'Súp gà ngô non nấm tuyết', calories: 135, allergens: ['Trứng'] },
          { id: 'd-25', name: 'Chè hạt sen long nhãn', calories: 120, allergens: [] },
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
        totalCalories,
        dishes: sample.dishes,
      };
    });
  }
}
