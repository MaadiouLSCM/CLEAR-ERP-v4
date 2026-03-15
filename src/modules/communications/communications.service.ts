import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class CommunicationsService {
  constructor(private prisma: PrismaService) {}

  async findEmails(filters: { jobId?: string; channel?: string }) {
    return this.prisma.email.findMany({
      where: { ...(filters.jobId && { jobId: filters.jobId }), ...(filters.channel && { channel: filters.channel }) },
      include: { job: true, sentBy: true },
      orderBy: { sentAt: 'desc' },
    });
  }

  async sendEmail(data: { jobId?: string; sentById?: string; toAddress: string; fromAddress: string; subject: string; body?: string; channel?: string; templateRef?: string }) {
    // TODO: integrate nodemailer for actual SMTP send
    // TODO: template variable substitution from job data
    return this.prisma.email.create({ data: { ...data, channel: data.channel || 'EMAIL', direction: 'OUT', status: 'SENT', sentAt: new Date() } });
  }

  async notifications(userId: string, unreadOnly: boolean = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly && { isRead: false }) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async createNotification(data: { userId: string; type: string; title: string; body?: string; jobRef?: string }) {
    return this.prisma.notification.create({ data });
  }

  async markRead(notificationId: string) {
    return this.prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }
}
