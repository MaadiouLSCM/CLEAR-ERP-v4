import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

// ── FIFO Scoring Constants (Decision D05) ──
// 4-factor 0-1000: Age 40%, FreeTime 30%, Client 20%, Special 10%
const FIFO_WEIGHTS = {
  AGE: 400,          // 40% of 1000
  FREE_TIME: 300,    // 30% of 1000
  CLIENT_TIER: 200,  // 20% of 1000
  SPECIAL: 100,      // 10% of 1000
};

const CLIENT_TIER_SCORES: Record<string, number> = {
  PLATINUM: 1.0, GOLD: 0.75, SILVER: 0.50, BRONZE: 0.25, PROSPECT: 0.10,
};

@Injectable()
export class WarehouseService {
  constructor(private prisma: PrismaService) {}

  // ══════════════════════════════════════════════
  // HUBS
  // ══════════════════════════════════════════════

  async findAllHubs() {
    return this.prisma.hub.findMany({
      include: {
        zones: true,
        costProfile: true,
        regulatory: true,
        office: true,
        _count: { select: { stockItems: true, loadingQueues: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async findHub(id: string) {
    const hub = await this.prisma.hub.findUnique({
      where: { id },
      include: {
        zones: true,
        costProfile: true,
        regulatory: true,
        equipment: true,
        freeTimeOverrides: true,
        office: true,
        stockItems: {
          where: { status: { not: 'DISPATCHED' } },
          include: { zone: true },
          orderBy: { fifoScore: 'desc' },
        },
        loadingQueues: {
          where: { status: 'OPEN' },
          include: { corridor: true, _count: { select: { positions: true } } },
        },
      },
    });
    if (!hub) throw new NotFoundException(`Hub ${id} not found`);
    return hub;
  }

  async hubCapacity(hubId: string) {
    const hub = await this.prisma.hub.findUnique({
      where: { id: hubId },
      include: { zones: true, stockItems: { where: { status: { not: 'DISPATCHED' } } } },
    });
    if (!hub) throw new NotFoundException();

    const totalCbm = hub.zones.reduce((s, z) => s + z.capacityCbm, 0);
    const occupiedCbm = hub.zones.reduce((s, z) => s + z.currentOccupancyCbm, 0);
    const totalItems = hub.stockItems.length;
    const totalWeightKg = hub.stockItems.reduce((s, i) => s + i.weightKg, 0);
    const totalPackages = hub.stockItems.reduce((s, i) => s + i.packages, 0);

    // Free time analysis
    const now = new Date();
    const overdueItems = hub.stockItems.filter(i => {
      const days = Math.floor((now.getTime() - new Date(i.receivedAt).getTime()) / 86400000);
      return days > i.freeTimeDays;
    });

    // Storage cost projection
    const dailyCostRate = hub.zones.reduce((s, z) => s + z.currentOccupancyCbm, 0);

    return {
      hubCode: hub.code,
      hubName: hub.name,
      totalCbm,
      occupiedCbm,
      availableCbm: totalCbm - occupiedCbm,
      utilizationPct: totalCbm > 0 ? Math.round((occupiedCbm / totalCbm) * 100) : 0,
      totalItems,
      totalWeightKg: Math.round(totalWeightKg),
      totalPackages,
      overdueCount: overdueItems.length,
      overdueItems: overdueItems.map(i => ({
        id: i.id, smRef: i.smRef, jobRef: i.jobRef, clientName: i.clientName,
        daysInStock: Math.floor((now.getTime() - new Date(i.receivedAt).getTime()) / 86400000),
        freeTimeDays: i.freeTimeDays,
        excessDays: Math.floor((now.getTime() - new Date(i.receivedAt).getTime()) / 86400000) - i.freeTimeDays,
      })),
      zones: hub.zones.map(z => ({
        id: z.id, name: z.name, code: z.code, type: z.type,
        capacityCbm: z.capacityCbm,
        occupiedCbm: z.currentOccupancyCbm,
        availableCbm: z.capacityCbm - z.currentOccupancyCbm,
        utilizationPct: z.capacityCbm > 0 ? Math.round((z.currentOccupancyCbm / z.capacityCbm) * 100) : 0,
      })),
    };
  }

  // ══════════════════════════════════════════════
  // STOCK LIFECYCLE
  // ══════════════════════════════════════════════

  async stockByHub(hubId: string, status?: string) {
    const now = new Date();
    const items = await this.prisma.stockItem.findMany({
      where: {
        hubId,
        ...(status && { status }),
        ...(!status && { status: { not: 'DISPATCHED' } }),
      },
      include: { zone: true },
      orderBy: { fifoScore: 'desc' },
    });

    return items.map(item => {
      const daysInStock = Math.floor((now.getTime() - new Date(item.receivedAt).getTime()) / 86400000);
      const freeTimeRemaining = Math.max(0, item.freeTimeDays - daysInStock);
      const isOverdue = daysInStock > item.freeTimeDays;
      return {
        ...item, daysInStock, freeTimeRemaining, isOverdue,
        excessDays: isOverdue ? daysInStock - item.freeTimeDays : 0,
      };
    });
  }

  async receiveStock(data: {
    hubId: string; zoneId: string; smRef: string; jobRef: string;
    clientName: string; cbm: number; weightKg: number; packages: number;
    freeTimeDays: number; clientTier?: string; isDG?: boolean; dgClass?: string;
    specialHandling?: boolean;
  }) {
    // Create stock item
    const stock = await this.prisma.stockItem.create({
      data: {
        hubId: data.hubId,
        zoneId: data.zoneId,
        smRef: data.smRef,
        jobRef: data.jobRef,
        clientName: data.clientName,
        cbm: data.cbm,
        weightKg: data.weightKg,
        packages: data.packages,
        freeTimeDays: data.freeTimeDays,
        receivedAt: new Date(),
        status: 'RECEIVED',
        fifoScore: 0,
        priority: 'MEDIUM',
      },
    });

    // Record inbound movement
    await this.prisma.stockMovement.create({
      data: {
        stockItemId: stock.id,
        type: 'INBOUND_RECEPTION',
        toZone: data.zoneId,
        notes: `Received: ${data.packages} pkg, ${data.cbm} CBM, ${data.weightKg} kg`,
      },
    });

    // Update zone occupancy
    await this.updateZoneOccupancy(data.zoneId);

    // Calculate initial FIFO score
    const scored = await this.calculateFIFOScore(stock.id, data.clientTier, data.specialHandling);

    return { ...stock, fifoScore: scored };
  }

  async dispatchStock(stockItemId: string, notes?: string) {
    const item = await this.prisma.stockItem.findUnique({ where: { id: stockItemId } });
    if (!item) throw new NotFoundException();
    if (item.status === 'DISPATCHED') throw new BadRequestException('Already dispatched');

    // Record outbound movement
    await this.prisma.stockMovement.create({
      data: {
        stockItemId,
        type: 'OUTBOUND_DISPATCH',
        fromZone: item.zoneId,
        notes: notes || 'Dispatched from hub',
      },
    });

    const updated = await this.prisma.stockItem.update({
      where: { id: stockItemId },
      data: { status: 'DISPATCHED' },
    });

    // Update zone occupancy
    if (item.zoneId) await this.updateZoneOccupancy(item.zoneId);

    // Remove from any queue positions
    await this.prisma.queuePosition.updateMany({
      where: { stockItemId, status: 'QUEUED' },
      data: { status: 'SHIPPED' },
    });

    return updated;
  }

  async transferStock(stockItemId: string, toZoneId: string, reason?: string) {
    const item = await this.prisma.stockItem.findUnique({ where: { id: stockItemId } });
    if (!item) throw new NotFoundException();
    if (item.status === 'DISPATCHED') throw new BadRequestException('Cannot transfer dispatched item');

    const fromZoneId = item.zoneId;

    await this.prisma.stockMovement.create({
      data: {
        stockItemId,
        type: 'INTERNAL_TRANSFER',
        fromZone: fromZoneId,
        toZone: toZoneId,
        notes: reason || `Transfer from ${fromZoneId} to ${toZoneId}`,
      },
    });

    const updated = await this.prisma.stockItem.update({
      where: { id: stockItemId },
      data: { zoneId: toZoneId },
    });

    if (fromZoneId) await this.updateZoneOccupancy(fromZoneId);
    await this.updateZoneOccupancy(toZoneId);
    return updated;
  }

  async stockMovements(stockItemId: string) {
    return this.prisma.stockMovement.findMany({
      where: { stockItemId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async stockSummary(hubId: string) {
    const now = new Date();
    const items = await this.prisma.stockItem.findMany({
      where: { hubId, status: { not: 'DISPATCHED' } },
    });

    const byStatus: Record<string, number> = {};
    const byClient: Record<string, { count: number; cbm: number; weightKg: number }> = {};
    let totalCbm = 0, totalWeightKg = 0, overdueCount = 0;

    items.forEach(item => {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
      if (!byClient[item.clientName]) byClient[item.clientName] = { count: 0, cbm: 0, weightKg: 0 };
      byClient[item.clientName].count++;
      byClient[item.clientName].cbm += item.cbm;
      byClient[item.clientName].weightKg += item.weightKg;
      totalCbm += item.cbm;
      totalWeightKg += item.weightKg;
      const days = Math.floor((now.getTime() - new Date(item.receivedAt).getTime()) / 86400000);
      if (days > item.freeTimeDays) overdueCount++;
    });

    return {
      totalItems: items.length, totalCbm, totalWeightKg, overdueCount,
      byStatus, byClient,
      avgDaysInStock: items.length > 0
        ? Math.round(items.reduce((s, i) => s + Math.floor((now.getTime() - new Date(i.receivedAt).getTime()) / 86400000), 0) / items.length)
        : 0,
    };
  }

  private async updateZoneOccupancy(zoneId: string) {
    const items = await this.prisma.stockItem.findMany({
      where: { zoneId, status: { notIn: ['DISPATCHED'] } },
    });
    const occupancy = items.reduce((s, i) => s + i.cbm, 0);
    await this.prisma.hubZone.update({
      where: { id: zoneId },
      data: { currentOccupancyCbm: occupancy },
    });
  }

  // ══════════════════════════════════════════════
  // FIFO QUEUE ENGINE (Decision D05)
  // Score 0-1000: Age 40%, FreeTime 30%, Client 20%, Special 10%
  // ══════════════════════════════════════════════

  async getQueue(hubId: string, corridorId?: string) {
    const where: any = { hubId, status: 'OPEN' };
    if (corridorId) where.corridorId = corridorId;

    const queues = await this.prisma.loadingQueue.findMany({
      where,
      include: {
        corridor: true,
        positions: {
          include: { stockItem: { include: { zone: true } } },
          orderBy: { rank: 'asc' },
        },
      },
    });

    const now = new Date();
    return queues.map(queue => ({
      ...queue,
      positions: queue.positions.map(pos => ({
        ...pos,
        daysInStock: Math.floor((now.getTime() - new Date(pos.stockItem.receivedAt).getTime()) / 86400000),
        freeTimeRemaining: Math.max(0, pos.stockItem.freeTimeDays - Math.floor((now.getTime() - new Date(pos.stockItem.receivedAt).getTime()) / 86400000)),
        isOverdue: Math.floor((now.getTime() - new Date(pos.stockItem.receivedAt).getTime()) / 86400000) > pos.stockItem.freeTimeDays,
      })),
    }));
  }

  async addToQueue(queueId: string, stockItemId: string) {
    const queue = await this.prisma.loadingQueue.findUnique({
      where: { id: queueId },
      include: { positions: true },
    });
    if (!queue) throw new NotFoundException('Queue not found');
    if (queue.status !== 'OPEN') throw new BadRequestException('Queue is not open');

    // Check if item already in queue
    const existing = queue.positions.find(p => p.stockItemId === stockItemId);
    if (existing) throw new BadRequestException('Item already in queue');

    const position = await this.prisma.queuePosition.create({
      data: {
        queueId,
        stockItemId,
        rank: queue.positions.length + 1,
        priorityScore: 0,
        daysInStock: 0,
        status: 'QUEUED',
      },
    });

    // Recalculate after adding
    await this.recalculateQueue(queueId);
    return position;
  }

  async recalculateQueue(queueId: string) {
    const queue = await this.prisma.loadingQueue.findUnique({
      where: { id: queueId },
      include: {
        positions: {
          where: { status: 'QUEUED' },
          include: { stockItem: true },
        },
      },
    });
    if (!queue) throw new NotFoundException();

    const now = new Date();
    const rules = await this.prisma.priorityRule.findMany({ where: { isActive: true } });

    // Calculate max days for normalization
    const daysArray = queue.positions.map(p =>
      Math.floor((now.getTime() - new Date(p.stockItem.receivedAt).getTime()) / 86400000)
    );
    const maxDays = Math.max(...daysArray, 1);

    const scored = queue.positions.map(pos => {
      const daysInStock = Math.floor((now.getTime() - new Date(pos.stockItem.receivedAt).getTime()) / 86400000);
      const freeTimeRemaining = Math.max(0, pos.stockItem.freeTimeDays - daysInStock);

      // ── Factor 1: Age (40%) — older items score higher ──
      const ageScore = (daysInStock / maxDays) * FIFO_WEIGHTS.AGE;

      // ── Factor 2: Free Time (30%) — less remaining = higher score ──
      let freeTimeScore = 0;
      if (freeTimeRemaining <= 0) {
        freeTimeScore = FIFO_WEIGHTS.FREE_TIME; // Max urgency
      } else if (freeTimeRemaining <= 3) {
        freeTimeScore = FIFO_WEIGHTS.FREE_TIME * 0.9;
      } else if (freeTimeRemaining <= 7) {
        freeTimeScore = FIFO_WEIGHTS.FREE_TIME * 0.7;
      } else {
        freeTimeScore = FIFO_WEIGHTS.FREE_TIME * (1 - freeTimeRemaining / Math.max(pos.stockItem.freeTimeDays, 1));
      }

      // ── Factor 3: Client Tier (20%) ──
      // Lookup client tier from org — simplified for now using clientName
      const tierScore = FIFO_WEIGHTS.CLIENT_TIER * (CLIENT_TIER_SCORES[pos.priorityOverride === 'CLIENT_URGENT' ? 'PLATINUM' : 'GOLD'] || 0.5);

      // ── Factor 4: Special/DG (10%) ──
      let specialScore = 0;
      if (pos.priorityOverride === 'CONTRACTUAL') specialScore = FIFO_WEIGHTS.SPECIAL;
      else if (pos.priorityOverride === 'MANAGEMENT') specialScore = FIFO_WEIGHTS.SPECIAL * 0.8;
      else if (pos.priorityOverride === 'CLIENT_URGENT') specialScore = FIFO_WEIGHTS.SPECIAL * 0.6;

      const totalScore = Math.round(Math.min(ageScore + freeTimeScore + tierScore + specialScore, 1000));

      return {
        id: pos.id,
        score: totalScore,
        daysInStock,
        breakdown: { age: Math.round(ageScore), freeTime: Math.round(freeTimeScore), clientTier: Math.round(tierScore), special: Math.round(specialScore) },
      };
    });

    // Sort by score descending (highest priority first)
    scored.sort((a, b) => b.score - a.score);

    // Update ranks and scores
    for (let i = 0; i < scored.length; i++) {
      await this.prisma.queuePosition.update({
        where: { id: scored[i].id },
        data: {
          rank: i + 1,
          priorityScore: scored[i].score,
          daysInStock: scored[i].daysInStock,
        },
      });
    }

    // Update queue totals
    const totalWeight = queue.positions.reduce((s, p) => s + p.stockItem.weightKg, 0);
    const totalCbm = queue.positions.reduce((s, p) => s + p.stockItem.cbm, 0);

    await this.prisma.loadingQueue.update({
      where: { id: queueId },
      data: {
        lastRecalculated: new Date(),
        totalItems: queue.positions.length,
        totalWeightKg: totalWeight,
        totalCbm: totalCbm,
      },
    });

    return this.getQueue(queue.hubId, queue.corridorId);
  }

  async overridePriority(positionId: string, override: string, reason: string, userId: string) {
    const position = await this.prisma.queuePosition.findUnique({
      where: { id: positionId },
      include: { queue: true },
    });
    if (!position) throw new NotFoundException();

    // Record FIFO violation if override changes order
    if (override !== 'NONE') {
      await this.prisma.fIFOViolation.create({
        data: {
          queuePositionId: positionId,
          violationType: `MANUAL_OVERRIDE_${override}`,
          justification: reason,
          approvedBy: userId,
        },
      });
    }

    await this.prisma.queuePosition.update({
      where: { id: positionId },
      data: {
        priorityOverride: override,
        overrideReason: reason,
        overrideBy: userId,
        overrideDate: new Date(),
      },
    });

    // Recalculate queue after override
    return this.recalculateQueue(position.queueId);
  }

  // ══════════════════════════════════════════════
  // CAPACITY SNAPSHOT & ANALYTICS
  // ══════════════════════════════════════════════

  async takeCapacitySnapshot(hubId: string) {
    const capacity = await this.hubCapacity(hubId);
    return this.prisma.capacitySnapshot.create({
      data: {
        hubId,
        date: new Date(),
        occupiedCbm: capacity.occupiedCbm,
        availableCbm: capacity.availableCbm,
        utilizationPct: capacity.utilizationPct,
        itemsCount: capacity.totalItems,
      },
    });
  }

  async capacityHistory(hubId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.prisma.capacitySnapshot.findMany({
      where: { hubId, date: { gte: since } },
      orderBy: { date: 'asc' },
    });
  }

  // ══════════════════════════════════════════════
  // NIGHTLY BATCH — Storage cost + FIFO recalc
  // ══════════════════════════════════════════════

  async nightlyBatch() {
    const hubs = await this.prisma.hub.findMany({
      where: { status: 'ACTIVE' },
      include: { costProfile: true, stockItems: { where: { status: { not: 'DISPATCHED' } } }, loadingQueues: { where: { status: 'OPEN' } } },
    });

    const results = [];
    for (const hub of hubs) {
      // 1. Accumulate storage costs
      if (hub.costProfile) {
        const rate = hub.costProfile.storageRatePerCbmPerDay;
        for (const item of hub.stockItems) {
          const daysInStock = Math.floor((Date.now() - new Date(item.receivedAt).getTime()) / 86400000);
          if (daysInStock > item.freeTimeDays) {
            const excessDays = daysInStock - item.freeTimeDays;
            const newCost = excessDays * item.cbm * rate;
            await this.prisma.stockItem.update({
              where: { id: item.id },
              data: { storageCostAccumulated: newCost },
            });
          }
        }
      }

      // 2. Recalculate all FIFO queues
      for (const queue of hub.loadingQueues) {
        await this.recalculateQueue(queue.id);
      }

      // 3. Take capacity snapshot
      await this.takeCapacitySnapshot(hub.id);

      results.push({ hubCode: hub.code, itemsProcessed: hub.stockItems.length, queuesRecalculated: hub.loadingQueues.length });
    }

    return { timestamp: new Date(), hubsProcessed: results.length, results };
  }

  // ══════════════════════════════════════════════
  // FIFO VIOLATIONS
  // ══════════════════════════════════════════════

  async getFIFOViolations(hubId?: string) {
    const where: any = {};
    if (hubId) {
      const queues = await this.prisma.loadingQueue.findMany({ where: { hubId }, select: { id: true } });
      const queueIds = queues.map(q => q.id);
      const positions = await this.prisma.queuePosition.findMany({ where: { queueId: { in: queueIds } }, select: { id: true } });
      where.queuePositionId = { in: positions.map(p => p.id) };
    }
    return this.prisma.fIFOViolation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ── Helper: Calculate FIFO score for a single item ──
  private async calculateFIFOScore(stockItemId: string, clientTier?: string, specialHandling?: boolean): Promise<number> {
    const item = await this.prisma.stockItem.findUnique({ where: { id: stockItemId } });
    if (!item) return 0;

    const daysInStock = Math.floor((Date.now() - new Date(item.receivedAt).getTime()) / 86400000);
    const ageScore = Math.min(daysInStock * 10, FIFO_WEIGHTS.AGE);
    const freeTimeRemaining = Math.max(0, item.freeTimeDays - daysInStock);
    const freeTimeScore = freeTimeRemaining <= 0 ? FIFO_WEIGHTS.FREE_TIME : FIFO_WEIGHTS.FREE_TIME * (1 - freeTimeRemaining / item.freeTimeDays);
    const tierScore = FIFO_WEIGHTS.CLIENT_TIER * (CLIENT_TIER_SCORES[clientTier || 'SILVER'] || 0.5);
    const specialScore = specialHandling ? FIFO_WEIGHTS.SPECIAL : 0;

    const total = Math.round(Math.min(ageScore + freeTimeScore + tierScore + specialScore, 1000));

    await this.prisma.stockItem.update({ where: { id: stockItemId }, data: { fifoScore: total } });
    return total;
  }
}
