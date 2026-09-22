import { MenusService } from './menus.service';
import { PrismaService } from '../../../database/prisma/prisma.service';

describe('MenusService (Menus & Nutrition Domain) - Unit Tests', () => {
  let menusService: MenusService;
  let prismaServiceMock: any;

  beforeEach(() => {
    prismaServiceMock = {
      menu: {
        findMany: jest.fn(),
      },
    };

    menusService = new MenusService(prismaServiceMock as unknown as PrismaService);
  });

  describe('getWeeklyMenu', () => {
    it('should aggregate dishes and compute total calories accurately from database records', async () => {
      // Arrange: Sample menu with dishes matching real nutrition data
      const mockDbMenus = [
        {
          id: 'menu-db-001',
          serveDate: new Date('2026-09-21T00:00:00.000Z'), // Monday
          title: 'Thực đơn Tăng trưởng Thể chất',
          description: 'Chuẩn dinh dưỡng học đường',
          dishes: [
            {
              dish: {
                id: 'dish-01',
                name: 'Thịt heo kho cút trứng',
                calories: 280,
                allergens: ['Trứng'],
              },
            },
            {
              dish: {
                id: 'dish-02',
                name: 'Đậu hũ dồn thịt sốt cà',
                calories: 210,
                allergens: ['Đậu nành'],
              },
            },
            {
              dish: {
                id: 'dish-03',
                name: 'Canh bí đao sườn non',
                calories: 120,
                allergens: [],
              },
            },
          ],
        },
      ];

      prismaServiceMock.menu.findMany.mockResolvedValue(mockDbMenus);

      // Act
      const result = await menusService.getWeeklyMenu('2026-09-21');

      // Assert
      expect(result).toHaveLength(1);
      const mondayMenu = result[0];
      expect(mondayMenu.id).toBe('menu-db-001');
      expect(mondayMenu.title).toBe('Thực đơn Tăng trưởng Thể chất');
      // 280 + 210 + 120 = 610 calories
      expect(mondayMenu.totalCalories).toBe(610);
      expect(mondayMenu.dishes).toHaveLength(3);
      expect(mondayMenu.dishes[0].allergens).toEqual(['Trứng']);
    });

    it('should query database within Monday to Friday time range for the given week', async () => {
      // Arrange: Wednesday 2026-09-23
      prismaServiceMock.menu.findMany.mockResolvedValue([]);

      // Act
      await menusService.getWeeklyMenu('2026-09-23');

      // Assert
      expect(prismaServiceMock.menu.findMany).toHaveBeenCalledTimes(1);
      const queryArgs = prismaServiceMock.menu.findMany.mock.calls[0][0];

      const gteDate: Date = queryArgs.where.serveDate.gte;
      const lteDate: Date = queryArgs.where.serveDate.lte;

      // 2026-09-21 is Monday, 2026-09-25 is Friday
      expect(gteDate.getDay()).toBe(1); // Monday
      expect(lteDate.getDay()).toBe(5); // Friday
      expect(gteDate.getTime()).toBeLessThan(lteDate.getTime());
    });

    it('should fallback to 5-day school week mock menu when database returns empty records', async () => {
      // Arrange
      prismaServiceMock.menu.findMany.mockResolvedValue([]);

      // Act
      const result = await menusService.getWeeklyMenu();

      // Assert: Exactly 5 days (Mon - Fri)
      expect(result).toHaveLength(5);
      expect(result[0].dayOfWeek).toBe('Thứ Hai');
      expect(result[1].dayOfWeek).toBe('Thứ Ba');
      expect(result[2].dayOfWeek).toBe('Thứ Tư');
      expect(result[3].dayOfWeek).toBe('Thứ Năm');
      expect(result[4].dayOfWeek).toBe('Thứ Sáu');

      // All days must contain dishes and positive calories
      result.forEach((dayMenu) => {
        expect(dayMenu.dishes.length).toBeGreaterThan(0);
        expect(dayMenu.totalCalories).toBeGreaterThan(0);
      });
    });

    it('should fallback gracefully to mock menu when database query throws an error', async () => {
      // Arrange
      prismaServiceMock.menu.findMany.mockRejectedValue(new Error('Database connection timeout'));

      // Act
      const result = await menusService.getWeeklyMenu();

      // Assert
      expect(result).toHaveLength(5);
      expect(result[0].dishes.length).toBeGreaterThan(0);
    });
  });

  describe('getTodayMenu', () => {
    it('should return a valid daily menu with title, totalCalories, and dish items', async () => {
      // Arrange
      prismaServiceMock.menu.findMany.mockResolvedValue([]);

      // Act
      const todayMenu = await menusService.getTodayMenu();

      // Assert
      expect(todayMenu).toBeDefined();
      expect(todayMenu.title).toBeTruthy();
      expect(todayMenu.totalCalories).toBeGreaterThan(0);
      expect(Array.isArray(todayMenu.dishes)).toBe(true);
      expect(todayMenu.dishes.length).toBeGreaterThan(0);
    });
  });
});
