import { Controller, Get, Post, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Analytics & KPIs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}

  @Get('dashboard') @ApiOperation({ summary: 'Operational dashboard' })
  dashboard() { return this.svc.operationalDashboard(); }

  @Get('kpis') @ApiOperation({ summary: 'All governance KPIs with latest values' })
  kpis() { return this.svc.governanceKPIs(); }

  @Post('kpis/calculate') @ApiOperation({ summary: 'Calculate all KPIs from live data' })
  calculate() { return this.svc.calculateKPIs(); }

  @Get('alerts') @ApiOperation({ summary: 'Active governance alerts' })
  alerts(@Query('all') all?: string) { return this.svc.alerts(all === 'true'); }

  @Post('alerts/:id/acknowledge') @ApiOperation({ summary: 'Acknowledge alert' })
  acknowledge(@Param('id') id: string, @Req() req) { return this.svc.acknowledgeAlert(id, req.user.userId); }
}
