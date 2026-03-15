import { Module } from '@nestjs/common';
import { PrismaService } from './common/prisma.service';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ItemsModule } from './modules/items/items.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { FinanceModule } from './modules/finance/finance.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ConsolidationModule } from './modules/consolidation/consolidation.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProcurementModule } from './modules/procurement/procurement.module';

@Module({
  imports: [
    AuthModule, JobsModule, ItemsModule, DocumentsModule, TasksModule,
    TrackingModule, ShipmentsModule, WarehouseModule, FinanceModule,
    CommunicationsModule, ComplianceModule, AnalyticsModule,
    ConsolidationModule, ReportingModule,
    OrganizationsModule, // Phase 1 — provides /organizations, /offices, /corridors, /users/expediters
    ProcurementModule, // Phase 2.7 — agent scorecard, lane risk, RFQ
  ],
  controllers: [HealthController],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
