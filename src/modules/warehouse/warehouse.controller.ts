import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WarehouseService } from './warehouse.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Warehouse & Hubs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class WarehouseController {
  constructor(private svc: WarehouseService) {}

  @Get('hubs') @ApiOperation({ summary: 'List all hubs with zones and capacity' })
  hubs() { return this.svc.findAllHubs(); }

  @Get('hubs/:id') @ApiOperation({ summary: 'Hub detail with stock' })
  hub(@Param('id') id: string) { return this.svc.findHub(id); }

  @Get('hubs/:id/capacity') @ApiOperation({ summary: 'Hub capacity breakdown by zone' })
  capacity(@Param('id') id: string) { return this.svc.hubCapacity(id); }

  @Post('hubs/:id/snapshot') @ApiOperation({ summary: 'Take capacity snapshot' })
  snapshot(@Param('id') id: string) { return this.svc.takeCapacitySnapshot(id); }

  @Get('stock') @ApiOperation({ summary: 'Stock items by hub' })
  stock(@Query('hubId') hubId: string) { return this.svc.stockByHub(hubId); }

  @Post('stock/receive') @ApiOperation({ summary: 'Receive stock at hub (POR)' })
  receive(@Body() data) { return this.svc.receiveStock(data); }

  @Post('stock/:id/dispatch') @ApiOperation({ summary: 'Dispatch stock from hub' })
  dispatch(@Param('id') id: string) { return this.svc.dispatchStock(id); }

  @Post('stock/:id/transfer') @ApiOperation({ summary: 'Transfer stock between zones' })
  transfer(@Param('id') id: string, @Body() body: { toZoneId: string }) { return this.svc.transferStock(id, body.toZoneId); }

  @Get('stock/:id/movements') @ApiOperation({ summary: 'Stock movement history' })
  movements(@Param('id') id: string) { return this.svc.stockMovements(id); }

  @Get('queue') @ApiOperation({ summary: 'Get FIFO loading queue' })
  queue(@Query('hubId') hubId: string, @Query('corridorId') corridorId: string) { return this.svc.getQueue(hubId, corridorId); }

  @Post('queue/:id/recalculate') @ApiOperation({ summary: 'Recalculate FIFO priority scores' })
  recalculate(@Param('id') id: string) { return this.svc.recalculateQueue(id); }
}
