import { Module } from '@nestjs/common';
import { ConsolidationController } from './consolidation.controller';
import { ConsolidationService } from './consolidation.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [ConsolidationController],
  providers: [ConsolidationService, PrismaService],
  exports: [ConsolidationService],
})
export class ConsolidationModule {}
