import { Module } from '@nestjs/common';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [ProcurementController],
  providers: [ProcurementService, PrismaService],
  exports: [ProcurementService],
})
export class ProcurementModule {}
