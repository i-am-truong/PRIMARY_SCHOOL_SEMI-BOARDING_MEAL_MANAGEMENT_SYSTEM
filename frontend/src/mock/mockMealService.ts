import { ClassRoster, MealDemand, InspectionRecord, TrayDistribution, ReconciliationReport, Student } from './types';
import { INITIAL_ROSTERS, INITIAL_MEAL_DEMAND, INITIAL_INSPECTION, INITIAL_DISTRIBUTIONS } from './schoolMockData';

// In-Memory state holder
class MockMealService {
  private rosters: ClassRoster[] = JSON.parse(JSON.stringify(INITIAL_ROSTERS));
  private mealDemand: MealDemand = JSON.parse(JSON.stringify(INITIAL_MEAL_DEMAND));
  private inspection: InspectionRecord = JSON.parse(JSON.stringify(INITIAL_INSPECTION));
  private distributions: TrayDistribution[] = JSON.parse(JSON.stringify(INITIAL_DISTRIBUTIONS));
  private listeners: (() => void)[] = [];

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // --- Attendance operations ---
  getRosters(): ClassRoster[] {
    return this.rosters;
  }

  getClassRoster(className: string): ClassRoster | undefined {
    return this.rosters.find((r) => r.className === className);
  }

  updateStudentStatus(className: string, studentId: string, status: Student['status'], absenceReason?: string) {
    const roster = this.rosters.find((r) => r.className === className);
    if (roster) {
      const student = roster.students.find((s) => s.id === studentId);
      if (student) {
        student.status = status;
        if (absenceReason !== undefined) {
          student.absenceReason = absenceReason;
        }
        this.recalculateDemand();
        this.notify();
      }
    }
  }

  toggleLockClassRoster(className: string) {
    const roster = this.rosters.find((r) => r.className === className);
    if (roster) {
      roster.isLocked = !roster.isLocked;
      roster.lockedAt = roster.isLocked ? new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : undefined;
      this.notify();
    }
  }

  lockAllAttendance() {
    this.rosters.forEach((r) => {
      r.isLocked = true;
      if (!r.lockedAt) {
        r.lockedAt = '08:30 AM';
      }
    });
    this.mealDemand.isCutoffLocked = true;
    this.recalculateDemand();
    this.notify();
  }

  // --- Demand and Buffer operations ---
  getMealDemand(): MealDemand {
    return this.mealDemand;
  }

  setBufferPercentage(percentage: number) {
    const clamped = Math.min(10, Math.max(0, percentage));
    this.mealDemand.bufferPercentage = clamped;
    this.recalculateDemand();
    this.notify();
  }

  submitOrderToCatering(customReceipt?: any) {
    this.mealDemand.status = 'ORDER_SENT';
    const now = new Date();
    const trackingRef = customReceipt?.vendorTrackingRef || `SF-VN-${Math.floor(10000 + Math.random() * 90000)}`;
    const orderCode = customReceipt?.orderCode || `PO-${now.toISOString().slice(0, 10).replace(/-/g, '')}-01`;
    
    this.mealDemand.poDispatchReceipt = {
      orderCode,
      vendorTrackingRef: trackingRef,
      dispatchedAt: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      apiStatus: 200,
      apiEndpoint: 'https://api.vincatering.vn/v2/purchase-orders/webhook',
      emailTo: 'orders@vincatering.vn',
      emailSubject: `[PO-ELECTRONIC] Đơn Đặt Hàng Bán Trú ${orderCode} - Giao 10:30 AM`,
      targetDeliveryTime: '10:30 AM',
      emailHtmlPreview: customReceipt?.emailHtmlPreview,
    };
    this.notify();
  }

  private recalculateDemand() {
    // calculate total eating students from all rosters
    let totalEating = 0;
    this.rosters.forEach((r) => {
      r.students.forEach((s) => {
        if (s.isRegisteredBoarding && s.status === 'EATING') {
          totalEating += 1;
        }
      });
    });

    // Add baseline for demo if only subset of classes have detailed student list
    const unexpandedClassesCount = (20 - this.rosters.length) * 35; 
    const effectivePresent = totalEating + unexpandedClassesCount;

    this.mealDemand.totalPresentStudents = effectivePresent;
    const baseDemand = effectivePresent + this.mealDemand.staffPortions;
    const buffer = Math.round((baseDemand * this.mealDemand.bufferPercentage) / 100);
    this.mealDemand.calculatedBufferPortions = buffer;
    this.mealDemand.totalOrderedPortions = baseDemand + buffer;

    // update dish quantities
    this.mealDemand.dishes.forEach((d) => {
      if (d.dish.category === 'MAIN') {
        d.requiredQty = Math.round(this.mealDemand.totalOrderedPortions * (d.dish.id === 'D-01' ? 0.65 : 0.35));
      } else {
        d.requiredQty = this.mealDemand.totalOrderedPortions;
      }
    });
  }

  // --- Inspection operations ---
  getInspection(): InspectionRecord {
    return this.inspection;
  }

  updateInspection(record: Partial<InspectionRecord>) {
    this.inspection = { ...this.inspection, ...record };
    if (this.inspection.overallPassed) {
      this.mealDemand.status = 'DELIVERY_RECEIVED';
    }
    this.notify();
  }

  // --- Distribution operations ---
  getDistributions(): TrayDistribution[] {
    return this.distributions;
  }

  confirmTrayDelivery(className: string, receivedBy: string) {
    const dist = this.distributions.find((d) => d.className === className);
    if (dist) {
      dist.status = 'CONFIRMED';
      dist.receivedBy = receivedBy;
      this.notify();
    }
  }

  // --- Reconciliation operations ---
  getReconciliationReport(): ReconciliationReport {
    const ordered = this.mealDemand.totalOrderedPortions;
    const delivered = this.inspection.overallPassed ? ordered : ordered - 15;
    const consumed = this.mealDemand.totalPresentStudents + this.mealDemand.staffPortions;
    const surplus = delivered - consumed;

    return {
      date: this.mealDemand.date,
      totalOrdered: ordered,
      totalDelivered: delivered,
      totalConsumed: consumed,
      bufferUsed: Math.max(0, consumed - (ordered - this.mealDemand.calculatedBufferPortions)),
      surplusDeficit: surplus,
      reasons: [
        '3 học sinh lớp 1A, 2B xin về sớm sau giờ ra chơi (ốm đột xuất)',
        'Bếp giao dư 5 suất tráng miệng chuối theo chính sách làm tròn sọt',
        'Bộ đệm an toàn hoạt động tốt, không thiếu hụt suất ăn nào cho học sinh'
      ],
      accountantNotified: this.mealDemand.status === 'RECONCILED'
    };
  }

  finalizeReconciliation() {
    this.mealDemand.status = 'RECONCILED';
    this.notify();
  }
}

export const mockMealService = new MockMealService();
