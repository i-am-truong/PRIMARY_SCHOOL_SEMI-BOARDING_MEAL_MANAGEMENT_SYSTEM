import { Module } from '@nestjs/common';
import { EligibilityController } from './controllers/eligibility.controller';
import { EligibilityService } from './services/eligibility.service';
import { EligibilityRepository } from './repositories/eligibility.repository';

@Module({
  controllers: [EligibilityController],
  providers: [EligibilityRepository, EligibilityService],
  exports: [EligibilityRepository, EligibilityService],
})
export class EligibilityModule {}
