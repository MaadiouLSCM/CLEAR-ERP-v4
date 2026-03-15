import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tracking')
export class TrackingController {
  constructor(private svc: TrackingService) {}

  @Get('timeline/:jobId') @ApiOperation({ summary: 'Full event timeline for a job' })
  timeline(@Param('jobId') jobId: string) { return this.svc.timeline(jobId); }

  @Get('shipment/:shipmentId') @ApiOperation({ summary: 'Events for a shipment' })
  shipment(@Param('shipmentId') id: string) { return this.svc.shipmentTracking(id); }

  @Get('latest/:jobId') @ApiOperation({ summary: 'Latest event for a job' })
  latest(@Param('jobId') jobId: string) { return this.svc.latestByJob(jobId); }

  @Post('events') @ApiOperation({ summary: 'Create tracking event' })
  create(@Body() data) { return this.svc.createEvent(data); }

  @Post('photos') @ApiOperation({ summary: 'Add photo to event' })
  addPhoto(@Body() data) { return this.svc.addPhoto(data); }
}
