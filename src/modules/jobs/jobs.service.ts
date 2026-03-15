import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';

// Status transition map — from Status Map Excel
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

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: { clientId?: string; status?: string; officeId?: string }) {
    return this.prisma.job.findMany({
      where: { ...(filters.clientId && { clientId: filters.clientId }), ...(filters.status && { status: filters.status as any }), ...(filters.officeId && { officeId: filters.officeId }) },
      include: { client: true, expediter: true, corridor: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: { client: true, expediter: true, corridor: true, purchaseOrders: { include: { items: true } }, boxes: true, shipments: { include: { transportLegs: true } }, documents: true, trackingEvents: { orderBy: { timestamp: 'desc' } }, tasks: true, costSheet: true },
    });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return job;
  }

  async create(dto: CreateJobDto, userId: string) {
    const { clientId, officeId, expediterId, corridorId, ...rest } = dto;
    return this.prisma.job.create({
      data: {
        ...rest,
        status: 'RFC_RECEIVED',
        currentPhase: 1,
        progress: 0,
        client: { connect: { id: clientId } },
        office: { connect: { id: officeId } },
        ...(expediterId && { expediter: { connect: { id: expediterId } } }),
        ...(corridorId && { corridor: { connect: { id: corridorId } } }),
      } as any,
      include: { client: true },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.job.update({ where: { id }, data });
  }

  async transition(id: string, targetStatus: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    const allowed = ALLOWED_TRANSITIONS[job.status] || [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(`Cannot transition from ${job.status} to ${targetStatus}. Allowed: ${allowed.join(', ')}`);
    }
    // TODO: Add validation rules per status (required docs, etc.)
    // TODO: Create TrackingEvent for the transition
    // TODO: Send client notification based on Status Map
    return this.prisma.job.update({
      where: { id },
      data: { status: targetStatus as any, updatedAt: new Date() },
    });
  }

  async dashboard() {
    const [total, byStatus, byClient] = await Promise.all([
      this.prisma.job.count(),
      this.prisma.job.groupBy({ by: ['status'], _count: true }),
      this.prisma.job.groupBy({ by: ['clientId'], _count: true }),
    ]);
    return { total, byStatus, byClient };
  }
}
