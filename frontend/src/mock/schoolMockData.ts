import { ClassRoster, Dish, MealDemand, InspectionRecord, TrayDistribution } from './types';

export const INITIAL_DISHES: Dish[] = [
  { id: 'D-01', name: 'Thịt heo kho cút trứng', category: 'MAIN', targetTemp: 70, allergens: ['Trứng'], unit: 'Suất' },
  { id: 'D-02', name: 'Đậu hũ dồn thịt sốt cà', category: 'MAIN', targetTemp: 68, allergens: ['Đậu nành'], unit: 'Suất' },
  { id: 'D-03', name: 'Canh bí đao sườn non', category: 'SOUP', targetTemp: 72, allergens: [], unit: 'Tô lớn' },
  { id: 'D-04', name: 'Rau cải ngọt xào tỏi', category: 'SIDE', targetTemp: 65, allergens: [], unit: 'Dĩa' },
  { id: 'D-05', name: 'Chuối già Nam Mỹ tráng miệng', category: 'DESSERT', targetTemp: 25, allergens: [], unit: 'Trái' }
];

export const INITIAL_ROSTERS: ClassRoster[] = [
  {
    className: '1A',
    grade: 1,
    teacherName: 'Cô Nguyễn Thị Mai',
    room: 'Phòng 101 - Tầng 1',
    totalStudents: 35,
    registeredBoarding: 35,
    isLocked: true,
    lockedAt: '08:15 AM',
    students: [
      { id: 'S101', code: 'HS-00101', fullName: 'Nguyễn Hoàng An', gender: 'MALE', grade: 1, className: '1A', allergies: ['Hải sản'], isRegisteredBoarding: true, status: 'EATING' },
      { id: 'S102', code: 'HS-00102', fullName: 'Trần Bảo Châu', gender: 'FEMALE', grade: 1, className: '1A', allergies: [], isRegisteredBoarding: true, status: 'EATING' },
      { id: 'S103', code: 'HS-00103', fullName: 'Lê Minh Khôi', gender: 'MALE', grade: 1, className: '1A', allergies: ['Đậu phộng'], isRegisteredBoarding: true, status: 'ABSENT_EXCUSED', absenceReason: 'Sốt nhẹ có đơn phụ huynh' },
      { id: 'S104', code: 'HS-00104', fullName: 'Phạm Ngọc Diệp', gender: 'FEMALE', grade: 1, className: '1A', allergies: [], isRegisteredBoarding: true, status: 'EATING' },
      { id: 'S105', code: 'HS-00105', fullName: 'Vũ Tuấn Kiệt', gender: 'MALE', grade: 1, className: '1A', allergies: ['Trứng gà'], isRegisteredBoarding: true, status: 'EATING' },
      { id: 'S106', code: 'HS-00106', fullName: 'Đặng Thảo Vy', gender: 'FEMALE', grade: 1, className: '1A', allergies: [], isRegisteredBoarding: true, status: 'EATING' },
      { id: 'S107', code: 'HS-00107', fullName: 'Hoàng Gia Bảo', gender: 'MALE', grade: 1, className: '1A', allergies: [], isRegisteredBoarding: true, status: 'EATING' },
      { id: 'S108', code: 'HS-00108', fullName: 'Bùi Khánh Linh', gender: 'FEMALE', grade: 1, className: '1A', allergies: [], isRegisteredBoarding: true, status: 'EATING' },
    ]
  },
  {
    className: '1B',
    grade: 1,
    teacherName: 'Cô Lê Thu Trang',
    room: 'Phòng 102 - Tầng 1',
    totalStudents: 34,
    registeredBoarding: 34,
    isLocked: true,
    lockedAt: '08:20 AM',
    students: [
      { id: 'S109', code: 'HS-00109', fullName: 'Đỗ Đức Thắng', gender: 'MALE', grade: 1, className: '1B', allergies: [], isRegisteredBoarding: true, status: 'EATING' },
      { id: 'S110', code: 'HS-00110', fullName: 'Vũ Thu Quỳnh', gender: 'FEMALE', grade: 1, className: '1B', allergies: ['Tôm tép'], isRegisteredBoarding: true, status: 'EATING' },
      { id: 'S111', code: 'HS-00111', fullName: 'Phạm Minh Trí', gender: 'MALE', grade: 1, className: '1B', allergies: [], isRegisteredBoarding: true, status: 'ABSENT_UNEXCUSED', absenceReason: 'Chưa liên lạc được gia đình' },
      { id: 'S112', code: 'HS-00112', fullName: 'Ngô Hải Yến', gender: 'FEMALE', grade: 1, className: '1B', allergies: [], isRegisteredBoarding: true, status: 'EATING' }
    ]
  },
  {
    className: '2A',
    grade: 2,
    teacherName: 'Thầy Phạm Văn Hùng',
    room: 'Phòng 201 - Tầng 2',
    totalStudents: 36,
    registeredBoarding: 36,
    isLocked: false,
    students: [
      { id: 'S201', code: 'HS-00201', fullName: 'Lý Quốc Huy', gender: 'MALE', grade: 2, className: '2A', allergies: [], isRegisteredBoarding: true, status: 'EATING' },
      { id: 'S202', code: 'HS-00202', fullName: 'Nguyễn Tường Vy', gender: 'FEMALE', grade: 2, className: '2A', allergies: ['Sữa bò tươi'], isRegisteredBoarding: true, status: 'EATING' },
      { id: 'S203', code: 'HS-00203', fullName: 'Hoàng Nhật Minh', gender: 'MALE', grade: 2, className: '2A', allergies: [], isRegisteredBoarding: true, status: 'EATING' },
      { id: 'S204', code: 'HS-00204', fullName: 'Đoàn Phương Linh', gender: 'FEMALE', grade: 2, className: '2A', allergies: [], isRegisteredBoarding: true, status: 'EATING' }
    ]
  },
  {
    className: '2B',
    grade: 2,
    teacherName: 'Cô Bùi Bích Phương',
    room: 'Phòng 202 - Tầng 2',
    totalStudents: 35,
    registeredBoarding: 35,
    isLocked: false,
    students: [
      { id: 'S205', code: 'HS-00205', fullName: 'Trương Quang Thắng', gender: 'MALE', grade: 2, className: '2B', allergies: [], isRegisteredBoarding: true, status: 'EATING' },
      { id: 'S206', code: 'HS-00206', fullName: 'Hà Kiều Anh', gender: 'FEMALE', grade: 2, className: '2B', allergies: ['Mè đen'], isRegisteredBoarding: true, status: 'EATING' },
      { id: 'S207', code: 'HS-00207', fullName: 'Dương Đình Khải', gender: 'MALE', grade: 2, className: '2B', allergies: [], isRegisteredBoarding: true, status: 'ABSENT_EXCUSED', absenceReason: 'Ốm đau có giấy viện' }
    ]
  },
  {
    className: '3A',
    grade: 3,
    teacherName: 'Cô Đỗ Thúy Hạnh',
    room: 'Phòng 301 - Tầng 3',
    totalStudents: 38,
    registeredBoarding: 37,
    isLocked: true,
    lockedAt: '08:25 AM',
    students: [
      { id: 'S301', code: 'HS-00301', fullName: 'Ngô Bá Khang', gender: 'MALE', grade: 3, className: '3A', allergies: [], isRegisteredBoarding: true, status: 'EATING' },
      { id: 'S302', code: 'HS-00302', fullName: 'Trịnh Thúy Loan', gender: 'FEMALE', grade: 3, className: '3A', allergies: ['Hải sản'], isRegisteredBoarding: true, status: 'EATING' }
    ]
  },
  {
    className: '4A',
    grade: 4,
    teacherName: 'Thầy Lê Quốc Dũng',
    room: 'Phòng 401 - Tầng 4',
    totalStudents: 40,
    registeredBoarding: 39,
    isLocked: true,
    lockedAt: '08:18 AM',
    students: [
      { id: 'S401', code: 'HS-00401', fullName: 'Vũ Đức Nam', gender: 'MALE', grade: 4, className: '4A', allergies: [], isRegisteredBoarding: true, status: 'EATING' },
      { id: 'S402', code: 'HS-00402', fullName: 'Nguyễn Lan Anh', gender: 'FEMALE', grade: 4, className: '4A', allergies: [], isRegisteredBoarding: true, status: 'EATING' }
    ]
  },
  {
    className: '5A',
    grade: 5,
    teacherName: 'Cô Huỳnh Mỹ Lệ',
    room: 'Phòng 501 - Tầng 5',
    totalStudents: 42,
    registeredBoarding: 42,
    isLocked: true,
    lockedAt: '08:10 AM',
    students: [
      { id: 'S501', code: 'HS-00501', fullName: 'Cao Văn Thành', gender: 'MALE', grade: 5, className: '5A', allergies: [], isRegisteredBoarding: true, status: 'EATING' },
      { id: 'S502', code: 'HS-00502', fullName: 'Lâm Thanh Nhã', gender: 'FEMALE', grade: 5, className: '5A', allergies: [], isRegisteredBoarding: true, status: 'EATING' }
    ]
  }
];

