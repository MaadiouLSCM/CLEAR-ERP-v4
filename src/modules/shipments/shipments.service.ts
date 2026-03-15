import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ShipmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: { jobId?: string; status?: string }) {
    return this.prisma.shipment.findMany({
      where: { ...(filters.jobId && { jobId: filters.jobId }), ...(filters.status && { status: filters.status as any }) },
      include: { job: { include: { client: true } }, corridor: true, transportLegs: { orderBy: { legNumber: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const s = await this.prisma.shipment.findUnique({
      where: { id },
      include: { job: true, corridor: true, transportLegs: { orderBy: { legNumber: 'asc' } }, trackingEvents: { orderBy: { timestamp: 'desc' } } },
    });
    if (!s) throw new NotFoundException();
    return s;
  }

  async create(data: any) {
    return this.prisma.shipment.create({ data, include: { corridor: true } });
  }

  async update(id: string, data: any) {
    return this.prisma.shipment.update({ where: { id }, data });
  }

  async addLeg(shipmentId: string, data: any) {
    return this.prisma.transportLeg.create({ data: { ...data, shipmentId } });
  }

  async updateLeg(legId: string, data: any) {
    return this.prisma.transportLeg.update({ where: { id: legId }, data });
  }

  async corridors() {
    return this.prisma.corridor.findMany({
      where: { isActive: true },
      include: { sailingWindows: true, flightSchedules: true },
    });
  }

  async sailingSchedule(corridorId: string) {
    return this.prisma.seaConsolidationWindow.findMany({ where: { corridorId } });
  }

  async flightSchedule(corridorId: string) {
    return this.prisma.flightSchedule.findMany({ where: { corridorId } });
  }

  // ── Customs Declarations ──
  async listCustomsDeclarations(jobId?: string) {
    return this.prisma.customsDeclaration.findMany({ where: jobId ? { jobId } : {}, include: { job: true }, orderBy: { createdAt: 'desc' } });
  }

  async createCustomsDeclaration(data: any) {
    return this.prisma.customsDeclaration.create({ data, include: { job: true } });
  }

  async updateCustomsDeclaration(id: string, data: any) {
    return this.prisma.customsDeclaration.update({ where: { id }, data, include: { job: true } });
  }

  // ── GreenLight Requests ──
  async listGreenLights(jobId?: string) {
    return this.prisma.greenLightRequest.findMany({ where: jobId ? { jobId } : {}, include: { job: true }, orderBy: { createdAt: 'desc' } });
  }

  async createGreenLight(data: any) {
    return this.prisma.greenLightRequest.create({ data, include: { job: true } });
  }

  async approveGreenLight(id: string, approvedBy: string) {
    return this.prisma.greenLightRequest.update({ where: { id }, data: { status: 'APPROVED', approvedBy, approvedAt: new Date() }, include: { job: true } });
  }
}
