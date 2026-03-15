import { Module } from '@nestjs/common';
import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [WarehouseController],
  providers: [WarehouseService, PrismaService],
  exports: [WarehouseService],
})
export class WarehouseModule {}
