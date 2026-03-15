import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProcurementService } from './procurement.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Procurement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('procurement')
export class ProcurementController {
  constructor(private svc: ProcurementService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Procurement dashboard — spend, agents, certs' })
  dashboard() { return this.svc.dashboard(); }

  @Get('scorecards')
  @ApiOperation({ summary: 'Agent scorecards (0-100) — all agents or filtered' })
  @ApiQuery({ name: 'agentName', required: false })
  scorecards(@Query('agentName') agentName?: string) { return this.svc.agentScorecard(agentName); }

  @Get('lane-risk')
  @ApiOperation({ summary: 'Lane risk assessment per corridor' })
  @ApiQuery({ name: 'corridorId', required: false })
  laneRisk(@Query('corridorId') corridorId?: string) { return this.svc.laneRisk(corridorId); }

  @Get('comparison/:corridorId')
  @ApiOperation({ summary: 'Agent comparison for a specific corridor' })
  comparison(@Param('corridorId') corridorId: string) { return this.svc.agentComparison(corridorId); }
}
