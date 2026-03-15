import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConsolidationService } from './consolidation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Consolidation Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('consolidation')
export class ConsolidationController {
  constructor(private svc: ConsolidationService) {}

  @Get('requests') @ApiOperation({ summary: 'Pending consolidation requests' })
  pending(@Query('corridorId') corridorId?: string) { return this.svc.pendingRequests(corridorId); }

  @Post('requests') @ApiOperation({ summary: 'Create consolidation request' })
  create(@Body() data) { return this.svc.createRequest(data); }

  @Post('recommend') @ApiOperation({ summary: 'Generate 3-level recommendations for corridor' })
  recommend(@Body() body: { corridorId: string; mode: string }) { return this.svc.generateRecommendations(body.corridorId, body.mode); }

  @Get('recommendations') @ApiOperation({ summary: 'Active (non-expired) recommendations' })
  active() { return this.svc.activeRecommendations(); }

  @Post('recommendations/:id/accept') @ApiOperation({ summary: 'Accept recommendation' })
  accept(@Param('id') id: string) { return this.svc.acceptRecommendation(id); }

  @Post('recommendations/:id/reject') @ApiOperation({ summary: 'Reject recommendation' })
  reject(@Param('id') id: string, @Body() body?: { reason?: string }) { return this.svc.rejectRecommendation(id, body?.reason); }
}
