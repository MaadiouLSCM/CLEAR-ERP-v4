import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Items & Boxes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ItemsController {
  constructor(private svc: ItemsService) {}

  @Get('items')
  @ApiOperation({ summary: 'List items by job' })
  findByJob(@Query('jobId') jobId: string) { return this.svc.findByJob(jobId); }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get item with relations' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post('items')
  @ApiOperation({ summary: 'Create item' })
  create(@Body() data) { return this.svc.create(data); }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update item' })
  update(@Param('id') id: string, @Body() data) { return this.svc.update(id, data); }

  @Post('items/:id/generate-qr')
  @ApiOperation({ summary: 'Generate QR code for item' })
  generateQR(@Param('id') id: string) { return this.svc.generateQR(id); }

  @Post('items/bulk-qr/:jobId')
  @ApiOperation({ summary: 'Generate QR codes for all items in a job' })
  bulkQR(@Param('jobId') jobId: string) { return this.svc.bulkGenerateQR(jobId); }

  @Post('items/:id/assign-box')
  @ApiOperation({ summary: 'Assign item to a box' })
  assignBox(@Param('id') id: string, @Body() body: { boxId: string }) { return this.svc.assignToBox(id, body.boxId); }

  @Get('qr/:code')
  @ApiOperation({ summary: 'Lookup item by QR code scan' })
  lookupQR(@Param('code') code: string) { return this.svc.lookupByQR(code); }

  @Get('boxes')
  @ApiOperation({ summary: 'List boxes by job' })
  findBoxes(@Query('jobId') jobId: string) { return this.svc.findBoxesByJob(jobId); }

  @Post('boxes')
  @ApiOperation({ summary: 'Create box (shipping mark)' })
  createBox(@Body() data) { return this.svc.createBox(data); }

  @Patch('boxes/:id')
  @ApiOperation({ summary: 'Update box' })
  updateBox(@Param('id') id: string, @Body() data) { return this.svc.updateBox(id, data); }
}
