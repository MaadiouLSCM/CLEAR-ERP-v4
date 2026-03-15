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

  @Get('hr') @ApiOperation({ summary: 'HR dashboard — headcount, utilization, by dept/office' })
  hr() { return this.svc.hrDashboard(); }

  @Get('hr/employees') @ApiOperation({ summary: 'List employees' })
  employees() { return this.svc.listEmployees(); }

  @Get('hr/time-entries') @ApiOperation({ summary: 'Time entries (optionally by job)' })
  timeEntries(@Query('jobRef') jobRef?: string) { return this.svc.timeEntriesByJob(jobRef); }

  @Get('co2') @ApiOperation({ summary: 'CO2 emissions dashboard — GLEC Framework estimates' })
  co2() { return this.svc.co2Dashboard(); }
}
