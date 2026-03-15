import { Controller, Get, Post, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PortalController {
  constructor(private svc: PortalService) {}

  // ── Client Portal (P3.1) ──
  @Get('portal/client/:clientId/jobs')
  @ApiOperation({ summary: 'Client portal — jobs list' })
  clientJobs(@Param('clientId') clientId: string) { return this.svc.clientJobs(clientId); }

  @Get('portal/client/:clientId/jobs/:jobId')
  @ApiOperation({ summary: 'Client portal — job detail' })
  clientJobDetail(@Param('clientId') clientId: string, @Param('jobId') jobId: string) { return this.svc.clientJobDetail(jobId, clientId); }

  @Get('portal/client/:clientId/documents')
  @ApiOperation({ summary: 'Client portal — all documents' })
  clientDocs(@Param('clientId') clientId: string) { return this.svc.clientDocuments(clientId); }

  @Get('portal/client/:clientId/dashboard')
  @ApiOperation({ summary: 'Client portal — dashboard KPIs' })
  clientDash(@Param('clientId') clientId: string) { return this.svc.clientDashboard(clientId); }

  // ── Agent Portal (P3.2) ──
  @Get('portal/agent/tasks')
  @ApiOperation({ summary: 'Agent portal — my tasks' })
  @ApiQuery({ name: 'status', required: false })
  agentTasks(@Req() req, @Query('status') status?: string) { return this.svc.agentTasks(req.user.userId, status); }

  @Post('portal/agent/tasks/:taskId/complete')
  @ApiOperation({ summary: 'Agent portal — complete task' })
  agentComplete(@Param('taskId') taskId: string, @Req() req, @Body() body?: { notes?: string }) {
    return this.svc.agentTaskComplete(taskId, req.user.userId, body?.notes);
  }

  @Get('portal/agent/dashboard')
  @ApiOperation({ summary: 'Agent portal — my dashboard' })
  agentDash(@Req() req) { return this.svc.agentDashboard(req.user.userId); }

  // ── Booking & Validation (P3.3) ──
  @Post('portal/booking/:jobId')
  @ApiOperation({ summary: 'Create booking + trigger BOOKING_CONFIRMED transition' })
  createBooking(@Param('jobId') jobId: string, @Body() data: { carrier: string; vesselFlight?: string; bookingRef?: string; etd: string; eta: string; mode: string }) {
    return this.svc.createBooking(jobId, data);
  }

  // ── KPI Visibility (P3.4) ──
  @Get('portal/kpi/by-client')
  @ApiOperation({ summary: 'KPI — performance by client' })
  kpiByClient() { return this.svc.kpiByClient(); }

  @Get('portal/kpi/by-corridor')
  @ApiOperation({ summary: 'KPI — performance by corridor' })
  kpiByCorridor() { return this.svc.kpiByCorridor(); }

  @Get('portal/kpi/sla')
  @ApiOperation({ summary: 'KPI — SLA tracking (active jobs)' })
  sla() { return this.svc.slaTracking(); }
}
