import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CommunicationsService } from './communications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Communications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CommunicationsController {
  constructor(private svc: CommunicationsService) {}

  @Get('emails')
  @ApiOperation({ summary: 'List emails with filters' })
  @ApiQuery({ name: 'jobId', required: false }) @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'status', required: false }) @ApiQuery({ name: 'page', required: false })
  emails(@Query() q) { return this.svc.findEmails(q); }

  @Post('emails')
  @ApiOperation({ summary: 'Send manual email' })
  send(@Body() data, @Req() req) { return this.svc.sendEmail({ ...data, sentById: req.user.userId }); }

  @Post('emails/retry-failed')
  @ApiOperation({ summary: 'Retry all failed emails' })
  retryFailed() { return this.svc.retryFailed(); }

  @Post('communications/trigger/:jobId')
  @ApiOperation({ summary: 'Trigger comms for a status transition' })
  trigger(@Param('jobId') jobId: string, @Body() data: { status: string; extraVars?: Record<string, string> }, @Req() req) {
    return this.svc.onStatusTransition(jobId, data.status, req.user.userId, data.extraVars);
  }

  @Post('communications/send-operational')
  @ApiOperation({ summary: 'Send operational template (DSR, WSR, RFQ, payment reminder)' })
  sendOp(@Body() data: { templateKey: string; jobId: string; extraVars?: Record<string, string> }, @Req() req) {
    return this.svc.sendOperational(data.templateKey, data.jobId, req.user.userId, data.extraVars);
  }

  @Get('communications/templates')
  @ApiOperation({ summary: 'List all 55+ templates' })
  templates() { return this.svc.getTemplates(); }

  @Get('communications/dashboard')
  @ApiOperation({ summary: 'Communications dashboard stats' })
  dashboard() { return this.svc.getDashboard(); }

  @Get('notifications')
  @ApiOperation({ summary: 'My notifications' })
  notifications(@Req() req, @Query('unreadOnly') unread?: string) { return this.svc.notifications(req.user.userId, unread === 'true'); }

  @Get('notifications/count')
  @ApiOperation({ summary: 'Unread count' })
  unreadCount(@Req() req) { return this.svc.unreadCount(req.user.userId); }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification read' })
  markRead(@Param('id') id: string) { return this.svc.markRead(id); }

  @Post('notifications/read-all')
  @ApiOperation({ summary: 'Mark all read' })
  markAllRead(@Req() req) { return this.svc.markAllRead(req.user.userId); }
}
