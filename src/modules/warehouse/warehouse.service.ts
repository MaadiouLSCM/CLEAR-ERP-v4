import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class WarehouseService {
  constructor(private prisma: PrismaService) {}

  // ── HUBS ──
  async findAllHubs() {
    return this.prisma.hub.findMany({
      include: { zones: true, costProfile: true, regulatory: true, office: true, _count: { select: { stockItems: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async findHub(id: string) {
    const hub = await this.prisma.hub.findUnique({
      where: { id },
      include: { zones: true, costProfile: true, regulatory: true, equipment: true, freeTimeOverrides: true, office: true, stockItems: { orderBy: { receivedAt: 'asc' } } },
    });
    if (!hub) throw new NotFoundException();
    return hub;
  }

  async hubCapacity(hubId: string) {
    const hub = await this.prisma.hub.findUnique({ where: { id: hubId }, include: { zones: true } });
    if (!hub) throw new NotFoundException();
    const totalCbm = hub.zones.reduce((s, z) => s + z.capacityCbm, 0);
    const occupiedCbm = hub.zones.reduce((s, z) => s + z.currentOccupancyCbm, 0);
    return {
      hubCode: hub.code, hubName: hub.name, totalCbm, occupiedCbm,
      availableCbm: totalCbm - occupiedCbm,
      utilizationPct: totalCbm > 0 ? Math.round((occupiedCbm / totalCbm) * 100) : 0,
      zones: hub.zones.map(z => ({
        ...z, availableCbm: z.capacityCbm - z.currentOccupancyCbm,
        utilizationPct: z.capacityCbm > 0 ? Math.round((z.currentOccupancyCbm / z.capacityCbm) * 100) : 0,
      })),
    };
  }

  // ── STOCK ──
  async stockByHub(hubId: string) {
    return this.prisma.stockItem.findMany({
      where: { hubId },
      include: { zone: true },
      orderBy: { fifoScore: 'desc' },
    });
  }

  async receiveStock(data: { hubId: string; zoneId: string; smRef: string; jobRef: string; clientName: string; cbm: number; weightKg: number; packages: number; freeTimeDays: number }) {
    const stock = await this.prisma.stockItem.create({
      data: { ...data, receivedAt: new Date(), status: 'RECEIVED', fifoScore: 0, priority: 'MEDIUM' },
    });
    await this.prisma.stockMovement.create({
      data: { stockItemId: stock.id, type: 'INBOUND_RECEPTION', toZone: data.zoneId },
    });
    await this.updateZoneOccupancy(data.zoneId);
    return stock;
  }

  async dispatchStock(stockItemId: string) {
    const item = await this.prisma.stockItem.findUnique({ where: { id: stockItemId } });
    if (!item) throw new NotFoundException();
    await this.prisma.stockMovement.create({
      data: { stockItemId, type: 'OUTBOUND_DISPATCH', fromZone: item.zoneId },
    });
    const updated = await this.prisma.stockItem.update({
      where: { id: stockItemId },
      data: { status: 'DISPATCHED' },
    });
    if (item.zoneId) await this.updateZoneOccupancy(item.zoneId);
    return updated;
  }

  async transferStock(stockItemId: string, toZoneId: string) {
    const item = await this.prisma.stockItem.findUnique({ where: { id: stockItemId } });
    if (!item) throw new NotFoundException();
    await this.prisma.stockMovement.create({
      data: { stockItemId, type: 'INTERNAL_TRANSFER', fromZone: item.zoneId, toZone: toZoneId },
    });
    const updated = await this.prisma.stockItem.update({
      where: { id: stockItemId },
      data: { zoneId: toZoneId },
    });
    if (item.zoneId) await this.updateZoneOccupancy(item.zoneId);
    await this.updateZoneOccupancy(toZoneId);
    return updated;
  }

  private async updateZoneOccupancy(zoneId: string) {
    const items = await this.prisma.stockItem.findMany({
      where: { zoneId, status: { notIn: ['DISPATCHED'] } },
    });
    const occupancy = items.reduce((s, i) => s + i.cbm, 0);
    await this.prisma.hubZone.update({ where: { id: zoneId }, data: { currentOccupancyCbm: occupancy } });
  }

  async stockMovements(stockItemId: string) {
    return this.prisma.stockMovement.findMany({
      where: { stockItemId },
      orderBy: { timestamp: 'desc' },
    });
  }

  // ── FIFO QUEUE ──
  async getQueue(hubId: string, corridorId: string) {
    return this.prisma.loadingQueue.findFirst({
      where: { hubId, corridorId, status: 'OPEN' },
      include: { positions: { include: { stockItem: true }, orderBy: { rank: 'asc' } } },
    });
  }

  async recalculateQueue(queueId: string) {
    const queue = await this.prisma.loadingQueue.findUnique({
      where: { id: queueId },
      include: { positions: { include: { stockItem: true } } },
    });
    if (!queue) throw new NotFoundException();

    const rules = await this.prisma.priorityRule.findMany({ where: { isActive: true } });
    const maxDays = Math.max(...queue.positions.map(p => p.daysInStock), 1);

    const scored = queue.positions.map(pos => {
      let score = 0;
      for (const rule of rules) {
        if (rule.factor === 'days_in_stock') score += (pos.daysInStock / maxDays) * rule.weight * 10;
        else if (rule.factor === 'free_time_remaining') {
          const remaining = pos.stockItem.freeTimeDays - pos.daysInStock;
          score += remaining <= 3 ? rule.weight * 10 : ((pos.stockItem.freeTimeDays - remaining) / pos.stockItem.freeTimeDays) * rule.weight * 10;
        }
        else if (rule.factor === 'client_tier') score += rule.weight * 5; // simplified
        else if (rule.factor === 'dg_or_special') score += 0; // simplified
      }
      return { id: pos.id, score: Math.round(Math.min(score, 1000)) };
    });

    scored.sort((a, b) => b.score - a.score);
    for (let i = 0; i < scored.length; i++) {
      await this.prisma.queuePosition.update({
        where: { id: scored[i].id },
        data: { rank: i + 1, priorityScore: scored[i].score },
      });
    }

    await this.prisma.loadingQueue.update({
      where: { id: queueId },
      data: { lastRecalculated: new Date(), totalItems: queue.positions.length },
    });

    return this.getQueue(queue.hubId, queue.corridorId);
  }

  // ── CAPACITY SNAPSHOT ──
  async takeCapacitySnapshot(hubId: string) {
    const capacity = await this.hubCapacity(hubId);
    return this.prisma.capacitySnapshot.create({
      data: {
        hubId, date: new Date(),
        occupiedCbm: capacity.occupiedCbm, availableCbm: capacity.availableCbm,
        utilizationPct: capacity.utilizationPct, itemsCount: 0,
      },
    });
  }
}
