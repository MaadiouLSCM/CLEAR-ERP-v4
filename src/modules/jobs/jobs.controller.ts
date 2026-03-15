import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateJobDto } from './dto/create-job.dto';

@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private jobs: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'List jobs with optional filters' })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query() q) { return this.jobs.findAll(q); }

  @Get('stats/dashboard')
  @ApiOperation({ summary: 'Dashboard KPIs' })
  dashboard() { return this.jobs.dashboard(); }

  @Get(':id')
  @ApiOperation({ summary: 'Get job with full relations' })
  findOne(@Param('id') id: string) { return this.jobs.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Create new job (RFC_RECEIVED)' })
  create(@Body() dto: CreateJobDto, @Req() req) { return this.jobs.create(dto, req.user.userId); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update job fields' })
  update(@Param('id') id: string, @Body() data) { return this.jobs.update(id, data); }

  @Post(':id/transition')
  @ApiOperation({ summary: 'Transition job status (with validation)' })
  transition(@Param('id') id: string, @Body() body: { status: string }, @Req() req) {
    return this.jobs.transition(id, body.status, req.user.userId);
  }
}
