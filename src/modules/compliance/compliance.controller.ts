import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ComplianceService } from './compliance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Compliance & Certifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('compliance')
export class ComplianceController {
  constructor(private svc: ComplianceService) {}

  @Get('certifications') @ApiOperation({ summary: 'List certifications' })
  certs(@Query() q) { return this.svc.certifications(q); }

  @Get('certifications/expiring') @ApiOperation({ summary: 'Certs expiring within N days' })
  expiring(@Query('days') days: string) { return this.svc.expiringWithin(parseInt(days) || 90); }

  @Get('certifications/:id') @ApiOperation({ summary: 'Cert detail with audits and renewals' })
  certDetail(@Param('id') id: string) { return this.svc.certDetail(id); }

  @Get('renewals/templates') @ApiOperation({ summary: 'Renewal process templates' })
  templates() { return this.svc.renewalTemplates(); }

  @Get('renewals/active') @ApiOperation({ summary: 'Active renewal instances' })
  active() { return this.svc.activeRenewals(); }

  @Get('renewals/:id') @ApiOperation({ summary: 'Renewal instance detail with tasks' })
  renewalDetail(@Param('id') id: string) { return this.svc.renewalDetail(id); }

  @Post('renewals/check') @ApiOperation({ summary: 'Run nightly renewal check (creates instances + tasks)' })
  runCheck() { return this.svc.runRenewalCheck(); }

  @Post('audits') @ApiOperation({ summary: 'Create audit record' })
  createAudit(@Body() data) { return this.svc.createAudit(data); }

  @Post('audits/:id/findings') @ApiOperation({ summary: 'Add finding to audit' })
  addFinding(@Param('id') id: string, @Body() data) { return this.svc.addFinding(id, data); }

  @Get('ncrs') @ApiOperation({ summary: 'List NCRs' })
  @ApiQuery({ name: 'status', required: false }) @ApiQuery({ name: 'severity', required: false }) @ApiQuery({ name: 'jobId', required: false })
  ncrs(@Query() q) { return this.svc.listNCRs(q); }

  @Get('ncrs/:id') @ApiOperation({ summary: 'NCR detail' })
  ncrDetail(@Param('id') id: string) { return this.svc.ncrDetail(id); }

  @Post('ncrs') @ApiOperation({ summary: 'Create NCR' })
  createNCR(@Body() data) { return this.svc.createNCR(data); }

  @Patch('ncrs/:id') @ApiOperation({ summary: 'Update NCR (status, containment, etc.)' })
  updateNCR(@Param('id') id: string, @Body() data) { return this.svc.updateNCR(id, data); }
}
