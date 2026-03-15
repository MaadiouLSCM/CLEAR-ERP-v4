import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private svc: DocumentsService) {}

  @Get() @ApiOperation({ summary: 'List documents by job' })
  findByJob(@Query('jobId') jobId: string) { return this.svc.findByJob(jobId); }

  @Get('kit-status/:jobId') @ApiOperation({ summary: 'Check document kit completeness' })
  kitStatus(@Param('jobId') jobId: string) { return this.svc.kitStatus(jobId); }

  @Get('jcr-check/:jobId') @ApiOperation({ summary: 'JCR readiness check (blocks close-out)' })
  jcrCheck(@Param('jobId') jobId: string) { return this.svc.jcrReadinessCheck(jobId); }

  @Get(':id') @ApiOperation({ summary: 'Get document' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post() @ApiOperation({ summary: 'Create document record' })
  create(@Body() data) { return this.svc.create(data); }

  @Patch(':id') @ApiOperation({ summary: 'Update document' })
  update(@Param('id') id: string, @Body() data) { return this.svc.update(id, data); }

  @Post(':id/sign') @ApiOperation({ summary: 'Sign document (touch signature)' })
  sign(@Param('id') id: string, @Body() body: { signedBy: string; signatureData?: string }) {
    return this.svc.sign(id, body.signedBy, body.signatureData);
  }
}
