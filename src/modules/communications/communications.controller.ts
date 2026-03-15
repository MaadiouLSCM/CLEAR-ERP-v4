import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CommunicationsService } from './communications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Communications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CommunicationsController {
  constructor(private svc: CommunicationsService) {}

  @Get('emails') @ApiOperation({ summary: 'List emails' })
  emails(@Query() q) { return this.svc.findEmails(q); }

  @Post('emails') @ApiOperation({ summary: 'Send email' })
  send(@Body() data) { return this.svc.sendEmail(data); }

  @Get('notifications') @ApiOperation({ summary: 'My notifications' })
  notifications(@Req() req, @Query('unreadOnly') unread?: string) { return this.svc.notifications(req.user.userId, unread === 'true'); }

  @Get('notifications/count') @ApiOperation({ summary: 'Unread notification count' })
  unreadCount(@Req() req) { return this.svc.unreadCount(req.user.userId); }

  @Patch('notifications/:id/read') @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@Param('id') id: string) { return this.svc.markRead(id); }

  @Post('notifications/read-all') @ApiOperation({ summary: 'Mark all as read' })
  markAllRead(@Req() req) { return this.svc.markAllRead(req.user.userId); }
}
