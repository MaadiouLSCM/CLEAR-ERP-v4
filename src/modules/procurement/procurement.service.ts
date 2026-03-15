import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

// ══════════════════════════════════════════════════════════════
// CLEAR ERP v7 — Phase 2.7: Procurement Engine
// Agent scorecard 0-100, lane risk per corridor, RFQ workflow
// READS Finance (InvoiceAgent) + Compliance (SubcontractorCertification)
// NEVER writes to Finance or Compliance (canonical D16)
// ══════════════════════════════════════════════════════════════

@Injectable()
export class ProcurementService {
  constructor(private prisma: PrismaService) {}

  // ── Agent Scorecard (0-100) ──
  // Factors: Cost (30%), Reliability (25%), Compliance (25%), Transit Time (20%)
  async agentScorecard(agentName?: string) {
    // Get all unique agent names from InvoiceAgent
    const agentInvoices = await this.prisma.invoiceAgent.findMany({
      where: agentName ? { agentName } : {},
      include: { job: { include: { corridor: true, shipments: true } } },
    });

    // Group by agent
    const agentMap: Record<string, any[]> = {};
    for (const inv of agentInvoices) {
      if (!agentMap[inv.agentName]) agentMap[inv.agentName] = [];
      agentMap[inv.agentName].push(inv);
    }

    const scorecards = [];
    for (const [name, invoices] of Object.entries(agentMap)) {
      const totalJobs = invoices.length;
      if (totalJobs === 0) continue;

      // Cost score: lower variance from approved = better
      const varianceFlagged = invoices.filter(i => i.varianceFlagged).length;
      const costScore = Math.round(Math.max(0, 100 - (varianceFlagged / totalJobs) * 100));

      // Reliability: approved vs pending/rejected
      const approved = invoices.filter(i => i.status === 'APPROVED' || i.status === 'PAID').length;
      const reliabilityScore = Math.round((approved / totalJobs) * 100);

      // Compliance: check SubcontractorCertification status
      // Find org matching agent name
      const org = await this.prisma.organization.findFirst({ where: { name: { contains: name, mode: 'insensitive' } } });
      let complianceScore = 50; // default if no org found
      if (org) {
        const certs = await this.prisma.subcontractorCertification.findMany({ where: { organizationId: org.id } });
        if (certs.length > 0) {
          const active = certs.filter(c => c.status === 'ACTIVE').length;
          const expired = certs.filter(c => c.expiryDate && new Date(c.expiryDate) < new Date()).length;
          complianceScore = Math.round(((active - expired) / certs.length) * 100);
          complianceScore = Math.max(0, Math.min(100, complianceScore));
        }
      }

      // Transit time score: compare actual vs estimated
      let transitScore = 70; // default
      const jobsWithShipments = invoices.filter(i => i.job?.shipments?.length > 0);
      if (jobsWithShipments.length > 0) {
        let onTimeCount = 0;
        for (const inv of jobsWithShipments) {
          const ship = inv.job.shipments[0];
          if (ship.eta && ship.actualArrival) {
            const diff = (new Date(ship.actualArrival).getTime() - new Date(ship.eta).getTime()) / 86400000;
            if (diff <= 1) onTimeCount++; // within 1 day of ETA = on time
          } else {
            onTimeCount++; // no data = assume ok
          }
        }
        transitScore = Math.round((onTimeCount / jobsWithShipments.length) * 100);
      }

      // Weighted total: Cost 30%, Reliability 25%, Compliance 25%, Transit 20%
      const totalScore = Math.round(costScore * 0.30 + reliabilityScore * 0.25 + complianceScore * 0.25 + transitScore * 0.20);

      // Corridors served
      const corridors = [...new Set(invoices.filter(i => i.job?.corridor).map(i => i.job.corridor.name))];
      const categories = [...new Set(invoices.map(i => i.category))];
      const totalSpend = invoices.reduce((s, i) => s + i.amount, 0);

      scorecards.push({
        agentName: name, totalScore, totalJobs, totalSpend,
        breakdown: { cost: costScore, reliability: reliabilityScore, compliance: complianceScore, transitTime: transitScore },
        corridors, categories,
        rating: totalScore >= 80 ? 'EXCELLENT' : totalScore >= 60 ? 'GOOD' : totalScore >= 40 ? 'FAIR' : 'POOR',
      });
    }

    return scorecards.sort((a, b) => b.totalScore - a.totalScore);
  }

