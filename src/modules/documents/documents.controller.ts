import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private svc: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List documents for a job' })
  findByJob(@Query('jobId') jobId: string) { return this.svc.findByJob(jobId); }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Create document manually' })
  create(@Body() data: any) { return this.svc.create(data); }

  @Post('generate')
  @ApiOperation({ summary: 'Generate document from template (cascade logic)' })
  generate(@Body() body: { jobId: string; docType: string }, @Req() req) {
    return this.svc.generate(body.jobId, body.docType, req.user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document' })
  update(@Param('id') id: string, @Body() data: any) { return this.svc.update(id, data); }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Sign document (digital or upload)' })
  sign(@Param('id') id: string, @Body() body: { signedBy: string; signatureData?: string }) {
    return this.svc.sign(id, body.signedBy, body.signatureData);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify document — mark as ready' })
  verify(@Param('id') id: string, @Req() req) {
    return this.svc.verify(id, req.user.userId);
  }

  @Get('kit-status/:jobId')
  @ApiOperation({ summary: 'Get document kit status for a job' })
  kitStatus(@Param('jobId') jobId: string) { return this.svc.kitStatus(jobId); }

  @Get('jcr-check/:jobId')
  @ApiOperation({ summary: 'Check JCR readiness — all mandatory docs uploaded?' })
  jcrCheck(@Param('jobId') jobId: string) { return this.svc.jcrReadinessCheck(jobId); }
}
