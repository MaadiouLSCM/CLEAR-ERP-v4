import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ConsolidationService {
  constructor(private prisma: PrismaService) {}

  async pendingRequests(corridorId?: string) {
    return this.prisma.consolidationRequest.findMany({
      where: { status: 'PENDING', ...(corridorId && { corridorId }) },
      include: { job: { include: { client: true } }, corridor: true },
      orderBy: { earliestShipDate: 'asc' },
    });
  }

  async createRequest(data: any) {
    return this.prisma.consolidationRequest.create({ data, include: { corridor: true } });
  }

  async generateRecommendations(corridorId: string, mode: string) {
    const pending = await this.prisma.consolidationRequest.findMany({
      where: { corridorId, status: 'PENDING', mode: mode as any },
      include: { job: { include: { client: true } } },
    });

    if (pending.length === 0) return { message: 'No pending requests for this corridor/mode' };

    // Separate IMMEDIATE (bypass consolidation)
    const immediate = pending.filter(r => r.urgency === 'IMMEDIATE');
    const consolidatable = pending.filter(r => r.urgency !== 'IMMEDIATE');

    const totalCbm = consolidatable.reduce((s, r) => s + r.cargoCbm, 0);
    const totalKg = consolidatable.reduce((s, r) => s + r.cargoWeightKg, 0);

    const recommendations: any[] = [];

    if (mode === 'SEA') {
      // MAXIMUM: wait for all, fill container
      recommendations.push({
        mode, corridorId, consolidationLevel: 'MAXIMUM',
        recommendedDate: consolidatable.reduce((d, r) => r.latestShipDate > d ? r.latestShipDate : d, new Date()),
        containerType: totalCbm > 33 ? '40FT_HC' : totalCbm > 20 ? '40FT_DRY' : '20FT_DRY',
        fillRatePct: Math.min(Math.round((totalCbm / (totalCbm > 33 ? 67.5 : totalCbm > 20 ? 67.5 : 33)) * 100), 100),
        estimatedCost: totalCbm > 20 ? 8900 : 5200,
        savingsPct: 30, status: 'SUGGESTED',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });
      // OPTIMAL: balanced
      const optimalCbm = consolidatable.filter(r => r.urgency === 'FLEXIBLE').reduce((s, r) => s + r.cargoCbm, 0);
      recommendations.push({
        mode, corridorId, consolidationLevel: 'OPTIMAL',
        recommendedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        containerType: optimalCbm > 20 ? '40FT_DRY' : '20FT_DRY',
        fillRatePct: Math.round((optimalCbm / (optimalCbm > 20 ? 67.5 : 33)) * 100),
        estimatedCost: optimalCbm > 20 ? 8900 : 5200,
        savingsPct: 20, status: 'SUGGESTED',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });
      // MINIMUM: ship what's ready now
      recommendations.push({
        mode, corridorId, consolidationLevel: 'MINIMUM',
        recommendedDate: new Date(),
        containerType: 'LCL',
        fillRatePct: 100, estimatedCost: totalCbm * 38,
        savingsPct: 0, status: 'SUGGESTED',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });
    }

    if (mode === 'AIR') {
      const weightBreaks = await this.prisma.airWeightBreak.findMany({ where: { corridorId }, orderBy: { weightMin: 'asc' } });
      const findRate = (kg: number) => {
        const tier = weightBreaks.find(wb => kg >= wb.weightMin && kg < wb.weightMax);
        return tier ? tier.ratePerKg : 8.5;
      };
      // Individual cost
      const individualCost = consolidatable.reduce((s, r) => s + r.cargoWeightKg * findRate(r.cargoWeightKg), 0);
      // Consolidated cost
      const consolidatedRate = findRate(totalKg);
      const consolidatedCost = totalKg * consolidatedRate;

      recommendations.push({
        mode, corridorId, consolidationLevel: 'OPTIMAL',
        recommendedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        uldType: totalKg > 300 ? 'PMC' : 'BULK',
        fillRatePct: 100, estimatedCost: Math.round(consolidatedCost),
        individualCostSum: Math.round(individualCost),
        savingsAmount: Math.round(individualCost - consolidatedCost),
        savingsPct: Math.round(((individualCost - consolidatedCost) / individualCost) * 100),
        status: 'SUGGESTED',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });
    }

    // Save recommendations
    const saved = [];
    for (const rec of recommendations) {
      const created = await this.prisma.consolidationRecommendation.create({ data: rec });
      saved.push(created);
    }

    return { immediateBypass: immediate.length, consolidatable: consolidatable.length, totalCbm, totalKg, recommendations: saved };
  }

  async acceptRecommendation(id: string) {
    return this.prisma.consolidationRecommendation.update({ where: { id }, data: { status: 'ACCEPTED' } });
  }

  async rejectRecommendation(id: string, reason?: string) {
    return this.prisma.consolidationRecommendation.update({ where: { id }, data: { status: 'REJECTED' } });
  }

  async activeRecommendations() {
    return this.prisma.consolidationRecommendation.findMany({
      where: { status: 'SUGGESTED', expiresAt: { gt: new Date() } },
      include: { requests: { include: { job: { include: { client: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
