import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';

// ── Status transition map — from Status Map Excel ──
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  RFC_RECEIVED: ['BW_IMPORTED', 'DOCS_PENDING'],
  BW_IMPORTED: ['QR_STICKERS_SENT', 'DOCS_PENDING'],
  QR_STICKERS_SENT: ['DOCS_PENDING'],
  DOCS_PENDING: ['DOCS_COMPLETE'],
  DOCS_COMPLETE: ['QUOTATION'],
  QUOTATION: ['PFI_SENT'],
  PFI_SENT: ['PFI_APPROVED', 'QUOTATION'],
  PFI_APPROVED: ['PLANNING'],
  PLANNING: ['JEP_SENT'],
  JEP_SENT: ['OPS_LAUNCHED'],
  OPS_LAUNCHED: ['PICKUP_SCHEDULED'],
  PICKUP_SCHEDULED: ['PICKUP_COMPLETED'],
  PICKUP_COMPLETED: ['AT_HUB'],
  AT_HUB: ['INSPECTION_DONE'],
  INSPECTION_DONE: ['CONSOLIDATED', 'GL_SUBMITTED'],
  CONSOLIDATED: ['GL_SUBMITTED'],
  GL_SUBMITTED: ['GL_APPROVED', 'CUSTOMS_HOLD'],
  GL_APPROVED: ['BOOKING_CONFIRMED'],
  BOOKING_CONFIRMED: ['PRE_ALERT_SENT'],
  PRE_ALERT_SENT: ['EXPORT_CUSTOMS'],
  EXPORT_CUSTOMS: ['IN_TRANSIT'],
  IN_TRANSIT: ['IMPORT_CUSTOMS', 'CUSTOMS_HOLD'],
  IMPORT_CUSTOMS: ['CUSTOMS_CLEARED', 'CUSTOMS_HOLD'],
  CUSTOMS_HOLD: ['CUSTOMS_CLEARED', 'IMPORT_CUSTOMS'],
  CUSTOMS_CLEARED: ['DELIVERY_SCHEDULED'],
  DELIVERY_SCHEDULED: ['DELIVERED'],
  DELIVERED: ['POD_RECEIVED'],
  POD_RECEIVED: ['JCR_PENDING'],
  JCR_PENDING: ['JCR_COMPLETE'],
  JCR_COMPLETE: ['INVOICED'],
  INVOICED: ['CLOSED'],
};

// ── Phase mapping for progress bar ──
const STATUS_PHASE: Record<string, number> = {
  RFC_RECEIVED: 1, BW_IMPORTED: 1,
  QR_STICKERS_SENT: 2, DOCS_PENDING: 2, DOCS_COMPLETE: 2, QUOTATION: 2, PFI_SENT: 2, PFI_APPROVED: 2,
  PLANNING: 3, JEP_SENT: 3, OPS_LAUNCHED: 3,
  PICKUP_SCHEDULED: 4, PICKUP_COMPLETED: 4, AT_HUB: 4, INSPECTION_DONE: 4, CONSOLIDATED: 4,
  GL_SUBMITTED: 5, GL_APPROVED: 5, BOOKING_CONFIRMED: 5, PRE_ALERT_SENT: 5,
  EXPORT_CUSTOMS: 5, IN_TRANSIT: 5, IMPORT_CUSTOMS: 5, CUSTOMS_CLEARED: 5,
  DELIVERY_SCHEDULED: 6, DELIVERED: 6, POD_RECEIVED: 6,
  JCR_PENDING: 7, JCR_COMPLETE: 7, INVOICED: 7, CLOSED: 7,
};

