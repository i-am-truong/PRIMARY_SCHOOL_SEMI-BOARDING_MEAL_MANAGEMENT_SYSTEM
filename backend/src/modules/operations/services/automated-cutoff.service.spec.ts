import { NotFoundException } from '@nestjs/common';
import { AutomatedCutoffService, AutoCutoffExecutionResult } from './automated-cutoff.service';
import { DemandService } from './demand.service';
import { CateringDispatchService, DispatchOrderResponse } from './catering-dispatch.service';
import { BufferEngine } from './buffer.engine';
import { OperationsRepository } from '../repositories/operations.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';

describe('AutomatedCutoffService & Catering Electronic PO Dispatch (08:45 AM Cutoff) - Unit Tests', () => {
  let operationsRepository: OperationsRepository;
  let bufferEngine: BufferEngine;
  let demandService: DemandService;
  let cateringDispatchService: CateringDispatchService;
  let automatedCutoffService: AutomatedCutoffService;

  beforeEach(() => {
    // Isolated in-memory repository for deterministic behavioral claims
    const prismaServiceMock = {
      vendorOrder: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;

    operationsRepository = new OperationsRepository(prismaServiceMock);
    bufferEngine = new BufferEngine();
    demandService = new DemandService(bufferEngine, operationsRepository);
    cateringDispatchService = new CateringDispatchService(operationsRepository);
    automatedCutoffService = new AutomatedCutoffService(
      demandService,
      cateringDispatchService,
      operationsRepository,
    );
  });

  describe('Automated 08:45 AM Cutoff Calculation & Workflow Execution', () => {
    it('executes cutoff workflow, calculates safety buffer, and dispatches electronic PO with statutory 08:45 timestamp', async () => {
      // Act: Trigger 08:45 automated cutoff workflow with standard 5% buffer rate
      // 1200 confirmed attendees * 5% = 60 buffer -> 1260 total portions
      // 18 special dietary portions -> 1242 standard portions
      const result: AutoCutoffExecutionResult = await automatedCutoffService.executeCutoff(
        'SCHEDULED_0845',
        0.05,
      );

      // Assert: Verify cutoff metadata & portion arithmetic
      expect(result.executionType).toBe('SCHEDULED_0845');
      expect(result.cutoffTime).toBe('08:45 AM');
      expect(result.confirmedAttendance).toBe(1200);
      expect(result.bufferRate).toBe(0.05);
      expect(result.bufferPortions).toBe(60);
      expect(result.totalPortions).toBe(1260);

      // Assert: Verify order dispatch payload
      const order = result.orderDispatch;
      expect(order.totalOrderedPortions).toBe(1260);
      expect(order.standardPortions).toBe(1242);
      expect(order.specialDietaryPortions).toBe(18);
      expect(order.targetDeliveryTime).toBe('10:30 AM');
      expect(order.orderCode).toMatch(/^PO-\d{8}-\d{2}$/);
      expect(order.vendorAcknowledged).toBe(true);
      expect(order.vendorTrackingRef).toMatch(/^SF-VN-\d{5}$/);
    });

    it('supports custom coordinator buffer rate (e.g. 8%) and adjusts order portions accordingly', async () => {
      // Act: 1200 * 0.08 = 96 buffer portions -> 1296 total
      const result = await automatedCutoffService.executeCutoff('MANUAL_TRIGGER', 0.08);

      // Assert
      expect(result.executionType).toBe('MANUAL_TRIGGER');
      expect(result.bufferRate).toBe(0.08);
      expect(result.bufferPortions).toBe(96);
      expect(result.totalPortions).toBe(1296);
      expect(result.orderDispatch.totalOrderedPortions).toBe(1296);
      expect(result.orderDispatch.standardPortions).toBe(1278); // 1296 - 18
    });

    it('caches and retrieves the latest execution record for coordinator dashboard audit inquiry', async () => {
      // Pre-condition: Initially null
      expect(automatedCutoffService.getLatestCutoffResult()).toBeNull();

      // Act
      const executed = await automatedCutoffService.executeCutoff('MANUAL_TRIGGER');
      const latest = automatedCutoffService.getLatestCutoffResult();

      // Assert
      expect(latest).not.toBeNull();
      expect(latest?.orderDispatch.orderCode).toBe(executed.orderDispatch.orderCode);
      expect(latest?.orderDispatch.vendorTrackingRef).toBe(executed.orderDispatch.vendorTrackingRef);
    });
  });

  describe('Dual-Channel Electronic PO Dispatch (Channel 1: Webhook API + Channel 2: Email PO)', () => {
    it('generates valid HTTP 200 Webhook API dispatch receipt with structured payload', async () => {
      // Arrange
      const result = await automatedCutoffService.executeCutoff('SCHEDULED_0845', 0.05);
      const apiReceipt = result.orderDispatch.apiReceipt;

      // Assert Channel 1: Webhook API
      expect(apiReceipt).toBeDefined();
      expect(apiReceipt.httpStatus).toBe(200);
      expect(apiReceipt.acknowledged).toBe(true);
      expect(apiReceipt.endpoint).toBe('https://api.vincatering.vn/v2/purchase-orders/webhook');
      expect(apiReceipt.trackingRef).toMatch(/^SF-VN-\d{5}$/);

      // Verify dispatched JSON payload structure
      const payload = apiReceipt.dispatchedPayload;
      expect(payload.orderCode).toBe(result.orderDispatch.orderCode);
      expect(payload.totalOrderedPortions).toBe(1260);
      expect(payload.standardPortions).toBe(1242);
      expect(payload.specialDietaryPortions).toBe(18);
      expect(payload.targetDeliveryTime).toBe('10:30 AM');
      expect(payload.vendorCode).toBe('VEND-SUNFOOD-01');
      expect(payload.dispatchedTimestamp).toBeDefined();
    });

    it('generates formal Email PO dispatch receipt with required catering recipient, subject, and HTML order table', async () => {
      // Arrange
      const result = await automatedCutoffService.executeCutoff('SCHEDULED_0845', 0.05);
      const emailReceipt = result.orderDispatch.emailReceipt;

      // Assert Channel 2: Email Transmission
      expect(emailReceipt).toBeDefined();
      expect(emailReceipt.status).toBe('SENT');
      expect(emailReceipt.to).toBe('orders@vincatering.vn');
      expect(emailReceipt.cc).toContain('dieu-hanh-bep@vincatering.vn');
      expect(emailReceipt.cc).toContain('ban-tru@tieuhoc.edu.vn');
      expect(emailReceipt.subject).toContain(result.orderDispatch.orderCode);
      expect(emailReceipt.subject).toContain('Giao 10:30 AM');

      // Assert HTML body content formatting
      expect(emailReceipt.htmlContent).toContain('LỆNH ĐẶT HÀNG SUẤT ĂN BÁN TRÚ ĐIỆN TỬ (PO)');
      expect(emailReceipt.htmlContent).toContain('08:45 AM');
      expect(emailReceipt.htmlContent).toContain('1260 suất');
      expect(emailReceipt.htmlContent).toContain('18 suất');
      expect(emailReceipt.htmlContent).toContain('Trước 10:30 AM');
    });

    it('throws NotFoundException when dispatching for an invalid meal demand ID', async () => {
      await expect(
        cateringDispatchService.dispatchOrder({
          mealDemandId: 99999,
          vendorName: 'Nhà cung cấp không tồn tại',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
