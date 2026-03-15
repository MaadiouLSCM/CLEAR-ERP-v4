import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Reporting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportingController {
  constructor(private svc: ReportingService) {}

  @Get('types') @ApiOperation({ summary: 'List all 27 report types' })
  types() { return this.svc.reportTypes(); }

  @Get('dsr') @ApiOperation({ summary: 'Generate Daily Status Report' })
  dsr() { return this.svc.generateDSR(); }

  @Get('wsr') @ApiOperation({ summary: 'Generate Weekly Status Report' })
  wsr() { return this.svc.generateWSR(); }

  @Get('jcr/:jobId') @ApiOperation({ summary: 'Generate Job Completion Report' })
  jcr(@Param('jobId') jobId: string) { return this.svc.generateJCR(jobId); }
}
