import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ShipmentsService } from './shipments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Shipments & Transport')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ShipmentsController {
  constructor(private svc: ShipmentsService) {}

  @Get('shipments') @ApiOperation({ summary: 'List shipments' })
  findAll(@Query() q) { return this.svc.findAll(q); }

  @Get('shipments/:id') @ApiOperation({ summary: 'Get shipment with legs and events' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post('shipments') @ApiOperation({ summary: 'Create shipment' })
  create(@Body() data) { return this.svc.create(data); }

  @Patch('shipments/:id') @ApiOperation({ summary: 'Update shipment' })
  update(@Param('id') id: string, @Body() data) { return this.svc.update(id, data); }

  @Post('shipments/:id/legs') @ApiOperation({ summary: 'Add transport leg' })
  addLeg(@Param('id') id: string, @Body() data) { return this.svc.addLeg(id, data); }

  @Patch('legs/:id') @ApiOperation({ summary: 'Update transport leg' })
  updateLeg(@Param('id') id: string, @Body() data) { return this.svc.updateLeg(id, data); }

  @Get('corridors') @ApiOperation({ summary: 'List active corridors with schedules' })
  corridors() { return this.svc.corridors(); }

  @Get('corridors/:id/sailings') @ApiOperation({ summary: 'Sailing windows for corridor' })
  sailings(@Param('id') id: string) { return this.svc.sailingSchedule(id); }

  @Get('corridors/:id/flights') @ApiOperation({ summary: 'Flight schedules for corridor' })
  flights(@Param('id') id: string) { return this.svc.flightSchedule(id); }
}
