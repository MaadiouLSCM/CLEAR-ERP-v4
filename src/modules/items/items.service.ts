import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async findByJob(jobId: string) {
    return this.prisma.item.findMany({
      where: { jobId },
      include: { box: true, purchaseOrder: true, hsSuggestions: true },
      orderBy: { itemNumber: 'asc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: { box: true, purchaseOrder: true, job: true, hsSuggestions: { orderBy: { rank: 'asc' } } },
    });
    if (!item) throw new NotFoundException(`Item ${id} not found`);
    return item;
  }

  async create(data: any) {
    return this.prisma.item.create({ data, include: { purchaseOrder: true } });
  }

  async update(id: string, data: any) {
    return this.prisma.item.update({ where: { id }, data });
  }

  async generateQR(itemId: string) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId }, include: { job: true } });
    if (!item) throw new NotFoundException();
    const qrCode = `LSCM:${item.job.ref}:${item.id}`;
    return this.prisma.item.update({
      where: { id: itemId },
      data: { qrCode, qrGenerated: true, status: 'QR_GENERATED' },
    });
  }

  async bulkGenerateQR(jobId: string) {
    const items = await this.prisma.item.findMany({ where: { jobId, qrGenerated: false }, include: { job: true } });
    const results = await Promise.all(items.map(item =>
      this.prisma.item.update({
        where: { id: item.id },
        data: { qrCode: `LSCM:${item.job.ref}:${item.id}`, qrGenerated: true, status: 'QR_GENERATED' },
      })
    ));
    return { generated: results.length, items: results };
  }

  async assignToBox(itemId: string, boxId: string) {
    return this.prisma.item.update({
      where: { id: itemId },
      data: { boxId, status: 'PACKED' },
    });
  }

  async lookupByQR(qrCode: string) {
    const item = await this.prisma.item.findUnique({
      where: { qrCode },
      include: { job: { include: { client: true } }, box: true, purchaseOrder: true },
    });
    if (!item) throw new NotFoundException(`QR code ${qrCode} not found`);
    await this.prisma.item.update({ where: { id: item.id }, data: { qrScannedAt: new Date() } });
    return item;
  }

  // ── BOXES ──
  async findBoxesByJob(jobId: string) {
    return this.prisma.box.findMany({
      where: { jobId },
      include: { items: true },
      orderBy: { packageNumber: 'asc' },
    });
  }

  async createBox(data: any) {
    return this.prisma.box.create({ data, include: { items: true } });
  }

  async updateBox(id: string, data: any) {
    return this.prisma.box.update({ where: { id }, data });
  }
}
