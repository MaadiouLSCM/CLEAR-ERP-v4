import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { WarehouseService } from './warehouse.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Warehouse & FIFO')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class WarehouseController {
  constructor(private svc: WarehouseService) {}

  // ── HUBS ──
  @Get('hubs') @ApiOperation({ summary: 'List all hubs with zones, capacity, stock count' })
  hubs() { return this.svc.findAllHubs(); }

  @Get('hubs/:id') @ApiOperation({ summary: 'Hub detail with active stock and open queues' })
  hub(@Param('id') id: string) { return this.svc.findHub(id); }

  @Get('hubs/:id/capacity') @ApiOperation({ summary: 'Hub capacity breakdown by zone with overdue analysis' })
  capacity(@Param('id') id: string) { return this.svc.hubCapacity(id); }

  @Get('hubs/:id/capacity-history') @ApiOperation({ summary: 'Capacity utilization history (snapshots)' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  capacityHistory(@Param('id') id: string, @Query('days') days?: string) {
    return this.svc.capacityHistory(id, days ? parseInt(days) : 30);
  }

  @Post('hubs/:id/snapshot') @ApiOperation({ summary: 'Take capacity snapshot now' })
  snapshot(@Param('id') id: string) { return this.svc.takeCapacitySnapshot(id); }

  // ── STOCK ──
  @Get('stock') @ApiOperation({ summary: 'Stock items by hub with FIFO score and free-time info' })
  @ApiQuery({ name: 'hubId', required: true }) @ApiQuery({ name: 'status', required: false })
  stock(@Query('hubId') hubId: string, @Query('status') status?: string) {
    return this.svc.stockByHub(hubId, status);
  }

  @Get('stock/summary') @ApiOperation({ summary: 'Stock summary analytics (by status, by client, totals)' })
  @ApiQuery({ name: 'hubId', required: true })
  stockSummary(@Query('hubId') hubId: string) { return this.svc.stockSummary(hubId); }

  @Post('stock/receive') @ApiOperation({ summary: 'Receive stock at hub (POR) — creates item + FIFO score' })
  receive(@Body() data: any) { return this.svc.receiveStock(data); }

  @Post('stock/:id/dispatch') @ApiOperation({ summary: 'Dispatch stock from hub — updates zone + queue' })
  dispatch(@Param('id') id: string, @Body() body: { notes?: string }) {
    return this.svc.dispatchStock(id, body?.notes);
  }

  @Post('stock/:id/transfer') @ApiOperation({ summary: 'Transfer stock between zones within hub' })
  transfer(@Param('id') id: string, @Body() body: { toZoneId: string; reason?: string }) {
    return this.svc.transferStock(id, body.toZoneId, body.reason);
  }

  @Get('stock/:id/movements') @ApiOperation({ summary: 'Stock movement history (in/out/transfer)' })
  movements(@Param('id') id: string) { return this.svc.stockMovements(id); }

  // ── FIFO QUEUE ──
  @Get('queue') @ApiOperation({ summary: 'Get FIFO loading queue(s) for hub/corridor' })
  @ApiQuery({ name: 'hubId', required: true }) @ApiQuery({ name: 'corridorId', required: false })
  queue(@Query('hubId') hubId: string, @Query('corridorId') corridorId?: string) {
    return this.svc.getQueue(hubId, corridorId);
  }

  @Post('queue/:id/add') @ApiOperation({ summary: 'Add stock item to FIFO queue' })
  addToQueue(@Param('id') id: string, @Body() body: { stockItemId: string }) {
    return this.svc.addToQueue(id, body.stockItemId);
  }

  @Post('queue/:id/recalculate') @ApiOperation({ summary: 'Recalculate FIFO priority scores (4-factor 0-1000)' })
  recalculate(@Param('id') id: string) { return this.svc.recalculateQueue(id); }

  @Post('queue/position/:id/override') @ApiOperation({ summary: 'Override FIFO priority (records violation)' })
  override(@Param('id') id: string, @Body() body: { override: string; reason: string; userId: string }) {
    return this.svc.overridePriority(id, body.override, body.reason, body.userId);
  }

  // ── FIFO VIOLATIONS ──
  @Get('fifo-violations') @ApiOperation({ summary: 'List FIFO violations with justification' })
  @ApiQuery({ name: 'hubId', required: false })
  violations(@Query('hubId') hubId?: string) { return this.svc.getFIFOViolations(hubId); }

  // ── NIGHTLY BATCH ──
  @Post('warehouse/nightly-batch') @ApiOperation({ summary: 'Run nightly batch: storage costs + FIFO recalc + snapshots' })
  nightlyBatch() { return this.svc.nightlyBatch(); }
}
