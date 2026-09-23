import { Injectable, Logger } from '@nestjs/common';
import { DemandService } from './demand.service';
import { CateringDispatchService, DispatchOrderResponse } from './catering-dispatch.service';
import { OperationsRepository } from '../repositories/operations.repository';

export interface AutoCutoffExecutionResult {
  executionType: 'SCHEDULED_0845' | 'MANUAL_TRIGGER';
  cutoffTime: string;
  timestamp: string;
  confirmedAttendance: number;
  bufferRate: number;
  bufferPortions: number;
  totalPortions: number;
  orderDispatch: DispatchOrderResponse;
}

@Injectable()
export class AutomatedCutoffService {
  private readonly logger = new Logger(AutomatedCutoffService.name);
  private latestExecution: AutoCutoffExecutionResult | null = null;

  constructor(
    private readonly demandService: DemandService,
    private readonly cateringDispatchService: CateringDispatchService,
    private readonly operationsRepository: OperationsRepository,
  ) {
    this.logger.log('AutomatedCutoffService initialized for 08:45 AM statutory cutoff.');
  }

  /**
   * Execute the 08:45 AM cutoff process:
   * 1. Aggregate attendance data
   * 2. Calculate final demand + safety buffer
   * 3. Issue and dispatch electronic PO via API Webhook and Email
   */
  public async executeCutoff(
    executionType: 'SCHEDULED_0845' | 'MANUAL_TRIGGER' = 'MANUAL_TRIGGER',
    customBufferRate?: number,
  ): Promise<AutoCutoffExecutionResult> {
    const bufferRate = customBufferRate !== undefined ? customBufferRate : 0.05;
    this.logger.log(`Executing 08:45 AM Auto-Cutoff workflow [${executionType}], Buffer: ${bufferRate * 100}%`);

    // 1. Calculate demand based on confirmed attendance (statutory 08:45 lock)
    const demandResult = await this.demandService.calculateDemand({
      mealScheduleId: 101,
      bufferRate,
    });

    // 2. Dispatch electronic purchase order to catering partner
    const dispatchResult = await this.cateringDispatchService.dispatchOrder({
      mealDemandId: demandResult.id,
      vendorName: 'Công ty Suất ăn Công nghiệp Hà Nội SunFood',
      targetDeliveryTime: '10:30 AM',
      notes: `${demandResult.specialDietaryCount} suất ăn dị ứng đặc biệt (dán tem cam), thùng giữ nhiệt ≥ 65°C.`,
    });

    const result: AutoCutoffExecutionResult = {
      executionType,
      cutoffTime: '08:45 AM',
      timestamp: new Date().toISOString(),
      confirmedAttendance: demandResult.confirmedAttendance,
      bufferRate: demandResult.bufferRate,
      bufferPortions: demandResult.bufferQuantity,
      totalPortions: demandResult.finalDemandCount,
      orderDispatch: dispatchResult,
    };

    this.latestExecution = result;
    return result;
  }

  public getLatestCutoffResult(): AutoCutoffExecutionResult | null {
    return this.latestExecution;
  }
}
