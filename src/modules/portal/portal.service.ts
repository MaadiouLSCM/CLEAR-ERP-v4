import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

// ══════════════════════════════════════════════════════════════
// CLEAR ERP v7 — Phase 3: Client Portal + Agent Portal + KPI
// Read-only client views, agent task management, KPI dashboards
// ══════════════════════════════════════════════════════════════

@Injectable()
export class PortalService {
  constructor(private prisma: PrismaService) {}

  // ── P3.1: Client Portal — jobs filtered by client org ──
  async clientJobs(clientId: string) {
    return this.prisma.job.findMany({
      where: { clientId },
      include: { corridor: true, expediter: true, documents: true, shipments: { take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async clientJobDetail(jobId: string, clientId: string) {
    return this.prisma.job.findFirst({
      where: { id: jobId, clientId },
      include: {
        corridor: true, expediter: true,
        items: true, documents: true,
        trackingEvents: { orderBy: { timestamp: 'desc' }, take: 30 },
        shipments: true,
        invoicesLSCM: true,
      },
    });
  }

  async clientDocuments(clientId: string) {
    return this.prisma.document.findMany({
      where: { job: { clientId } },
      include: { job: { select: { ref: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async clientDashboard(clientId: string) {
    const jobs = await this.prisma.job.findMany({ where: { clientId } });
    const byStatus: Record<string, number> = {};
    jobs.forEach(j => { byStatus[j.status] = (byStatus[j.status] || 0) + 1; });
    const active = jobs.filter(j => !['CLOSED', 'ABORTED'].includes(j.status)).length;
    const inTransit = jobs.filter(j => j.status === 'IN_TRANSIT').length;
    const delivered = jobs.filter(j => j.status === 'DELIVERED' || j.status === 'CLOSED').length;
    const totalValue = jobs.reduce((s, j) => s + (j.declaredValue || 0), 0);
    return { totalJobs: jobs.length, active, inTransit, delivered, totalValue, byStatus };
  }

  // ── P3.2: Agent Portal — tasks by user, validation, photo ──
  async agentTasks(userId: string, status?: string) {
    return this.prisma.task.findMany({
      where: { assigneeId: userId, ...(status && { status: status as any }) },
      include: { job: { include: { client: true, corridor: true } } },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });
  }

  async agentTaskComplete(taskId: string, userId: string, notes?: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.assigneeId !== userId) throw new Error('Task not found or not assigned to you');
    return this.prisma.task.update({
      where: { id: taskId },
      data: { status: 'DONE', completedAt: new Date(), description: notes || task.description },
    });
  }

  async agentDashboard(userId: string) {
    const [todo, inProgress, blocked, done, overdue] = await Promise.all([
      this.prisma.task.count({ where: { assigneeId: userId, status: 'TODO' } }),
      this.prisma.task.count({ where: { assigneeId: userId, status: 'IN_PROGRESS' } }),
      this.prisma.task.count({ where: { assigneeId: userId, status: 'BLOCKED' } }),
      this.prisma.task.count({ where: { assigneeId: userId, status: 'DONE' } }),
      this.prisma.task.count({ where: { assigneeId: userId, status: { in: ['TODO', 'IN_PROGRESS'] }, dueDate: { lt: new Date() } } }),
    ]);
    return { todo, inProgress, blocked, done, overdue, total: todo + inProgress + blocked + done };
  }

  // ── P3.3: Booking — create shipment booking + trigger pre-alert ──
  async createBooking(jobId: string, data: { carrier: string; vesselFlight?: string; bookingRef?: string; etd: string; eta: string; mode: string }) {
    // Create shipment record
    const shipment = await this.prisma.shipment.create({
      data: {
        jobId, corridorId: (await this.prisma.job.findUnique({ where: { id: jobId } }))?.corridorId,
        mode: data.mode as any, carrier: data.carrier, vesselFlight: data.vesselFlight,
        bookingRef: data.bookingRef, etd: new Date(data.etd), eta: new Date(data.eta),
        status: 'BOOKED',
      },
    });
    // Transition job to BOOKING_CONFIRMED
    await this.prisma.job.update({ where: { id: jobId }, data: { status: 'BOOKING_CONFIRMED', etd: new Date(data.etd), eta: new Date(data.eta) } });
    // Create tracking event
    await this.prisma.trackingEvent.create({
      data: { jobId, eventType: 'STATUS_CHANGE', description: `Booking confirmed: ${data.carrier} ${data.vesselFlight || ''} ETD ${data.etd}`, timestamp: new Date() },
    });
    return shipment;
  }

  // ── P3.4: KPI Visibility ──
  async kpiByClient() {
    const clients = await this.prisma.organization.findMany({
      where: { type: 'CLIENT' },
      include: { jobsAsClient: true },
    });
    return clients.map(c => {
      const jobs = c.jobsAsClient || [];
      const closed = jobs.filter(j => j.status === 'CLOSED');
      const totalRevenue = jobs.reduce((s, j) => s + (j.pfiAmount || 0), 0);
      const avgDays = closed.length > 0
        ? Math.round(closed.reduce((s, j) => s + (j.actualDelivery && j.createdAt ? (new Date(j.actualDelivery).getTime() - new Date(j.createdAt).getTime()) / 86400000 : 0), 0) / closed.length)
        : 0;
      const onTime = closed.filter(j => j.actualDelivery && j.targetDelivery && new Date(j.actualDelivery) <= new Date(j.targetDelivery)).length;
      return {
        clientId: c.id, clientName: c.name,
        totalJobs: jobs.length, closedJobs: closed.length,
        totalRevenue, avgCycleDays: avgDays,
        onTimeRate: closed.length > 0 ? Math.round((onTime / closed.length) * 100) : 0,
      };
    }).filter(c => c.totalJobs > 0).sort((a, b) => b.totalJobs - a.totalJobs);
  }

  async kpiByCorridor() {
    const corridors = await this.prisma.corridor.findMany({
      where: { isActive: true },
      include: { jobs: true },
    });
    return corridors.map(c => {
      const jobs = c.jobs || [];
      const closed = jobs.filter(j => j.status === 'CLOSED');
      const volume = jobs.reduce((s, j) => s + (j.totalCbm || 0), 0);
      const revenue = jobs.reduce((s, j) => s + (j.pfiAmount || 0), 0);
      return {
        corridorId: c.id, corridor: c.name, mode: c.mode,
        totalJobs: jobs.length, closedJobs: closed.length,
        totalVolumeCbm: Math.round(volume * 10) / 10,
        totalRevenue: revenue,
        avgTransitDays: c.avgTransitDays,
      };
    }).filter(c => c.totalJobs > 0).sort((a, b) => b.totalJobs - a.totalJobs);
  }

  async slaTracking() {
    const jobs = await this.prisma.job.findMany({
      where: { status: { notIn: ['CLOSED', 'ABORTED'] } },
      include: { client: true, corridor: true },
      orderBy: { targetDelivery: 'asc' },
    });
    const now = new Date();
    return jobs.filter(j => j.targetDelivery).map(j => {
      const daysLeft = Math.round((new Date(j.targetDelivery).getTime() - now.getTime()) / 86400000);
      return {
        jobRef: j.ref, client: j.client?.name, corridor: j.corridor?.name,
        status: j.status, targetDelivery: j.targetDelivery,
        daysLeft, slaStatus: daysLeft < 0 ? 'BREACHED' : daysLeft <= 3 ? 'AT_RISK' : 'ON_TRACK',
      };
    });
  }
}
