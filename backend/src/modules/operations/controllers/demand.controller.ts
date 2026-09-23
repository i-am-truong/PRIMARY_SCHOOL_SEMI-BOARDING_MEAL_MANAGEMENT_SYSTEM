import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Role, Roles } from '../../../common/decorators/roles.decorator';
import { DemandService, DemandCalculationResponse } from '../services/demand.service';
import { CateringDispatchService, DispatchOrderResponse } from '../services/catering-dispatch.service';
import { AutomatedCutoffService, AutoCutoffExecutionResult } from '../services/automated-cutoff.service';
import { CalculateDemandDto } from '../dto/calculate-demand.dto';
import { DispatchOrderDto } from '../dto/dispatch-order.dto';

export class TriggerCutoffDto {
  bufferRate?: number;
}

@ApiTags('Operations - Demand & Procurement (Domain 3)')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('demands')
export class DemandController {
  constructor(
    private readonly demandService: DemandService,
    private readonly cateringDispatchService: CateringDispatchService,
    private readonly automatedCutoffService: AutomatedCutoffService,
  ) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.MGR, Role.ADM)
  @ApiOperation({
    summary: 'Aggregate Lunch Demand & Calculate Safety Buffer (08:45 AM Cutoff)',
    description:
      'Aggregates confirmed class attendees and applies safety buffer margin (0% - 10%). Enforces statutory 08:45 AM cutoff.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Demand calculation succeeded with breakdown of dietary requirements.',
  })
  public async calculateDemand(
    @Body() dto: CalculateDemandDto,
  ): Promise<{ success: boolean; data: DemandCalculationResponse; metadata: { timestamp: string } }> {
    const data = await this.demandService.calculateDemand(dto);
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('dispatch-order')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.MGR, Role.ADM)
  @ApiOperation({
    summary: 'Dispatch Purchase Order to External Catering Vendor (08:45 AM Cutoff)',
    description:
      'Generates formal purchase order record and transmits payload electronically via API & Email to catering vendor partner.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'PO generated and dispatched to vendor.',
  })
  public async dispatchOrder(
    @Body() dto: DispatchOrderDto,
  ): Promise<{ success: boolean; data: DispatchOrderResponse; metadata: { timestamp: string } }> {
    const data = await this.cateringDispatchService.dispatchOrder(dto);
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('auto-cutoff-trigger')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.MGR, Role.ADM)
  @ApiOperation({
    summary: 'Execute 08:45 AM Cutoff & Auto-Dispatch Electronic PO',
    description:
      'Immediately triggers the 08:45 AM automated aggregation, buffer calculation, and electronic PO dispatch to catering vendor via API and Email.',
  })
  public async triggerAutoCutoff(
    @Body() body?: TriggerCutoffDto,
  ): Promise<{ success: boolean; data: AutoCutoffExecutionResult; metadata: { timestamp: string } }> {
    const data = await this.automatedCutoffService.executeCutoff(
      'MANUAL_TRIGGER',
      body?.bufferRate,
    );
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('latest-po')
  @Roles(Role.MGR, Role.ADM)
  @ApiOperation({
    summary: 'Get Latest Dispatched Electronic PO with Technical Receipts',
    description:
      'Retrieves the most recent purchase order, including API webhook ack receipt and email transmission logs.',
  })
  public async getLatestDispatchedPO(): Promise<{
    success: boolean;
    data: AutoCutoffExecutionResult | null;
  }> {
    const data = this.automatedCutoffService.getLatestCutoffResult();
    return {
      success: true,
      data,
    };
  }
}