const STATUS_PROGRESS: Record<string, number> = {
  RFC_RECEIVED: 3, BW_IMPORTED: 6, QR_STICKERS_SENT: 10, DOCS_PENDING: 15, DOCS_COMPLETE: 20,
  QUOTATION: 25, PFI_SENT: 28, PFI_APPROVED: 32, PLANNING: 36, JEP_SENT: 40, OPS_LAUNCHED: 44,
  PICKUP_SCHEDULED: 48, PICKUP_COMPLETED: 52, AT_HUB: 56, INSPECTION_DONE: 60, CONSOLIDATED: 64,
  GL_SUBMITTED: 68, GL_APPROVED: 72, BOOKING_CONFIRMED: 75, PRE_ALERT_SENT: 78,
  EXPORT_CUSTOMS: 80, IN_TRANSIT: 84, IMPORT_CUSTOMS: 88, CUSTOMS_CLEARED: 90,
  DELIVERY_SCHEDULED: 92, DELIVERED: 94, POD_RECEIVED: 95,
  JCR_PENDING: 96, JCR_COMPLETE: 97, INVOICED: 98, CLOSED: 100,
};

// ── Auto-tasks triggered by status transitions ──
const TRANSITION_TASKS: Record<string, { title: string; taskType: string }[]> = {
  RFC_RECEIVED: [{ title: 'Review RFC documents', taskType: 'DOCUMENT_REVIEW' }],
  BW_IMPORTED: [{ title: 'Generate QR stickers for all items', taskType: 'QR_GENERATION' }],
  DOCS_COMPLETE: [{ title: 'Prepare quotation for client', taskType: 'QUOTATION' }],
  PFI_APPROVED: [{ title: 'Create Job Execution Plan', taskType: 'PLANNING' }],
  JEP_SENT: [{ title: 'Launch operations — coordinate with agents', taskType: 'OPS_COORDINATION' }],
  OPS_LAUNCHED: [{ title: 'Schedule pickup with transporter', taskType: 'PICKUP_SCHEDULING' }],
  PICKUP_COMPLETED: [{ title: 'Receive and inspect items at hub', taskType: 'INSPECTION' }],
  INSPECTION_DONE: [{ title: 'Submit Greenlight request', taskType: 'CUSTOMS_PREP' }],
  GL_APPROVED: [{ title: 'Confirm booking with carrier', taskType: 'BOOKING' }],
  BOOKING_CONFIRMED: [{ title: 'Send Pre-Alert to buyer and consignee', taskType: 'PRE_ALERT' }],
  DELIVERED: [{ title: 'Collect and upload Proof of Delivery', taskType: 'POD_COLLECTION' }],
  POD_RECEIVED: [{ title: 'Prepare Job Completion Report', taskType: 'JCR_PREPARATION' }],
  JCR_COMPLETE: [{ title: 'Generate and send invoice', taskType: 'INVOICING' }],
};

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: { clientId?: string; status?: string; officeId?: string }) {
    return this.prisma.job.findMany({
      where: {
        ...(filters.clientId && { clientId: filters.clientId }),
        ...(filters.status && { status: filters.status as any }),
        ...(filters.officeId && { officeId: filters.officeId }),
      },
      include: { client: true, expediter: true, corridor: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        client: true, expediter: true, corridor: true, office: true,
        purchaseOrders: { include: { items: true } },
        boxes: { include: { items: true } },
        shipments: { include: { transportLegs: true } },
        documents: { orderBy: { createdAt: 'desc' } },
        trackingEvents: { orderBy: { timestamp: 'desc' }, include: { photos: true } },
        tasks: { include: { assignee: true }, orderBy: { dueDate: 'asc' } },
        costSheet: true,
      },
    });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return job;
  }

  async create(dto: CreateJobDto, userId: string) {
    const { clientId, officeId, expediterId, corridorId, ...rest } = dto;
    const job = await this.prisma.job.create({
      data: {
        ...rest,
        status: 'RFC_RECEIVED',
        currentPhase: 1,
        progress: 3,
        client: { connect: { id: clientId } },
        office: { connect: { id: officeId } },
        ...(expediterId && { expediter: { connect: { id: expediterId } } }),
        ...(corridorId && { corridor: { connect: { id: corridorId } } }),
      } as any,
      include: { client: true, office: true },
    });

    // Create initial tracking event
    await this.prisma.trackingEvent.create({
      data: {
        jobId: job.id,
        eventType: 'STATUS_CHANGE',
        description: `Job ${job.ref} created with status RFC_RECEIVED`,
        createdBy: userId,
      },
    });

    // Create initial review task
    await this.createTransitionTasks(job.id, 'RFC_RECEIVED', userId);

    return job;
  }

  async update(id: string, data: any) {
    return this.prisma.job.update({ where: { id }, data });
  }

  async transition(id: string, targetStatus: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id }, include: { client: true } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);

    // Handle JOB_ABORTED specially
    if (targetStatus === 'JOB_ABORTED') {
      if (['CLOSED', 'INVOICED', 'JOB_ABORTED'].includes(job.status)) {
        throw new BadRequestException(`Cannot abort a job in ${job.status} status`);
      }
      return this.abortJob(id, job, userId);
    }

    const allowed = ALLOWED_TRANSITIONS[job.status] || [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${job.status} to ${targetStatus}. Allowed: ${allowed.join(', ')}`,
      );
    }

    // Perform transition
    const updated = await this.prisma.job.update({
      where: { id },
      data: {
        status: targetStatus as any,
        currentPhase: STATUS_PHASE[targetStatus] || job.currentPhase,
        progress: STATUS_PROGRESS[targetStatus] || job.progress,
        updatedAt: new Date(),
        // Set actual dates based on status
        ...(targetStatus === 'PICKUP_COMPLETED' && { actualPickup: new Date() }),
        ...(targetStatus === 'DELIVERED' && { actualDelivery: new Date() }),
      },
    });

    // Create tracking event
    await this.prisma.trackingEvent.create({
      data: {
        jobId: id,
        eventType: 'STATUS_CHANGE',
        description: `Status changed: ${job.status} → ${targetStatus}`,
        createdBy: userId,
      },
    });

    // Auto-create tasks for the new status
    await this.createTransitionTasks(id, targetStatus, userId);

    return updated;
  }

  private async abortJob(id: string, job: any, userId: string) {
    const updated = await this.prisma.job.update({
      where: { id },
      data: { status: 'JOB_ABORTED' as any, updatedAt: new Date() },
    });

    await this.prisma.trackingEvent.create({
      data: {
        jobId: id,
        eventType: 'STATUS_CHANGE',
        description: `JOB ABORTED from ${job.status} — costs incurred, abort invoice required`,
        createdBy: userId,
      },
    });

    // Create abort invoice task
    await this.prisma.task.create({
      data: {
        jobId: id,
        title: 'Generate abort invoice — costs already incurred',
        taskType: 'INVOICING' as any,
        priority: 'HIGH' as any,
        status: 'TODO' as any,
        assigneeId: userId,
        createdById: userId,
        dueDate: new Date(Date.now() + 3 * 86400000),
      },
    });

    return updated;
  }

  private async createTransitionTasks(jobId: string, status: string, userId: string) {
    const tasks = TRANSITION_TASKS[status];
    if (!tasks?.length) return;

    for (const task of tasks) {
      await this.prisma.task.create({
        data: {
          jobId,
          title: task.title,
          taskType: task.taskType as any,
          priority: 'MEDIUM' as any,
          status: 'TODO' as any,
          assigneeId: userId,
          createdById: userId,
          dueDate: new Date(Date.now() + 2 * 86400000), // 2 days SLA
        },
      });
    }
  }

  async dashboard() {
    const [total, byStatus, byClient, recentDelivered] = await Promise.all([
      this.prisma.job.count(),
      this.prisma.job.groupBy({ by: ['status'], _count: true }),
      this.prisma.job.groupBy({ by: ['clientId'], _count: true }),
      this.prisma.job.count({
        where: {
          status: { in: ['DELIVERED', 'POD_RECEIVED', 'JCR_PENDING', 'JCR_COMPLETE'] },
          updatedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
    ]);
    return { total, byStatus, byClient, recentDelivered };
  }
}