export const INITIAL_MEAL_DEMAND: MealDemand = {
  date: new Date().toISOString().split('T')[0],
  session: 'LUNCH',
  cutoffTime: '08:45 AM',
  isCutoffLocked: true,
  totalPresentStudents: 742,
  staffPortions: 38,
  bufferPercentage: 3, // 3%
  calculatedBufferPortions: 24,
  totalOrderedPortions: 804,
  specialDietPortions: 12,
  status: 'DRAFT',
  cateringVendor: {
    id: 'CAT-01',
    name: 'Công Ty CP Suất Ăn Học Đường VinaCatering',
    contactPhone: '0908.123.456 (Bếp trưởng Nguyễn Tuấn)',
    contractPricePerMeal: 35000
  },
  dishes: [
    { dish: INITIAL_DISHES[0], requiredQty: 520 },
    { dish: INITIAL_DISHES[1], requiredQty: 284 },
    { dish: INITIAL_DISHES[2], requiredQty: 804 },
    { dish: INITIAL_DISHES[3], requiredQty: 804 },
    { dish: INITIAL_DISHES[4], requiredQty: 804 }
  ]
};

export const INITIAL_INSPECTION: InspectionRecord = {
  id: 'INSP-20260918-01',
  inspectionTime: '10:32 AM',
  inspectorName: 'Nguyễn Thị Thu Hà (Điều phối viên)',
  sealIntact: true,
  temperatureProbeCelsius: 68.5,
  sensoryColorSmellTastePassed: true,
  sampleRetained24h: true,
  deliveredContainersCount: 28,
  expectedContainersCount: 28,
  overallPassed: true,
  notes: 'Suất ăn đóng kín trong thùng giữ nhiệt chuyên dụng, nhiệt độ đạt tiêu chuẩn >= 65°C.'
};

