import { Module } from '@nestjs/common';
import { DemandController } from './controllers/demand.controller';
import { OperationsController } from './controllers/operations.controller';
import { DemandService } from './services/demand.service';
import { BufferEngine } from './services/buffer.engine';
import { CateringDispatchService } from './services/catering-dispatch.service';
import { AutomatedCutoffService } from './services/automated-cutoff.service';
import { ReceivingService } from './services/receiving.service';
import { DistributionService } from './services/distribution.service';
import { ReconciliationEngine } from './services/reconciliation.engine';
import { OperationsRepository } from './repositories/operations.repository';

@Module({
  controllers: [DemandController, OperationsController],
  providers: [
    BufferEngine,
    ReconciliationEngine,
    OperationsRepository,
    DemandService,
    CateringDispatchService,
    AutomatedCutoffService,
    ReceivingService,
    DistributionService,
  ],
  exports: [
    BufferEngine,
    ReconciliationEngine,
    OperationsRepository,
    DemandService,
    CateringDispatchService,
    AutomatedCutoffService,
    ReceivingService,
    DistributionService,
  ],
})
export class OperationsModule {}