  // ── Lane Risk Assessment per Corridor ──
  async laneRisk(corridorId?: string) {
    const corridors = await this.prisma.corridor.findMany({
      where: corridorId ? { id: corridorId } : { isActive: true },
      include: { jobs: { include: { shipments: true, trackingEvents: true } } },
    });

    return corridors.map(corridor => {
      const jobs = corridor.jobs || [];
      const totalJobs = jobs.length;
      if (totalJobs === 0) return { corridor: corridor.name, corridorId: corridor.id, mode: corridor.mode, riskScore: 0, riskLevel: 'NO_DATA', factors: {}, totalJobs: 0 };

      // Customs hold rate
      const customsHolds = jobs.filter(j => j.status === 'CUSTOMS_HOLD' || jobs.some(jj => jj.trackingEvents?.some(e => e.eventType === 'CUSTOMS_HOLD'))).length;
      const customsRisk = Math.round((customsHolds / totalJobs) * 100);

      // Delay rate: jobs where actualDelivery > targetDelivery
      let delayCount = 0;
      let avgDelayDays = 0;
      const jobsWithDates = jobs.filter(j => j.actualDelivery && j.targetDelivery);
      if (jobsWithDates.length > 0) {
        for (const j of jobsWithDates) {
          const diff = (new Date(j.actualDelivery).getTime() - new Date(j.targetDelivery).getTime()) / 86400000;
          if (diff > 0) { delayCount++; avgDelayDays += diff; }
        }
        avgDelayDays = delayCount > 0 ? Math.round(avgDelayDays / delayCount) : 0;
      }
      const delayRate = jobsWithDates.length > 0 ? Math.round((delayCount / jobsWithDates.length) * 100) : 0;

      // Abort rate
      const aborted = jobs.filter(j => j.status === 'ABORTED').length;
      const abortRate = Math.round((aborted / totalJobs) * 100);

      // Document completeness: jobs that reached JCR_COMPLETE vs total closed
      const closedJobs = jobs.filter(j => j.status === 'CLOSED' || j.status === 'JCR_COMPLETE' || j.status === 'INVOICED');
      const jcrComplete = jobs.filter(j => j.status === 'JCR_COMPLETE' || j.status === 'INVOICED' || j.status === 'CLOSED').length;
      const docRate = closedJobs.length > 0 ? Math.round((jcrComplete / closedJobs.length) * 100) : 100;

      // Overall risk score (higher = more risky)
      const riskScore = Math.round(customsRisk * 0.35 + delayRate * 0.30 + abortRate * 0.20 + (100 - docRate) * 0.15);
      const riskLevel = riskScore >= 60 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW';

      return {
        corridor: corridor.name, corridorId: corridor.id, mode: corridor.mode,
        riskScore, riskLevel, totalJobs,
        factors: { customsRisk, delayRate, avgDelayDays, abortRate, docCompleteness: docRate },
        avgTransitDays: corridor.avgTransitDays,
      };
    }).sort((a, b) => b.riskScore - a.riskScore);
  }

  // ── Agent comparison for a specific corridor ──
  async agentComparison(corridorId: string) {
    const invoices = await this.prisma.invoiceAgent.findMany({
      where: { job: { corridorId } },
      include: { job: { include: { corridor: true } } },
    });
    const agentMap: Record<string, { total: number; count: number; categories: Set<string> }> = {};
    for (const inv of invoices) {
      if (!agentMap[inv.agentName]) agentMap[inv.agentName] = { total: 0, count: 0, categories: new Set() };
      agentMap[inv.agentName].total += inv.amount;
      agentMap[inv.agentName].count++;
      agentMap[inv.agentName].categories.add(inv.category);
    }
    return Object.entries(agentMap).map(([name, data]) => ({
      agentName: name, totalSpend: data.total, jobCount: data.count,
      avgCostPerJob: Math.round(data.total / data.count),
      categories: [...data.categories],
    })).sort((a, b) => b.jobCount - a.jobCount);
  }

  // ── Procurement Dashboard ──
  async dashboard() {
    const [totalAgentInvoices, totalSpend, topAgents, corridorCount, pendingInvoices] = await Promise.all([
      this.prisma.invoiceAgent.count(),
      this.prisma.invoiceAgent.aggregate({ _sum: { amount: true } }),
      this.prisma.invoiceAgent.groupBy({ by: ['agentName'], _sum: { amount: true }, _count: { id: true }, orderBy: { _sum: { amount: 'desc' } }, take: 10 }),
      this.prisma.corridor.count({ where: { isActive: true } }),
      this.prisma.invoiceAgent.count({ where: { status: 'PENDING' } }),
    ]);
    const subCerts = await this.prisma.subcontractorCertification.findMany({ include: { organization: true } });
    const expiredCerts = subCerts.filter(c => c.expiryDate && new Date(c.expiryDate) < new Date()).length;

    return {
      totalAgentInvoices, totalSpend: totalSpend._sum.amount || 0,
      corridorCount, pendingInvoices, expiredCerts,
      totalSubCerts: subCerts.length,
      topAgents: topAgents.map(a => ({ agentName: a.agentName, totalSpend: a._sum.amount, jobCount: a._count.id })),
    };
  }
}