export const INITIAL_DISTRIBUTIONS: TrayDistribution[] = [
  { className: '1A', trolleyId: 'XD-01 (Tầng 1)', allocatedTrays: 34, specialAllergyTrays: 2, dispatchedTime: '10:55 AM', receivedBy: 'Cô Mai', status: 'CONFIRMED' },
  { className: '1B', trolleyId: 'XD-01 (Tầng 1)', allocatedTrays: 33, specialAllergyTrays: 1, dispatchedTime: '10:55 AM', receivedBy: 'Cô Trang', status: 'CONFIRMED' },
  { className: '2A', trolleyId: 'XD-02 (Tầng 2)', allocatedTrays: 36, specialAllergyTrays: 1, dispatchedTime: '11:02 AM', receivedBy: 'Thầy Hùng', status: 'DISPATCHED' },
  { className: '2B', trolleyId: 'XD-02 (Tầng 2)', allocatedTrays: 34, specialAllergyTrays: 1, dispatchedTime: '11:02 AM', receivedBy: 'Chờ giao', status: 'PENDING' },
  { className: '3A', trolleyId: 'XD-03 (Tầng 3)', allocatedTrays: 37, specialAllergyTrays: 1, dispatchedTime: '11:05 AM', receivedBy: 'Chờ giao', status: 'PENDING' },
  { className: '4A', trolleyId: 'XD-04 (Tầng 4)', allocatedTrays: 39, specialAllergyTrays: 0, dispatchedTime: '11:08 AM', receivedBy: 'Chờ giao', status: 'PENDING' },
  { className: '5A', trolleyId: 'XD-05 (Tầng 5)', allocatedTrays: 42, specialAllergyTrays: 0, dispatchedTime: '11:10 AM', receivedBy: 'Chờ giao', status: 'PENDING' }
];
