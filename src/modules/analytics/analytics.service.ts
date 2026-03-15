import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async governanceKPIs() {
    return this.prisma.governanceKPI.findMany({ where: { isActive: true }, include: { targets: { orderBy: { period: 'desc' }, take: 1 }, alerts: { where: { acknowledgedAt: null }, orderBy: { triggeredAt: 'desc' } } } });
  }

  async calculateKPIs() {
    const kpis = await this.prisma.governanceKPI.findMany({ where: { isActive: true } });
    const results: any[] = [];

    for (const kpi of kpis) {
      let value: number | null = null;
      let level = 'UNKNOWN';

      switch (kpi.kpiCode) {
        case 'O1': { // On-Time Delivery %
          const delivered = await this.prisma.job.findMany({ where: { status: 'DELIVERED' } });
          const onTime = delivered.filter(j => j.actualDelivery && j.targetDelivery && j.actualDelivery <= j.targetDelivery);
          value = delivered.length > 0 ? (onTime.length / delivered.length) * 100 : 100;
          break;
        }
        case 'WH-01': { // Hub Capacity Utilization
          const hubs = await this.prisma.hub.findMany({ where: { status: 'ACTIVE' }, include: { zones: true } });
          const totalCap = hubs.reduce((s, h) => s + h.zones.reduce((zs, z) => zs + z.capacityCbm, 0), 0);
          const totalOcc = hubs.reduce((s, h) => s + h.zones.reduce((zs, z) => zs + z.currentOccupancyCbm, 0), 0);
          value = totalCap > 0 ? (totalOcc / totalCap) * 100 : 0;
          break;
        }
        case 'FQ-01': { // FIFO Compliance
          const violations = await this.prisma.fIFOViolation.count();
          const loaded = await this.prisma.queuePosition.count({ where: { status: 'LOADED' } });
          value = loaded > 0 ? ((loaded - violations) / loaded) * 100 : 100;
          break;
        }
        default:
          value = null;
      }

      if (value !== null) {
        level = this.evaluateThreshold(kpi, value);
        if (level === 'RED' || level === 'BLACK') {
          await this.prisma.governanceAlert.create({
            data: { kpiId: kpi.id, alertLevel: level, currentValue: value, threshold: 0 },
          });
        }
      }
      results.push({ kpiCode: kpi.kpiCode, name: kpi.name, category: kpi.category, value, level });
    }
    return results;
  }

  private evaluateThreshold(kpi: any, value: number): string {
    // Simplified — in production, parse threshold strings properly
    if (kpi.kpiCode === 'O1') {
      if (value > 95) return 'GREEN';
      if (value > 90) return 'YELLOW';
      if (value > 80) return 'ORANGE';
      if (value > 70) return 'RED';
      return 'BLACK';
    }
    if (kpi.kpiCode === 'WH-01') {
      if (value < 70) return 'GREEN';
      if (value < 85) return 'YELLOW';
      if (value < 95) return 'ORANGE';
      if (value <= 100) return 'RED';
      return 'BLACK';
    }
    return 'GREEN';
  }

  async alerts(acknowledged: boolean = false) {
    return this.prisma.governanceAlert.findMany({
      where: acknowledged ? {} : { acknowledgedAt: null },
      include: { kpi: true },
      orderBy: { triggeredAt: 'desc' },
    });
  }

  async acknowledgeAlert(id: string, userId: string) {
    return this.prisma.governanceAlert.update({ where: { id }, data: { acknowledgedBy: userId, acknowledgedAt: new Date() } });
  }

  async operationalDashboard() {
    const [totalJobs, byStatus, activeJobs, deliveredThisMonth] = await Promise.all([
      this.prisma.job.count(),
      this.prisma.job.groupBy({ by: ['status'], _count: true }),
      this.prisma.job.count({ where: { status: { notIn: ['CLOSED', 'ABORTED'] } } }),
      this.prisma.job.count({ where: { status: 'DELIVERED', actualDelivery: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
    ]);
    return { totalJobs, activeJobs, deliveredThisMonth, byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])) };
  }
}
