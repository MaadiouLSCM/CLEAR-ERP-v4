import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // ══════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════

  async dashboard() {
    const [arTotal, arOverdue, apTotal, apPending, invoiceCount, paidCount, recentInvoices] = await Promise.all([
      this.prisma.invoiceLSCM.aggregate({ _sum: { total: true }, where: { status: { in: ['SENT', 'APPROVED'] } } }),
      this.prisma.invoiceLSCM.aggregate({ _sum: { total: true }, where: { status: 'OVERDUE' } }),
      this.prisma.invoiceAgent.aggregate({ _sum: { amount: true }, where: { status: { in: ['PENDING', 'APPROVED'] } } }),
      this.prisma.invoiceAgent.count({ where: { status: 'PENDING' } }),
      this.prisma.invoiceLSCM.count(),
      this.prisma.invoiceLSCM.count({ where: { status: 'PAID' } }),
      this.prisma.invoiceLSCM.findMany({ take: 10, orderBy: { date: 'desc' }, include: { client: true, job: true, lineItems: true } }),
    ]);

    const revenue = await this.prisma.invoiceLSCM.aggregate({ _sum: { total: true }, where: { status: 'PAID' } });
    const costs = await this.prisma.invoiceAgent.aggregate({ _sum: { amount: true }, where: { status: { in: ['APPROVED', 'PAID'] } } });

    const totalRevenue = revenue._sum.total || 0;
    const totalCosts = costs._sum.amount || 0;
    const grossProfit = totalRevenue - totalCosts;

    return {
      accountsReceivable: arTotal._sum.total || 0,
      overdueAR: arOverdue._sum.total || 0,
      accountsPayable: apTotal._sum.amount || 0,
      pendingAPCount: apPending,
      totalRevenue,
      totalCosts,
      grossProfit,
      grossMarginPct: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0,
      invoiceCount,
      paidCount,
      collectionRate: invoiceCount > 0 ? Math.round((paidCount / invoiceCount) * 100) : 0,
      recentInvoices,
    };
  }

  // ══════════════════════════════════════════════
  // LSCM INVOICES (Accounts Receivable)
  // ══════════════════════════════════════════════

  async invoices(filters: { jobId?: string; clientId?: string; status?: string }) {
    return this.prisma.invoiceLSCM.findMany({
      where: {
        ...(filters.jobId && { jobId: filters.jobId }),
        ...(filters.clientId && { clientId: filters.clientId }),
        ...(filters.status && { status: filters.status as any }),
      },
      include: { job: true, client: true, lineItems: true },
      orderBy: { date: 'desc' },
    });
  }

  async invoiceDetail(id: string) {
    const inv = await this.prisma.invoiceLSCM.findUnique({
      where: { id },
      include: { job: { include: { client: true, corridor: true } }, client: true, lineItems: true },
    });
    if (!inv) throw new NotFoundException(`Invoice ${id} not found`);
    return inv;
  }

  async createInvoice(data: any) {
    // Auto-generate invoice number: LSCM-INV-YYYYMMDD-XXX
    const today = new Date();
    const prefix = `LSCM-INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const count = await this.prisma.invoiceLSCM.count({ where: { invoiceNumber: { startsWith: prefix } } });
    const invoiceNumber = data.invoiceNumber || `${prefix}-${String(count + 1).padStart(3, '0')}`;

    return this.prisma.invoiceLSCM.create({
      data: {
        ...data,
        invoiceNumber,
        date: data.date ? new Date(data.date) : today,
        dueDate: data.dueDate ? new Date(data.dueDate) : new Date(today.getTime() + 30 * 86400000),
        subtotal: data.subtotal || 0,
        total: data.total || 0,
      },
      include: { lineItems: true, client: true },
    });
  }

  async addLineItem(invoiceId: string, data: any) {
    const total = (data.quantity || 1) * (data.unitPrice || 0);
    const line = await this.prisma.invoiceLineItem.create({
      data: { ...data, invoiceId, total },
    });
    await this.recalcInvoiceTotal(invoiceId);
    return line;
  }

  async transitionInvoice(id: string, status: string) {
    const invoice = await this.prisma.invoiceLSCM.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException();

    const TRANSITIONS: Record<string, string[]> = {
      DRAFT: ['SENT', 'CANCELLED'],
      SENT: ['APPROVED', 'OVERDUE', 'DISPUTED', 'CANCELLED'],
      APPROVED: ['PAID', 'OVERDUE', 'DISPUTED'],
      OVERDUE: ['PAID', 'DISPUTED', 'CANCELLED'],
      DISPUTED: ['APPROVED', 'CANCELLED'],
    };

    const allowed = TRANSITIONS[invoice.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${invoice.status} to ${status}. Allowed: ${allowed.join(', ')}`);
    }

    const updateData: any = { status };
    if (status === 'PAID') updateData.paidAt = new Date();

    return this.prisma.invoiceLSCM.update({
      where: { id },
      data: updateData,
      include: { lineItems: true, client: true },
    });
  }

  private async recalcInvoiceTotal(invoiceId: string) {
    const lines = await this.prisma.invoiceLineItem.findMany({ where: { invoiceId } });
    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    await this.prisma.invoiceLSCM.update({
      where: { id: invoiceId },
      data: { subtotal, total: subtotal },
    });
  }

  // ══════════════════════════════════════════════
  // AGENT INVOICES (Accounts Payable)
  // ══════════════════════════════════════════════

  async agentInvoices(filters: { jobId?: string; status?: string }) {
    return this.prisma.invoiceAgent.findMany({
      where: {
        ...(filters.jobId && { jobId: filters.jobId }),
        ...(filters.status && { status: filters.status as any }),
      },
      include: { job: true },
      orderBy: { date: 'desc' },
    });
  }

  async createAgentInvoice(data: any) {
    return this.prisma.invoiceAgent.create({
      data: {
        ...data,
        date: data.date ? new Date(data.date) : new Date(),
      },
    });
  }

  async approveAgentInvoice(id: string, approvedBy: string) {
    return this.prisma.invoiceAgent.update({
      where: { id },
      data: { approvedBy, status: 'APPROVED' },
    });
  }

  async transitionAgentInvoice(id: string, status: string, userId?: string) {
    const inv = await this.prisma.invoiceAgent.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException();

    const data: any = { status };
    if (status === 'APPROVED') data.approvedBy = userId;

    return this.prisma.invoiceAgent.update({ where: { id }, data });
  }

  // ══════════════════════════════════════════════
  // JOB COST SHEET
  // ══════════════════════════════════════════════

  async costSheet(jobId: string) {
    let sheet = await this.prisma.jobCostSheet.findUnique({ where: { jobId } });
    if (!sheet) {
      sheet = await this.prisma.jobCostSheet.create({ data: { jobId } });
    }

    const agentCosts = await this.prisma.invoiceAgent.findMany({
      where: { jobId, status: { in: ['APPROVED', 'PAID'] } },
    });
    const lscmInvoices = await this.prisma.invoiceLSCM.findMany({ where: { jobId } });

    const revenue = lscmInvoices.reduce((s, i) => s + i.total, 0);
    const totalAgent = agentCosts.reduce((s, i) => s + i.amount, 0);
    const grossProfit = revenue - totalAgent;

    const updated = await this.prisma.jobCostSheet.update({
      where: { jobId },
      data: {
        revenue,
        totalAgentCosts: totalAgent,
        grossProfit,
        grossMarginPct: revenue > 0 ? Math.round((grossProfit / revenue) * 100 * 100) / 100 : 0,
      },
    });

    return {
      ...updated,
      agentBreakdown: agentCosts.map(a => ({
        agent: a.agentName,
        ref: a.invoiceRef,
        category: a.category,
        amount: a.amount,
        currency: a.currency,
        status: a.status,
      })),
      invoices: lscmInvoices.map(i => ({
        number: i.invoiceNumber,
        total: i.total,
        status: i.status,
        date: i.date,
      })),
    };
  }

  // ══════════════════════════════════════════════
  // AGING REPORT
  // ══════════════════════════════════════════════

  async agingReport() {
    const invoices = await this.prisma.invoiceLSCM.findMany({
      where: { status: { in: ['SENT', 'APPROVED', 'OVERDUE'] } },
      include: { client: true, job: true },
      orderBy: { dueDate: 'asc' },
    });

    const now = new Date();
    const buckets = { current: [] as any[], days30: [] as any[], days60: [] as any[], days90: [] as any[], over90: [] as any[] };

    for (const inv of invoices) {
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000);
      const entry = {
        id: inv.id, invoiceNumber: inv.invoiceNumber, clientName: inv.client.name,
        jobRef: inv.job?.ref, total: inv.total, currency: inv.currency,
        date: inv.date, dueDate: inv.dueDate, daysOverdue: Math.max(0, daysOverdue),
        status: inv.status,
      };

      if (daysOverdue <= 0) buckets.current.push(entry);
      else if (daysOverdue <= 30) buckets.days30.push(entry);
      else if (daysOverdue <= 60) buckets.days60.push(entry);
      else if (daysOverdue <= 90) buckets.days90.push(entry);
      else buckets.over90.push(entry);
    }

    return {
      buckets,
      totals: {
        current: buckets.current.reduce((s, i) => s + i.total, 0),
        days30: buckets.days30.reduce((s, i) => s + i.total, 0),
        days60: buckets.days60.reduce((s, i) => s + i.total, 0),
        days90: buckets.days90.reduce((s, i) => s + i.total, 0),
        over90: buckets.over90.reduce((s, i) => s + i.total, 0),
      },
      totalOutstanding: invoices.reduce((s, i) => s + i.total, 0),
      invoiceCount: invoices.length,
    };
  }

  // ══════════════════════════════════════════════
  // REVENUE ANALYTICS
  // ══════════════════════════════════════════════

  async revenueByClient() {
    const invoices = await this.prisma.invoiceLSCM.findMany({
      where: { status: { in: ['APPROVED', 'PAID'] } },
      include: { client: true },
    });

    const byClient: Record<string, { name: string; revenue: number; invoices: number; paid: number }> = {};
    for (const inv of invoices) {
      const key = inv.clientId;
      if (!byClient[key]) byClient[key] = { name: inv.client.name, revenue: 0, invoices: 0, paid: 0 };
      byClient[key].revenue += inv.total;
      byClient[key].invoices++;
      if (inv.status === 'PAID') byClient[key].paid += inv.total;
    }

    return Object.entries(byClient)
      .map(([id, data]) => ({ clientId: id, ...data, collectionRate: data.revenue > 0 ? Math.round((data.paid / data.revenue) * 100) : 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  async revenueByCorridor() {
    const invoices = await this.prisma.invoiceLSCM.findMany({
      where: { status: { in: ['APPROVED', 'PAID'] } },
      include: { job: { include: { corridor: true } } },
    });

    const byCorridor: Record<string, { name: string; revenue: number; jobs: number }> = {};
    for (const inv of invoices) {
      if (!inv.job?.corridorId) continue;
      const key = inv.job.corridorId;
      const name = inv.job.corridor ? `${inv.job.corridor.originCountry} → ${inv.job.corridor.destCountry}` : key;
      if (!byCorridor[key]) byCorridor[key] = { name, revenue: 0, jobs: 0 };
      byCorridor[key].revenue += inv.total;
      byCorridor[key].jobs++;
    }

    return Object.entries(byCorridor)
      .map(([id, data]) => ({ corridorId: id, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  // ══════════════════════════════════════════════
  // BILLING ENGINE — Auto-price from contract
  // ══════════════════════════════════════════════

  async autoPrice(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { client: true, purchaseOrders: true },
    });
    if (!job) throw new NotFoundException();

    const profile = await this.prisma.contractPricingProfile.findFirst({
      where: { clientId: job.clientId, status: 'ACTIVE' },
      include: {
        rateCategories: { include: { rateLines: { include: { rateTiers: true } } } },
        taxRules: true,
        surchargeRules: true,
      },
    });
    if (!profile) return { error: 'No active pricing profile for this client', jobId };

    const billingInput = await this.prisma.billingInput.create({
      data: {
        jobId,
        mode: job.transportMode,
        weightKg: job.totalWeightKg,
        volumeCbm: job.totalCbm,
      },
    });

    const lines: any[] = [];
    for (const cat of profile.rateCategories) {
      for (const rl of cat.rateLines) {
        if (rl.rateType === 'FIXED' && rl.amount) {
          lines.push({
            billingInputId: billingInput.id,
            rateLineRef: rl.id,
            description: rl.serviceDescription,
            quantity: 1,
            unitPrice: rl.amount,
            total: rl.amount,
          });
        } else if (rl.rateType === 'PER_KG' && rl.amount && job.totalWeightKg) {
          const total = rl.amount * job.totalWeightKg;
          lines.push({
            billingInputId: billingInput.id,
            rateLineRef: rl.id,
            description: `${rl.serviceDescription} (${job.totalWeightKg} kg × ${rl.amount})`,
            quantity: job.totalWeightKg,
            unitPrice: rl.amount,
            total,
          });
        } else if (rl.rateType === 'PER_CBM' && rl.amount && job.totalCbm) {
          const total = rl.amount * job.totalCbm;
          lines.push({
            billingInputId: billingInput.id,
            rateLineRef: rl.id,
            description: `${rl.serviceDescription} (${job.totalCbm} CBM × ${rl.amount})`,
            quantity: job.totalCbm,
            unitPrice: rl.amount,
            total,
          });
        }
      }
    }

    // Apply surcharges
    for (const sr of profile.surchargeRules) {
      const base = lines.reduce((s, l) => s + l.total, 0);
      if (sr.calculationType === 'PERCENTAGE' && sr.percentage) {
        lines.push({
          billingInputId: billingInput.id,
          rateLineRef: sr.id,
          description: `Surcharge: ${sr.surchargeType} (${sr.percentage}%)`,
          quantity: 1,
          unitPrice: base * sr.percentage / 100,
          total: base * sr.percentage / 100,
        });
      } else if (sr.calculationType === 'FIXED' && sr.amount) {
        lines.push({
          billingInputId: billingInput.id,
          rateLineRef: sr.id,
          description: `Surcharge: ${sr.surchargeType}`,
          quantity: 1,
          unitPrice: sr.amount,
          total: sr.amount,
        });
      }
    }

    for (const line of lines) {
      await this.prisma.billingLine.create({ data: line });
    }

    const grandTotal = lines.reduce((s, l) => s + l.total, 0);

    return {
      billingInputId: billingInput.id,
      profile: profile.contractRef,
      currency: profile.accountingCurrency,
      linesGenerated: lines.length,
      grandTotal,
      lines,
    };
  }

  // ══════════════════════════════════════════════
  // PROFITABILITY BY JOB
  // ══════════════════════════════════════════════

  async profitabilityReport() {
    const jobs = await this.prisma.job.findMany({
      where: { status: { in: ['INVOICED', 'CLOSED'] } },
      include: { client: true, corridor: true, costSheet: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return jobs.map(j => ({
      jobId: j.id,
      jobRef: j.ref,
      client: j.client?.name,
      corridor: j.corridor ? `${j.corridor.originCountry} → ${j.corridor.destCountry}` : null,
      revenue: j.costSheet?.revenue || 0,
      costs: j.costSheet?.totalAgentCosts || 0,
      profit: j.costSheet?.grossProfit || 0,
      margin: j.costSheet?.grossMarginPct || 0,
      status: j.status,
    }));
  }
}
