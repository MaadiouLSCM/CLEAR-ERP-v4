import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // ── INVOICES (LSCM → Client) ──
  async invoices(filters: { jobId?: string; clientId?: string; status?: string }) {
    return this.prisma.invoiceLSCM.findMany({
      where: { ...(filters.jobId && { jobId: filters.jobId }), ...(filters.clientId && { clientId: filters.clientId }), ...(filters.status && { status: filters.status as any }) },
      include: { job: true, client: true, lineItems: true },
      orderBy: { date: 'desc' },
    });
  }

  async createInvoice(data: any) {
    return this.prisma.invoiceLSCM.create({ data, include: { lineItems: true } });
  }

  async addLineItem(invoiceId: string, data: any) {
    const line = await this.prisma.invoiceLineItem.create({ data: { ...data, invoiceId } });
    await this.recalcInvoiceTotal(invoiceId);
    return line;
  }

  private async recalcInvoiceTotal(invoiceId: string) {
    const lines = await this.prisma.invoiceLineItem.findMany({ where: { invoiceId } });
    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    const invoice = await this.prisma.invoiceLSCM.findUnique({ where: { id: invoiceId } });
    const tax = subtotal * 0; // VAT from contract pricing profile
    await this.prisma.invoiceLSCM.update({ where: { id: invoiceId }, data: { subtotal, tax, total: subtotal + tax } });
  }

  // ── AGENT INVOICES (Agent → LSCM) ──
  async agentInvoices(filters: { jobId?: string; status?: string }) {
    return this.prisma.invoiceAgent.findMany({
      where: { ...(filters.jobId && { jobId: filters.jobId }), ...(filters.status && { status: filters.status as any }) },
      include: { job: true },
      orderBy: { date: 'desc' },
    });
  }

  async createAgentInvoice(data: any) {
    return this.prisma.invoiceAgent.create({ data });
  }

  async approveAgentInvoice(id: string, approvedBy: string) {
    return this.prisma.invoiceAgent.update({ where: { id }, data: { approvedBy, status: 'APPROVED' } });
  }

  // ── JOB COST SHEET ──
  async costSheet(jobId: string) {
    let sheet = await this.prisma.jobCostSheet.findUnique({ where: { jobId } });
    if (!sheet) {
      sheet = await this.prisma.jobCostSheet.create({ data: { jobId } });
    }
    const agentCosts = await this.prisma.invoiceAgent.findMany({ where: { jobId, status: { in: ['APPROVED', 'PAID'] } } });
    const revenue = (await this.prisma.invoiceLSCM.findMany({ where: { jobId } })).reduce((s, i) => s + i.total, 0);
    const totalAgent = agentCosts.reduce((s, i) => s + i.amount, 0);
    const grossProfit = revenue - totalAgent;
    return this.prisma.jobCostSheet.update({
      where: { jobId },
      data: { revenue, totalAgentCosts: totalAgent, grossProfit, grossMarginPct: revenue > 0 ? (grossProfit / revenue) * 100 : 0 },
    });
  }

  // ── BILLING ENGINE — Auto-price from contract ──
  async autoPrice(jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId }, include: { client: true } });
    if (!job) throw new NotFoundException();
    const profile = await this.prisma.contractPricingProfile.findFirst({
      where: { clientId: job.clientId, status: 'ACTIVE' },
      include: { rateCategories: { include: { rateLines: { include: { rateTiers: true } } } }, taxRules: true, surchargeRules: true },
    });
    if (!profile) return { error: 'No active pricing profile for this client' };

    const billingInput = await this.prisma.billingInput.create({
      data: { jobId, mode: job.transportMode, weightKg: job.totalWeightKg, volumeCbm: job.totalCbm },
    });

    const lines: any[] = [];
    for (const cat of profile.rateCategories) {
      for (const rl of cat.rateLines) {
        if (rl.rateType === 'FIXED' && rl.amount) {
          lines.push({ billingInputId: billingInput.id, rateLineRef: rl.id, description: rl.serviceDescription, quantity: 1, unitPrice: rl.amount, total: rl.amount });
        }
        // TODO: implement TIERED_BY_WEIGHT, TIERED_BY_VOLUME etc. using rateTiers
      }
    }

    for (const line of lines) {
      await this.prisma.billingLine.create({ data: line });
    }

    return { billingInputId: billingInput.id, profile: profile.contractRef, linesGenerated: lines.length, lines };
  }

  // ── DASHBOARD ──
  async dashboard() {
    const [arTotal, arOverdue, apTotal, apPending] = await Promise.all([
      this.prisma.invoiceLSCM.aggregate({ _sum: { total: true }, where: { status: { in: ['SENT', 'APPROVED'] } } }),
      this.prisma.invoiceLSCM.aggregate({ _sum: { total: true }, where: { status: 'OVERDUE' } }),
      this.prisma.invoiceAgent.aggregate({ _sum: { amount: true }, where: { status: { in: ['PENDING', 'APPROVED'] } } }),
      this.prisma.invoiceAgent.count({ where: { status: 'PENDING' } }),
    ]);
    return { accountsReceivable: arTotal._sum.total || 0, overdueAR: arOverdue._sum.total || 0, accountsPayable: apTotal._sum.amount || 0, pendingAPCount: apPending };
  }
}
