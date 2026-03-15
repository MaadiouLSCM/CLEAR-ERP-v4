import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CopilotService } from './copilot.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Copilot AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('copilot')
export class CopilotController {
  constructor(private svc: CopilotService) {}

  @Post('ask')
  @ApiOperation({ summary: 'Ask Copilot AI a question (context-aware)' })
  ask(@Body() body: { question: string; jobId?: string; module?: string }) {
    return this.svc.ask(body.question, { jobId: body.jobId, module: body.module });
  }

  @Get('status')
  @ApiOperation({ summary: 'Check Copilot AI configuration status' })
  status() { return this.svc.status(); }
}
