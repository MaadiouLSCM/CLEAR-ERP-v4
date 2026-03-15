import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [ComplianceController],
  providers: [ComplianceService, PrismaService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
