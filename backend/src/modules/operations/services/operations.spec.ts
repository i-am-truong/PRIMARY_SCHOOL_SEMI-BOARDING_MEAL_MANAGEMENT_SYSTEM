import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { BufferEngine } from './buffer.engine';
import { ReconciliationEngine } from './reconciliation.engine';
import { ReceivingService } from './receiving.service';
import { DemandService } from './demand.service';
import { CateringDispatchService } from './catering-dispatch.service';
import { DistributionService } from './distribution.service';
import { OperationsRepository } from '../repositories/operations.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';

describe('Semi-Boarding Management (MGR) Domain Services - Unit Tests', () => {
  let operationsRepository: OperationsRepository;

  beforeEach(() => {
    // In-memory isolated repository for deterministic testing
    const prismaServiceMock = {
      vendorOrder: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;

    operationsRepository = new OperationsRepository(prismaServiceMock);
  });

  describe('BufferEngine (TF-MGR-01: Safety Margin Calculation)', () => {
    let bufferEngine: BufferEngine;

    beforeEach(() => {
      bufferEngine = new BufferEngine();
    });

    it('should calculate exact buffer count for 1200 students with 5% standard safety margin', () => {
      // 1200 * 0.05 = 60 extra portions -> 1260 total
      const result = bufferEngine.calculate(1200, 0.05);

      expect(result.confirmedAttendance).toBe(1200);
      expect(result.bufferRate).toBe(0.05);
      expect(result.bufferQuantity).toBe(60);
      expect(result.finalDemandCount).toBe(1260);
    });

    it('should round fractional buffer quantities UP using ceiling logic', () => {
      // 21 attendees * 5% = 1.05 -> ceiling is 2 extra portions -> 23 total
      const result = bufferEngine.calculate(21, 0.05);

      expect(result.bufferQuantity).toBe(2);
      expect(result.finalDemandCount).toBe(23);
    });

    it('should allow boundary rate of 0% with zero buffer quantity added', () => {
      const result = bufferEngine.calculate(1000, 0.0);

      expect(result.bufferQuantity).toBe(0);
      expect(result.finalDemandCount).toBe(1000);
    });

    it('should allow upper boundary rate of 10% statutory maximum', () => {
      // 500 * 0.10 = 50 -> 550 total
      const result = bufferEngine.calculate(500, 0.1);

      expect(result.bufferQuantity).toBe(50);
      expect(result.finalDemandCount).toBe(550);
    });

    it('should throw error when buffer rate exceeds statutory ceiling (> 10%)', () => {
      expect(() => bufferEngine.calculate(1200, 0.105)).toThrow(
        /Buffer rate must be within 0% and 10%/,
      );
    });

    it('should throw error when buffer rate is negative (< 0%)', () => {
      expect(() => bufferEngine.calculate(1200, -0.01)).toThrow(
        /Buffer rate must be within 0% and 10%/,
      );
    });

    it('should throw error when confirmed attendance headcount is negative', () => {
      expect(() => bufferEngine.calculate(-5, 0.05)).toThrow(
        /Confirmed attendance headcount cannot be negative/,
      );
    });
  });

  describe('DemandService (TF-MGR-01 / SCR-MGR-01: Morning Demand Calculation)', () => {
    let demandService: DemandService;
    let bufferEngine: BufferEngine;

    beforeEach(() => {
      bufferEngine = new BufferEngine();
      demandService = new DemandService(bufferEngine, operationsRepository);
    });

    it('should calculate demand, generate dish requirement breakdown, and save demand record', async () => {
      const response = await demandService.calculateDemand({
        mealScheduleId: 42,
        bufferRate: 0.05,
      });

      // Attendance is 1200, buffer is 5% -> 60, total 1260
      expect(response.mealScheduleId).toBe(42);
      expect(response.confirmedAttendance).toBe(1200);
      expect(response.bufferQuantity).toBe(60);
      expect(response.finalDemandCount).toBe(1260);
      expect(response.status).toBe('calculated');
      expect(response.determinationMethod).toBe('attendance_based');

      // Breakdown verifies culinary production volume (1260 * ratios)
      // Meat: 1260 * 0.1 = 126.0 kg
      // Soup: 1260 * 0.15 = 189.0 liters
      // Rice: 1260 * 0.12 = 151.2 kg
      expect(response.dishBreakdown).toHaveLength(3);
      expect(response.dishBreakdown).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ dishId: 101, expectedQuantity: 126, unit: 'kg' }),
          expect.objectContaining({ dishId: 102, expectedQuantity: 189, unit: 'liters' }),
          expect.objectContaining({ dishId: 103, expectedQuantity: 151.2, unit: 'kg' }),
        ]),
      );
    });

    it('should retrieve existing demand record by its identifier', async () => {
      const created = await demandService.calculateDemand({
        mealScheduleId: 55,
        bufferRate: 0.08,
      });

      const retrieved = await demandService.getDemandById(created.id);
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.mealScheduleId).toBe(55);
    });

    it('should throw NotFoundException when fetching a non-existent demand record', async () => {
      await expect(demandService.getDemandById(99999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('CateringDispatchService (TF-MGR-02: Purchase Order Dispatch)', () => {
    let cateringDispatchService: CateringDispatchService;

    beforeEach(() => {
      cateringDispatchService = new CateringDispatchService(operationsRepository);
    });

    it('should dispatch purchase order separating standard and special dietary portions', async () => {
      // Setup prerequisite demand
      const demand = await operationsRepository.saveDemand({
        mealScheduleId: 101,
        mealDate: '2026-09-21',
        confirmedAttendance: 1200,
        specialDietaryCount: 18,
        bufferRate: 0.05,
        bufferQuantity: 60,
        finalDemandCount: 1260,
        determinationMethod: 'attendance_based',
        status: 'calculated',
      });

      const orderResponse = await cateringDispatchService.dispatchOrder({
        mealDemandId: demand.id,
        vendorName: 'Công ty Suất ăn Học đường Sạch Hà Nội',
        targetDeliveryTime: '10:30',
        notes: 'Giao tại sảnh tiếp nhận cổng 2',
      });

      expect(orderResponse.mealDemandId).toBe(demand.id);
      expect(orderResponse.totalOrderedPortions).toBe(1260);
      expect(orderResponse.specialDietaryPortions).toBe(18);
      expect(orderResponse.standardPortions).toBe(1242); // 1260 - 18
      expect(orderResponse.vendorAcknowledged).toBe(true);
      expect(orderResponse.vendorTrackingRef).toMatch(/^SF-VN-\d{5}$/);
      expect(orderResponse.orderCode).toMatch(/^PO-\d{8}-\d{2}$/);
    });

    it('should throw NotFoundException when dispatching for a non-existent meal demand', async () => {
      await expect(
        cateringDispatchService.dispatchOrder({
          mealDemandId: 8888,
          vendorName: 'Nhà cung cấp ABC',
          targetDeliveryTime: '10:30',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should retrieve existing catering order by ID', async () => {
      const demand = await operationsRepository.saveDemand({
        mealScheduleId: 102,
        mealDate: '2026-09-21',
        confirmedAttendance: 500,
        specialDietaryCount: 5,
        bufferRate: 0.05,
        bufferQuantity: 25,
        finalDemandCount: 525,
        determinationMethod: 'attendance_based',
        status: 'calculated',
      });

      const order = await cateringDispatchService.dispatchOrder({
        mealDemandId: demand.id,
        vendorName: 'Bếp ăn Hoa Mai',
      });

      const retrieved = await cateringDispatchService.getOrderById(order.id);
      expect(retrieved.id).toBe(order.id);
      expect(retrieved.totalOrderedPortions).toBe(525);
    });

    it('should throw NotFoundException when order ID is not found', async () => {
      await expect(cateringDispatchService.getOrderById(9999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('ReceivingService & HACCP Food Safety Rules (TF-MGR-03 / SCR-MGR-02)', () => {
    let receivingService: ReceivingService;

    beforeEach(() => {
      receivingService = new ReceivingService(operationsRepository);
    });

    it('should record catering vehicle check-in at receiving dock', async () => {
      const order = await operationsRepository.saveCateringOrder({
        mealDemandId: 901,
        vendorName: 'Hà Nội Food Safe',
        totalOrderedPortions: 1260,
        standardPortions: 1242,
        specialDietaryPortions: 18,
      });

      const delivery = await receivingService.checkinVehicle({
        cateringOrderId: order.id,
        vehiclePlate: '29H-882.14',
        driverName: 'Vũ Văn Thắng',
        thermalContainerCount: 42,
        deliveredPortions: 1260,
      });

      expect(delivery.id).toBeDefined();
      expect(delivery.vehiclePlate).toBe('29H-882.14');
      expect(delivery.thermalContainerCount).toBe(42);
      expect(delivery.deliveredPortions).toBe(1260);
      expect(delivery.status).toBe('arrived');
    });

    it('should throw NotFoundException when checking in with non-existent order ID', async () => {
      await expect(
        receivingService.checkinVehicle({
          cateringOrderId: 99999,
          vehiclePlate: '29H-999.99',
          driverName: 'Nguyễn Văn A',
          thermalContainerCount: 10,
          deliveredPortions: 300,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject delivery when core food temperature is below 65.0°C (Decision 1246/QĐ-BYT)', async () => {
      const delivery = await operationsRepository.saveDelivery({
        cateringOrderId: 651,
        vehiclePlate: '29C-123.45',
        driverName: 'Trần Văn B',
        thermalContainerCount: 20,
        deliveredPortions: 600,
      });

      await expect(
        receivingService.inspectDelivery({
          mealDeliveryId: delivery.id,
          coreTemperature: 64.9, // Violates >= 65.0°C
          containerSealsIntact: true,
          sensoryEvalPass: true,
          retentionSampleTaken: true,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should reject delivery when seal is broken, sensory fails, or retention sample is missing', async () => {
      const delivery = await operationsRepository.saveDelivery({
        cateringOrderId: 652,
        vehiclePlate: '29C-456.78',
        driverName: 'Lê Văn C',
        thermalContainerCount: 15,
        deliveredPortions: 450,
      });

      // Temperature is safe (70°C), but seals are broken
      await expect(
        receivingService.inspectDelivery({
          mealDeliveryId: delivery.id,
          coreTemperature: 70.0,
          containerSealsIntact: false,
          sensoryEvalPass: true,
          retentionSampleTaken: true,
        }),
      ).rejects.toThrow(UnprocessableEntityException);

      // Temperature is safe, but 24h sample is missing
      await expect(
        receivingService.inspectDelivery({
          mealDeliveryId: delivery.id,
          coreTemperature: 70.0,
          containerSealsIntact: true,
          sensoryEvalPass: true,
          retentionSampleTaken: false,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should accept delivery when temperature >= 65.0°C and all hygiene protocols pass', async () => {
      const delivery = await operationsRepository.saveDelivery({
        cateringOrderId: 653,
        vehiclePlate: '29H-882.14',
        driverName: 'Vũ Văn Thắng',
        thermalContainerCount: 42,
        deliveredPortions: 1260,
      });

      const inspection = await receivingService.inspectDelivery({
        mealDeliveryId: delivery.id,
        coreTemperature: 71.4,
        containerSealsIntact: true,
        sensoryEvalPass: true,
        retentionSampleTaken: true,
        thermometerPhotoUrl: 'https://storage.primaryschool.edu.vn/temp-check-714.jpg',
        samplePhotoUrl: 'https://storage.primaryschool.edu.vn/sample-jar-box42.jpg',
        notes: 'Cảm quan đạt chuẩn, mùi vị thơm ngon tự nhiên',
      });

      expect(inspection.inspectionResult).toBe('passed');
      expect(inspection.status).toBe('accepted');
      expect(inspection.readyForDistribution).toBe(true);
    });
  });

  describe('DistributionService (TF-MGR-04: Trolley Allocation & Handover)', () => {
    let distributionService: DistributionService;

    beforeEach(() => {
      distributionService = new DistributionService(operationsRepository);
    });

    it('should generate classroom trolley allocation plan after inspection is accepted', async () => {
      const delivery = await operationsRepository.saveDelivery({
        cateringOrderId: 654,
        vehiclePlate: '29H-882.14',
        driverName: 'Vũ Văn Thắng',
        thermalContainerCount: 42,
        deliveredPortions: 1260,
      });

      await operationsRepository.saveInspection({
        mealDeliveryId: delivery.id,
        coreTemperature: 68.5,
        containerSealsIntact: true,
        sensoryEvalPass: true,
        retentionSampleTaken: true,
        inspectionResult: 'passed',
        status: 'accepted',
      });

      const plan = await distributionService.getDistributionPlan(delivery.id);

      expect(plan.deliveryId).toBe(delivery.id);
      expect(plan.totalPortionsToDistribute).toBe(1260);
      expect(plan.classes.length).toBeGreaterThan(0);
      expect(plan.classes[0]).toEqual(
        expect.objectContaining({
          classId: 12,
          className: '2A',
          allocatedPortions: 28,
          specialDietaryPortions: 1,
        }),
      );
    });

    it('should forbid distribution plan if inspection has not passed', async () => {
      const delivery = await operationsRepository.saveDelivery({
        cateringOrderId: 655,
        vehiclePlate: '29H-882.14',
        driverName: 'Vũ Văn Thắng',
        thermalContainerCount: 42,
        deliveredPortions: 1260,
      });

      // No inspection saved yet
      await expect(distributionService.getDistributionPlan(delivery.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should record teacher confirmation for delivered trolley', async () => {
      const delivery = await operationsRepository.saveDelivery({
        cateringOrderId: 656,
        vehiclePlate: '29H-882.14',
        driverName: 'Vũ Văn Thắng',
        thermalContainerCount: 42,
        deliveredPortions: 1260,
      });

      const distribution = await distributionService.confirmDistribution({
        mealDeliveryId: delivery.id,
        classId: 12,
        allocatedPortions: 28,
        specialDietaryPortions: 1,
        receivedByTeacherId: 501,
      });

      expect(distribution.classId).toBe(12);
      expect(distribution.allocatedPortions).toBe(28);
      expect(distribution.specialDietaryPortions).toBe(1);
      expect(distribution.receivedByTeacherId).toBe(501);
      expect(distribution.status).toBe('delivered');
    });
  });

  describe('ReconciliationEngine (TF-MGR-05 / SCR-MGR-03: 3-Way Post-Lunch Audit)', () => {
    let reconciliationEngine: ReconciliationEngine;

    beforeEach(() => {
      reconciliationEngine = new ReconciliationEngine();
    });

    it('should return MATCHED when ordered, delivered, and consumed quantities match perfectly', () => {
      const result = reconciliationEngine.evaluate(1260, 1260, 1260);

      expect(result.varianceType).toBe('MATCHED');
      expect(result.payableCount).toBe(1260);
      expect(result.discrepancyCount).toBe(0);
      expect(result.financialImpactNote).toContain('matched within normal operating bounds');
    });

    it('should reduce payable downward on SHORT_DELIVERED to protect school budget', () => {
      // Ordered 1260, but vendor delivered only 1240
      const result = reconciliationEngine.evaluate(1260, 1240, 1240);

      expect(result.varianceType).toBe('SHORT_DELIVERED');
      expect(result.payableCount).toBe(1240); // Payable = min(1260, 1240)
      expect(result.discrepancyCount).toBe(20);
      expect(result.financialImpactNote).toContain('Payable adjusted downward');
    });

    it('should not pay for unrequested surplus portions on OVER_DELIVERED', () => {
      // Ordered 1260, vendor over-delivered 1290, consumption was 1260
      const result = reconciliationEngine.evaluate(1260, 1290, 1260);

      expect(result.varianceType).toBe('OVER_DELIVERED');
      expect(result.payableCount).toBe(1260); // Vendor not paid for surplus 30 portions
      expect(result.discrepancyCount).toBe(30);
      expect(result.financialImpactNote).toContain('Surplus not included in statutory payable');
    });

    it('should mark LEFTOVER_WASTE when students are absent unexpectedly', () => {
      // Ordered 1260, Delivered 1260, but only 1220 consumed (40 unconsumed)
      const result = reconciliationEngine.evaluate(
        1260,
        1260,
        1220,
        '40 học sinh khối 5 nghỉ đi dã ngoại ngoại khóa đột xuất',
      );

      expect(result.varianceType).toBe('LEFTOVER_WASTE');
      expect(result.payableCount).toBe(1260); // Vendor gets paid for compliant delivery
      expect(result.discrepancyCount).toBe(0);
      expect(result.financialImpactNote).toContain('40 học sinh khối 5 nghỉ đi dã ngoại');
    });

    it('should reject negative values for any reconciliation metrics', () => {
      expect(() => reconciliationEngine.evaluate(-10, 100, 100)).toThrow(
        /cannot be negative values/,
      );
      expect(() => reconciliationEngine.evaluate(100, -5, 100)).toThrow(
        /cannot be negative values/,
      );
      expect(() => reconciliationEngine.evaluate(100, 100, -1)).toThrow(
        /cannot be negative values/,
      );
    });
  });
});
