import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StudentsModule } from './modules/students/students.module';
import { MenusModule } from './modules/menus/menus.module';
import { OperationsModule } from './modules/operations/operations.module';
import { FinanceModule } from './modules/finance/finance.module';
import { NutritionModule } from './modules/nutrition/nutrition.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { EligibilityModule } from './modules/eligibility/eligibility.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    EligibilityModule,
    MenusModule,
    OperationsModule,
    FinanceModule,
    NutritionModule,
    ReportingModule,
  ],
})
export class AppModule {}
