import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

const REPORT_TYPES = [
  { code: 'DSR', name: 'Daily Status Report', category: 'Operations', frequency: 'DAILY' },
  { code: 'WSR', name: 'Weekly Status Report', category: 'Operations', frequency: 'WEEKLY' },
  { code: 'MSR', name: 'Monthly Status Report', category: 'Operations', frequency: 'MONTHLY' },
  { code: 'JCR', name: 'Job Completion Report', category: 'Operations', frequency: 'PER_JOB' },
  { code: 'PL', name: 'P&L Report', category: 'Finance', frequency: 'MONTHLY' },
  { code: 'CF', name: 'Cash Flow Report', category: 'Finance', frequency: 'MONTHLY' },
  { code: 'AR', name: 'AR Aging Report', category: 'Finance', frequency: 'WEEKLY' },
  { code: 'AP', name: 'AP Aging Report', category: 'Finance', frequency: 'WEEKLY' },
  { code: 'JCS', name: 'Job Cost Summary', category: 'Finance', frequency: 'PER_JOB' },
  { code: 'BVA', name: 'Budget Variance Analysis', category: 'Finance', frequency: 'MONTHLY' },
  { code: 'KPI', name: 'KPI Scorecard', category: 'KPIs', frequency: 'MONTHLY' },
  { code: 'CKS', name: 'Client KPI Scorecard', category: 'KPIs', frequency: 'MONTHLY' },
  { code: 'TRD', name: 'Trend Report', category: 'KPIs', frequency: 'WEEKLY' },
  { code: 'GOV', name: 'Governance Dashboard', category: 'KPIs', frequency: 'MONTHLY' },
  { code: 'CMP', name: 'Compliance Status Report', category: 'Compliance', frequency: 'MONTHLY' },
  { code: 'AUD', name: 'Audit Summary', category: 'Compliance', frequency: 'QUARTERLY' },
  { code: 'NCR', name: 'NCR Report', category: 'Compliance', frequency: 'MONTHLY' },
  { code: 'REN', name: 'Renewal Status Report', category: 'Compliance', frequency: 'MONTHLY' },
  { code: 'SOH', name: 'Stock on Hand Report', category: 'Warehouse', frequency: 'DAILY' },
  { code: 'FIFO', name: 'FIFO Queue Report', category: 'Warehouse', frequency: 'DAILY' },
  { code: 'CAP', name: 'Capacity Report', category: 'Warehouse', frequency: 'WEEKLY' },
  { code: 'EXE', name: 'Executive Summary', category: 'Executive', frequency: 'WEEKLY' },
  { code: 'CEO', name: 'CEO Dashboard Report', category: 'Executive', frequency: 'MONTHLY' },
  { code: 'PIPE', name: 'Pipeline Report', category: 'Commercial', frequency: 'WEEKLY' },
  { code: 'CLT', name: 'Client Performance Report', category: 'Commercial', frequency: 'MONTHLY' },
  { code: 'AGT', name: 'Agent Performance Report', category: 'Procurement', frequency: 'MONTHLY' },
  { code: 'COR', name: 'Corridor Analysis Report', category: 'Operations', frequency: 'MONTHLY' },
];

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaService) {}

  reportTypes() { return REPORT_TYPES; }

  async generateDSR() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [activeJobs, events, tasksOverdue, stockAlerts] = await Promise.all([
      this.prisma.job.findMany({ where: { status: { notIn: ['CLOSED', 'ABORTED'] } }, include: { client: true, expediter: true }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.trackingEvent.findMany({ where: { timestamp: { gte: today } }, include: { job: true }, orderBy: { timestamp: 'desc' } }),
      this.prisma.task.count({ where: { status: { in: ['TODO', 'IN_PROGRESS'] }, dueDate: { lt: new Date() } } }),
      this.prisma.hub.findMany({ where: { status: 'ACTIVE' }, include: { zones: true } }),
    ]);
    const hubCapacity = stockAlerts.map(h => {
      const total = h.zones.reduce((s, z) => s + z.capacityCbm, 0);
      const occupied = h.zones.reduce((s, z) => s + z.currentOccupancyCbm, 0);
      return { hub: h.code, utilization: total > 0 ? Math.round((occupied / total) * 100) : 0 };
    });
    return {
      reportType: 'DSR', date: new Date().toISOString().split('T')[0],
      activeJobs: activeJobs.length, todayEvents: events.length, overdueTasksCount: tasksOverdue, hubCapacity,
      jobs: activeJobs.map(j => ({ ref: j.ref, client: j.client.name, status: j.status, expediter: j.expediter?.name })),
      events: events.slice(0, 20).map(e => ({ job: e.job.ref, event: e.eventType, description: e.description, time: e.timestamp })),
    };
  }

  async generateWSR() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const [delivered, inTransit, pending, newJobs] = await Promise.all([
      this.prisma.job.count({ where: { status: 'DELIVERED', actualDelivery: { gte: weekAgo } } }),
      this.prisma.job.count({ where: { status: 'IN_TRANSIT' } }),
      this.prisma.job.count({ where: { status: { in: ['DOCS_PENDING', 'GL_SUBMITTED', 'CUSTOMS_HOLD'] } } }),
      this.prisma.job.count({ where: { createdAt: { gte: weekAgo } } }),
    ]);
    return { reportType: 'WSR', period: `${weekAgo.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`, delivered, inTransit, pending, newJobs };
  }
}
