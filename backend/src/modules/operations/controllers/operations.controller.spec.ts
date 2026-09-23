import { Test, TestingModule } from '@nestjs/testing';
import { DemandController } from './demand.controller';
import { OperationsController } from './operations.controller';
import { DemandService } from '../services/demand.service';
import { BufferEngine } from '../services/buffer.engine';
import { CateringDispatchService } from '../services/catering-dispatch.service';
import { ReceivingService } from '../services/receiving.service';
import { DistributionService } from '../services/distribution.service';
import { ReconciliationEngine } from '../services/reconciliation.engine';
import { OperationsRepository } from '../repositories/operations.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';

import { AutomatedCutoffService } from '../services/automated-cutoff.service';

describe('Semi-Boarding Management (MGR) Controllers - Unit Tests', () => {
  let demandController: DemandController;
  let operationsController: OperationsController;
  let operationsRepository: OperationsRepository;

  beforeEach(async () => {
    const prismaServiceMock = {
      vendorOrder: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemandController, OperationsController],
      providers: [
        BufferEngine,
        ReconciliationEngine,
        {
          provide: OperationsRepository,
          useValue: new OperationsRepository(prismaServiceMock),
        },
        DemandService,
        CateringDispatchService,
        AutomatedCutoffService,
        ReceivingService,
        DistributionService,
      ],
    }).compile();

    demandController = module.get<DemandController>(DemandController);
    operationsController = module.get<OperationsController>(OperationsController);
    operationsRepository = module.get<OperationsRepository>(OperationsRepository);
  });

  describe('DemandController (POST /demands/calculate)', () => {
    it('should return wrapped demand calculation with metadata timestamp', async () => {
      const response = await demandController.calculateDemand({
        mealScheduleId: 10,
        bufferRate: 0.05,
      });

      expect(response.success).toBe(true);
      expect(response.metadata).toHaveProperty('timestamp');
      expect(response.data.confirmedAttendance).toBe(1200);
      expect(response.data.bufferQuantity).toBe(60);
      expect(response.data.finalDemandCount).toBe(1260);
      expect(response.data.dishBreakdown.length).toBe(3);
    });

    it('should return wrapped purchase order dispatch with vendor confirmation', async () => {
      const demand = await operationsRepository.saveDemand({
        mealScheduleId: 20,
        mealDate: '2026-09-21',
        confirmedAttendance: 1000,
        specialDietaryCount: 10,
        bufferRate: 0.05,
        bufferQuantity: 50,
        finalDemandCount: 1050,
        determinationMethod: 'attendance_based',
        status: 'calculated',
      });

      const response = await demandController.dispatchOrder({
        mealDemandId: demand.id,
        vendorName: 'Công ty Suất ăn An Toàn',
        targetDeliveryTime: '10:30',
        notes: 'Chở bằng xe chuyên dụng giữ nhiệt',
      });

      expect(response.success).toBe(true);
      expect(response.metadata).toHaveProperty('timestamp');
      expect(response.data.totalOrderedPortions).toBe(1050);
      expect(response.data.vendorAcknowledged).toBe(true);
      expect(response.data.vendorTrackingRef).toMatch(/^SF-VN-/);
    });

    it('POST /demands/auto-cutoff-trigger triggers 08:45 AM cutoff and returns electronic PO result', async () => {
      const response = await demandController.triggerAutoCutoff({ bufferRate: 0.05 });

      expect(response.success).toBe(true);
      expect(response.metadata).toHaveProperty('timestamp');
      expect(response.data.cutoffTime).toBe('08:45 AM');
      expect(response.data.totalPortions).toBe(1260);
      expect(response.data.orderDispatch.orderCode).toMatch(/^PO-/);
      expect(response.data.orderDispatch.vendorAcknowledged).toBe(true);
      expect(response.data.orderDispatch.apiReceipt.httpStatus).toBe(200);
      expect(response.data.orderDispatch.emailReceipt.status).toBe('SENT');
    });

    it('GET /demands/latest-po retrieves the most recent electronic PO dispatch receipt', async () => {
      // Trigger execution first
      await demandController.triggerAutoCutoff({ bufferRate: 0.05 });

      const response = await demandController.getLatestDispatchedPO();
      expect(response.success).toBe(true);
      expect(response.data).not.toBeNull();
      expect(response.data?.orderDispatch.orderCode).toMatch(/^PO-/);
      expect(response.data?.orderDispatch.apiReceipt.trackingRef).toMatch(/^SF-VN-/);
    });
  });

  describe('OperationsController (Receiving, Distribution, Reconciliation)', () => {
    it('should record dock checkin and return wrapped delivery record', async () => {
      const order = await operationsRepository.saveCateringOrder({
        mealDemandId: 30,
        vendorName: 'Catering ABC',
        totalOrderedPortions: 1260,
        standardPortions: 1242,
        specialDietaryPortions: 18,
      });

      const response = await operationsController.checkinVehicle({
        cateringOrderId: order.id,
        vehiclePlate: '29H-882.14',
        driverName: 'Nguyễn Văn Nam',
        thermalContainerCount: 42,
        deliveredPortions: 1260,
      });

      expect(response.success).toBe(true);
      expect(response.data.vehiclePlate).toBe('29H-882.14');
      expect(response.data.thermalContainerCount).toBe(42);
      expect(response.data.status).toBe('arrived');
    });

    it('should inspect delivery and return accepted inspection with readyForDistribution', async () => {
      const delivery = await operationsRepository.saveDelivery({
        cateringOrderId: 40,
        vehiclePlate: '29H-882.14',
        driverName: 'Nguyễn Văn Nam',
        thermalContainerCount: 42,
        deliveredPortions: 1260,
      });

      const response = await operationsController.inspectDelivery({
        mealDeliveryId: delivery.id,
        coreTemperature: 72.0,
        containerSealsIntact: true,
        sensoryEvalPass: true,
        retentionSampleTaken: true,
        thermometerPhotoUrl: 'https://cdn.school.vn/img/temp-72.jpg',
        samplePhotoUrl: 'https://cdn.school.vn/img/sample-24h.jpg',
        notes: 'Đầy đủ niêm phong và đạt nhiệt độ',
      });

      expect(response.success).toBe(true);
      expect(response.data.inspectionResult).toBe('passed');
      expect(response.data.status).toBe('accepted');
      expect(response.data.readyForDistribution).toBe(true);
    });

    it('should calculate 3-way reconciliation and save reconciliation record', async () => {
      const order = await operationsRepository.saveCateringOrder({
        mealDemandId: 50,
        vendorName: 'Catering ABC',
        totalOrderedPortions: 1260,
        standardPortions: 1242,
        specialDietaryPortions: 18,
      });

      const response = await operationsController.calculateReconciliation({
        cateringOrderId: order.id,
        mealDate: '2026-09-21',
        actualConsumedCount: 1240, // 20 portions less delivered & consumed
        discrepancyReason: 'Thiếu 20 suất do lớp 3C nghỉ học đột xuất',
      });

      expect(response.success).toBe(true);
      expect(response.data.orderedCount).toBe(1260);
      expect(response.data.deliveredCount).toBe(1260);
      expect(response.data.consumedCount).toBe(1240);
      expect(response.data.varianceType).toBe('LEFTOVER_WASTE');
      expect(response.data.payableCount).toBe(1260);
    });
  });
});
