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

  // ── HR Analytics ──
  async hrDashboard() {
    const [employees, timeEntries] = await Promise.all([
      this.prisma.employee.findMany({ include: { office: true } }),
      this.prisma.timeEntry.findMany({ where: { date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
    ]);
    const active = employees.filter(e => e.status === 'ACTIVE');
    const byDept: Record<string, number> = {};
    const byOffice: Record<string, number> = {};
    active.forEach(e => {
      byDept[e.department] = (byDept[e.department] || 0) + 1;
      const oName = e.office?.name || 'Unknown';
      byOffice[oName] = (byOffice[oName] || 0) + 1;
    });
    const totalHours = timeEntries.reduce((s, t) => s + t.hours, 0);
    const billableHours = timeEntries.filter(t => t.billable).reduce((s, t) => s + t.hours, 0);
    return {
      totalEmployees: employees.length, activeEmployees: active.length,
      byDepartment: byDept, byOffice,
      monthlyHours: Math.round(totalHours), billableHours: Math.round(billableHours),
      utilizationPct: totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0,
    };
  }

  async listEmployees() {
    return this.prisma.employee.findMany({ include: { office: true }, orderBy: [{ status: 'asc' }, { name: 'asc' }] });
  }

  async timeEntriesByJob(jobRef?: string) {
    return this.prisma.timeEntry.findMany({
      where: jobRef ? { jobRef } : {},
      include: { user: true, employee: true },
      orderBy: { date: 'desc' }, take: 100,
    });
  }

  // ── CO2 Emissions (GLEC Framework estimates) ──
  // SEA: ~10g CO2/tonne-km, AIR: ~500g/tonne-km, ROAD: ~62g/tonne-km
  private readonly CO2_FACTORS: Record<string, number> = { SEA: 0.010, AIR: 0.500, ROAD: 0.062, RAIL: 0.022 };
  private readonly DISTANCES: Record<string, number> = {
    'France → Nigeria': 5200, 'Nigeria → France': 5200,
    'Mauritania → South Africa': 7800, 'South Africa → Mauritania': 7800,
    'France → Mauritania': 3400, 'Mauritania → France': 3400,
    'Nigeria → Mauritania': 2800, 'Mauritania → Nigeria': 2800,
  };

  async co2Dashboard() {
    const jobs = await this.prisma.job.findMany({
      where: { status: { notIn: ['ABORTED'] } },
      include: { corridor: true },
    });
    let totalKgCO2 = 0;
    const byCorridor: Record<string, { kgCO2: number; jobs: number; tonnekm: number }> = {};
    const byMode: Record<string, { kgCO2: number; jobs: number }> = {};

    for (const j of jobs) {
      const mode = j.transportMode || 'SEA';
      const factor = this.CO2_FACTORS[mode] || 0.010;
      const corridorName = j.corridor?.name || 'Unknown';
      const distKm = this.DISTANCES[corridorName] || 5000; // default 5000km
      const tonneKm = (j.totalWeightKg / 1000) * distKm;
      const kgCO2 = tonneKm * factor;

      totalKgCO2 += kgCO2;
      if (!byCorridor[corridorName]) byCorridor[corridorName] = { kgCO2: 0, jobs: 0, tonnekm: 0 };
      byCorridor[corridorName].kgCO2 += kgCO2;
      byCorridor[corridorName].jobs++;
      byCorridor[corridorName].tonnekm += tonneKm;

      if (!byMode[mode]) byMode[mode] = { kgCO2: 0, jobs: 0 };
      byMode[mode].kgCO2 += kgCO2;
      byMode[mode].jobs++;
    }

    return {
      totalKgCO2: Math.round(totalKgCO2),
      totalTonnesCO2: Math.round(totalKgCO2 / 1000 * 100) / 100,
      totalJobs: jobs.length,
      byCorridor: Object.entries(byCorridor).map(([name, d]) => ({ corridor: name, kgCO2: Math.round(d.kgCO2), jobs: d.jobs, tonneKm: Math.round(d.tonnekm) })).sort((a, b) => b.kgCO2 - a.kgCO2),
      byMode: Object.entries(byMode).map(([mode, d]) => ({ mode, kgCO2: Math.round(d.kgCO2), jobs: d.jobs })),
      methodology: 'GLEC Framework v3 — estimated. SEA 10g/tkm, AIR 500g/tkm, ROAD 62g/tkm',
    };
  }
}
