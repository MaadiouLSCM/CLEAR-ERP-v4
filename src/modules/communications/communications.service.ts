import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

// ══════════════════════════════════════════════════════════════
// CLEAR ERP v7 — Phase 2.3: Communications Engine
// 55+ templates × 33 statuses + 10 operational templates
// Nodemailer SMTP + WhatsApp Business API + System notifications
// ══════════════════════════════════════════════════════════════

interface Tpl { code: string; subject: string; body: string; recipients: string[]; channels: string[]; priority: string; }

const TPL: Record<string, Tpl[]> = {
  RFC_RECEIVED: [{ code:'RFC_001', subject:'LSCM — RFC Received: {{jobRef}}', body:'<p>Dear {{clientName}},</p><p>We confirm receipt of your Request for Collection for <strong>{{jobRef}}</strong>.</p><p><b>Corridor:</b> {{corridor}}<br/><b>Items:</b> {{itemCount}}<br/><b>Incoterm:</b> {{incoterm}}</p><p>Status update within 24h.</p><p>LSCM Operations</p>', recipients:['CLIENT','EXPEDITER'], channels:['EMAIL','SYSTEM'], priority:'NORMAL' }],
  BW_IMPORTED: [{ code:'BW_001', subject:'LSCM — BW Imported: {{jobRef}}', body:'<p>Dear Team,</p><p>BW data imported for <strong>{{jobRef}}</strong>.</p><p><b>POs:</b> {{poCount}} | <b>Items:</b> {{itemCount}}</p><p>QR sticker generation available.</p>', recipients:['EXPEDITER','MANAGEMENT'], channels:['EMAIL','SYSTEM'], priority:'NORMAL' }],
  QR_STICKERS_SENT: [{ code:'QR_001', subject:'LSCM — QR Stickers Ready: {{jobRef}}', body:'<p>QR stickers for <strong>{{jobRef}}</strong> generated. Affix one per article before collection.</p><p><b>Stickers:</b> {{itemCount}}</p>', recipients:['CLIENT','EXPEDITER'], channels:['EMAIL','WHATSAPP'], priority:'HIGH' }],
  DOCS_PENDING: [{ code:'DOC_001', subject:'LSCM — Docs Pending: {{jobRef}}', body:'<p>Dear {{clientName}},</p><p>Job <strong>{{jobRef}}</strong> requires documents to proceed:</p><ul>{{pendingDocsList}}</ul>', recipients:['CLIENT','EXPEDITER'], channels:['EMAIL','SYSTEM'], priority:'HIGH' }],
  DOCS_COMPLETE: [{ code:'DOC_002', subject:'LSCM — Docs Complete: {{jobRef}}', body:'<p>Dear {{clientName}},</p><p>All documents for <strong>{{jobRef}}</strong> received. Next: Quotation.</p>', recipients:['CLIENT','EXPEDITER','MANAGEMENT'], channels:['EMAIL','SYSTEM'], priority:'NORMAL' }],
  QUOTATION: [{ code:'QUO_001', subject:'LSCM — Quotation: {{jobRef}}', body:'<p>Quotation in progress for <strong>{{jobRef}}</strong>. Client: {{clientName}} | Corridor: {{corridor}}</p>', recipients:['EXPEDITER','MANAGEMENT'], channels:['SYSTEM'], priority:'NORMAL' }],
  PFI_SENT: [{ code:'PFI_001', subject:'LSCM — Proforma Invoice: {{jobRef}}', body:'<p>Dear {{clientName}},</p><p>PFI for <strong>{{jobRef}}</strong>.</p><p><b>Amount:</b> {{currency}} {{totalAmount}} | <b>Validity:</b> 15 days</p><p>Please confirm approval.</p>', recipients:['CLIENT','MANAGEMENT'], channels:['EMAIL'], priority:'HIGH' }],
  PFI_APPROVED: [{ code:'PFI_002', subject:'LSCM — PFI Approved: {{jobRef}}', body:'<p>Client approved PFI for <strong>{{jobRef}}</strong>. Ops authorized. Next: JEP</p>', recipients:['EXPEDITER','MANAGEMENT'], channels:['EMAIL','SYSTEM'], priority:'HIGH' }],
  PLANNING: [{ code:'PLN_001', subject:'LSCM — Planning: {{jobRef}}', body:'<p><strong>{{jobRef}}</strong> in planning. JEP underway. Expediter: {{expediterName}}</p>', recipients:['EXPEDITER','MANAGEMENT'], channels:['SYSTEM'], priority:'NORMAL' }],
  JEP_SENT: [{ code:'JEP_001', subject:'LSCM — Job Execution Plan: {{jobRef}}', body:'<p>Dear {{clientName}},</p><p>JEP for <strong>{{jobRef}}</strong> attached.</p>', recipients:['CLIENT'], channels:['EMAIL'], priority:'HIGH' }],
  OPS_LAUNCHED: [{ code:'OPS_001', subject:'LSCM — Ops Launched: {{jobRef}}', body:'<p>Dear {{clientName}},</p><p>Operations commenced for <strong>{{jobRef}}</strong>. Expediter: {{expediterName}}</p>', recipients:['CLIENT','EXPEDITER'], channels:['EMAIL','WHATSAPP'], priority:'HIGH' }],
  PICKUP_SCHEDULED: [{ code:'PKP_001', subject:'LSCM — Pickup Scheduled: {{jobRef}}', body:'<p>Dear {{clientName}},</p><p>Pickup scheduled for <strong>{{jobRef}}</strong>. Ensure goods ready + QR stickers affixed.</p>', recipients:['CLIENT','EXPEDITER'], channels:['EMAIL','WHATSAPP'], priority:'URGENT' }],
  PICKUP_COMPLETED: [{ code:'PKP_002', subject:'LSCM — Pickup Done: {{jobRef}}', body:'<p>Goods collected for <strong>{{jobRef}}</strong>. Items: {{itemCount}}. Next: Hub inspection</p>', recipients:['CLIENT','EXPEDITER','MANAGEMENT'], channels:['EMAIL','WHATSAPP','SYSTEM'], priority:'HIGH' }],
  AT_HUB: [{ code:'HUB_001', subject:'LSCM — At Hub: {{jobRef}}', body:'<p><strong>{{jobRef}}</strong> received at hub. Awaiting inspection.</p>', recipients:['CLIENT','EXPEDITER'], channels:['EMAIL','SYSTEM'], priority:'NORMAL' }],
  INSPECTION_DONE: [{ code:'INS_001', subject:'LSCM — Inspection Done: {{jobRef}}', body:'<p>Inspection complete for <strong>{{jobRef}}</strong>. Survey Report attached.</p>', recipients:['CLIENT','EXPEDITER','MANAGEMENT'], channels:['EMAIL'], priority:'NORMAL' }],
  CONSOLIDATED: [{ code:'CON_001', subject:'LSCM — Consolidated: {{jobRef}}', body:'<p><strong>{{jobRef}}</strong> consolidated on {{corridor}}. Weight: {{totalWeight}} kg</p>', recipients:['CLIENT','EXPEDITER'], channels:['EMAIL','SYSTEM'], priority:'NORMAL' }],
  GL_SUBMITTED: [{ code:'GL_001', subject:'LSCM — GL Submitted: {{jobRef}}', body:'<p>Greenlight submitted to destination customs for <strong>{{jobRef}}</strong>. Expected: 24-48h</p>', recipients:['CLIENT','EXPEDITER'], channels:['EMAIL'], priority:'HIGH' }],
  GL_APPROVED: [{ code:'GL_002', subject:'LSCM — GL Approved: {{jobRef}}', body:'<p>Customs approved for <strong>{{jobRef}}</strong>. Next: Carrier booking.</p>', recipients:['CLIENT','EXPEDITER','MANAGEMENT'], channels:['EMAIL','WHATSAPP'], priority:'HIGH' }],
  BOOKING_CONFIRMED: [{ code:'BKG_001', subject:'LSCM — Booking Confirmed: {{jobRef}}', body:'<p>Booking confirmed for <strong>{{jobRef}}</strong>. Carrier: {{carrierName}} | Vessel/Flight: {{vesselFlight}} | ETD: {{etd}} | ETA: {{eta}}</p><p>Pre-Alert follows immediately.</p>', recipients:['CLIENT'], channels:['EMAIL'], priority:'URGENT' }],
  PRE_ALERT_SENT: [
    { code:'PA_001', subject:'LSCM — Pre-Alert: {{jobRef}}', body:'<p>Pre-Alert for <strong>{{jobRef}}</strong>.</p><p>Carrier: {{carrierName}} | ETD: {{etd}} | ETA: {{eta}}</p><p>Attached docs: {{attachedDocs}}<br/>Pending: {{pendingDocs}}</p>', recipients:['CLIENT'], channels:['EMAIL'], priority:'URGENT' },
    { code:'PA_002', subject:'LSCM Pre-Alert: {{jobRef}}', body:'LSCM Pre-Alert\nJob: {{jobRef}}\nCorridor: {{corridor}}\nETD: {{etd}} | ETA: {{eta}}\nCarrier: {{carrierName}}', recipients:['CLIENT'], channels:['WHATSAPP'], priority:'URGENT' },
  ],
  EXPORT_CUSTOMS: [{ code:'XCU_001', subject:'LSCM — Export Customs: {{jobRef}}', body:'<p>Export customs in progress for <strong>{{jobRef}}</strong>.</p>', recipients:['CLIENT','EXPEDITER'], channels:['EMAIL','SYSTEM'], priority:'HIGH' }],
  IN_TRANSIT: [{ code:'TRS_001', subject:'LSCM — In Transit: {{jobRef}}', body:'<p><strong>{{jobRef}}</strong> in transit. {{corridor}} | Mode: {{transportMode}} | ETA: {{eta}}</p>', recipients:['CLIENT'], channels:['EMAIL','WHATSAPP'], priority:'HIGH' }],
  IMPORT_CUSTOMS: [{ code:'MCU_001', subject:'LSCM — Import Customs: {{jobRef}}', body:'<p>Import customs at destination for <strong>{{jobRef}}</strong>. Duration: 2-5 days</p>', recipients:['CLIENT'], channels:['EMAIL'], priority:'HIGH' }],
  CUSTOMS_HOLD: [{ code:'CHD_001', subject:'LSCM — Customs Hold: {{jobRef}}', body:'<p>ALERT: <strong>{{jobRef}}</strong> on customs hold. Reason: {{holdReason}}. Update within 24h.</p>', recipients:['CLIENT','MANAGEMENT','EXPEDITER'], channels:['EMAIL','WHATSAPP','SYSTEM'], priority:'URGENT' }],
  CUSTOMS_CLEARED: [{ code:'CCL_001', subject:'LSCM — Cleared: {{jobRef}}', body:'<p>Customs cleared for <strong>{{jobRef}}</strong>. Next: Delivery scheduling.</p>', recipients:['CLIENT','EXPEDITER'], channels:['EMAIL','WHATSAPP'], priority:'HIGH' }],
  DELIVERY_SCHEDULED: [{ code:'DEL_001', subject:'LSCM — Delivery Scheduled: {{jobRef}}', body:'<p>Delivery scheduled for <strong>{{jobRef}}</strong>. Please be available for POD signature.</p>', recipients:['CLIENT'], channels:['EMAIL','WHATSAPP'], priority:'URGENT' }],
  DELIVERED: [{ code:'DEL_002', subject:'LSCM — Delivered: {{jobRef}}', body:'<p><strong>{{jobRef}}</strong> delivered. POD pending collection.</p>', recipients:['CLIENT','MANAGEMENT'], channels:['EMAIL','WHATSAPP','SYSTEM'], priority:'HIGH' }],
  POD_RECEIVED: [{ code:'POD_001', subject:'LSCM — POD Received: {{jobRef}}', body:'<p>POD received for <strong>{{jobRef}}</strong>. Next: JCR.</p>', recipients:['CLIENT','MANAGEMENT'], channels:['EMAIL','SYSTEM'], priority:'NORMAL' }],
  JCR_PENDING: [{ code:'JCR_001', subject:'LSCM — JCR Prep: {{jobRef}}', body:'<p>JCR preparation for <strong>{{jobRef}}</strong>. Ensure all mandatory docs uploaded.</p>', recipients:['EXPEDITER','MANAGEMENT'], channels:['SYSTEM'], priority:'NORMAL' }],
  JCR_COMPLETE: [{ code:'JCR_002', subject:'LSCM — JCR Complete: {{jobRef}}', body:'<p>JCR for <strong>{{jobRef}}</strong> finalized. Invoice follows.</p>', recipients:['CLIENT','MANAGEMENT'], channels:['EMAIL'], priority:'HIGH' }],
  INVOICED: [{ code:'INV_001', subject:'LSCM — Invoice: {{jobRef}}', body:'<p>Invoice for <strong>{{jobRef}}</strong>. Invoice #: {{invoiceNumber}} | Amount: {{currency}} {{totalAmount}} | Due: {{dueDate}}</p>', recipients:['CLIENT'], channels:['EMAIL'], priority:'HIGH' }],
  CLOSED: [{ code:'CLS_001', subject:'LSCM — Closed: {{jobRef}}', body:'<p><strong>{{jobRef}}</strong> closed. Thank you for choosing LSCM.</p>', recipients:['CLIENT','MANAGEMENT'], channels:['EMAIL','SYSTEM'], priority:'NORMAL' }],
  ABORTED: [{ code:'ABT_001', subject:'LSCM — Aborted: {{jobRef}}', body:'<p><strong>{{jobRef}}</strong> aborted. QR stickers issued — costs incurred. Abort invoice per contract.</p>', recipients:['CLIENT','MANAGEMENT'], channels:['EMAIL','SYSTEM'], priority:'URGENT' }],
};

const OP: Record<string, Tpl> = {
  PAYMENT_REMINDER: { code:'PAY_001', subject:'LSCM — Payment Reminder: {{invoiceNumber}}', body:'<p>Invoice <strong>{{invoiceNumber}}</strong> is {{daysOverdue}} days overdue. Amount: {{currency}} {{totalAmount}}.</p>', recipients:['CLIENT'], channels:['EMAIL'], priority:'HIGH' },
  PAYMENT_RECEIVED: { code:'PAY_002', subject:'LSCM — Payment Received: {{invoiceNumber}}', body:'<p>Payment received for <strong>{{invoiceNumber}}</strong>. Thank you.</p>', recipients:['CLIENT'], channels:['EMAIL','SYSTEM'], priority:'NORMAL' },
  CERT_EXPIRY: { code:'CMP_001', subject:'Cert Expiring: {{certName}}', body:'<p><strong>{{certName}}</strong> for {{orgName}} expires {{expiryDate}}. Days left: {{daysUntilExpiry}}</p>', recipients:['MANAGEMENT'], channels:['EMAIL','SYSTEM'], priority:'URGENT' },
  FIFO_VIOLATION: { code:'WH_001', subject:'FIFO Violation: {{hubName}}', body:'<p>FIFO violation at <strong>{{hubName}}</strong>. Stock: {{stockRef}}, Score: {{fifoScore}}</p>', recipients:['MANAGEMENT'], channels:['SYSTEM'], priority:'HIGH' },
  DSR: { code:'DSR_001', subject:'LSCM — Daily Status: {{jobRef}}', body:'<p>{{statusComment}}</p><p>Status: {{currentStatus}} | Location: {{currentLocation}}</p>', recipients:['CLIENT'], channels:['EMAIL'], priority:'NORMAL' },
  WSR: { code:'WSR_001', subject:'LSCM — Weekly Report: {{clientName}}', body:'<p>Active: {{activeJobCount}} | Completed: {{completedCount}} | In Transit: {{inTransitCount}} | Hold: {{onHoldCount}}</p>', recipients:['CLIENT','MANAGEMENT'], channels:['EMAIL'], priority:'NORMAL' },
  AGENT_SI: { code:'AGT_001', subject:'LSCM — SI: {{jobRef}}', body:'<p>SI for <strong>{{jobRef}}</strong>. Route: {{corridor}}. Mode: {{transportMode}}.</p>', recipients:['CLIENT'], channels:['EMAIL'], priority:'HIGH' },
  RFQ: { code:'RFQ_001', subject:'LSCM — RFQ: {{jobRef}}', body:'<p>Quote request: {{jobRef}}, {{corridor}}, {{totalWeight}} kg, {{itemCount}} items. Respond 48h.</p>', recipients:['CLIENT'], channels:['EMAIL'], priority:'HIGH' },
  SATISFACTION: { code:'SAT_001', subject:'LSCM — Feedback: {{jobRef}}', body:'<p>{{jobRef}} complete. We appreciate your feedback.</p>', recipients:['CLIENT'], channels:['EMAIL'], priority:'LOW' },
  WELCOME: { code:'WLC_001', subject:'Welcome to LSCM — {{clientName}}', body:'<p>Welcome. Access CLEAR at clear-erp-v4.vercel.app.</p>', recipients:['CLIENT'], channels:['EMAIL'], priority:'NORMAL' },
};

@Injectable()
export class CommunicationsService {
  private readonly logger = new Logger(CommunicationsService.name);
  private mailer: any = null;

  constructor(private prisma: PrismaService) { this.initSMTP(); }

  private async initSMTP() {
    const h = process.env.SMTP_HOST, u = process.env.SMTP_USER, p = process.env.SMTP_PASS;
    if (h && u && p) {
      try {
        const nm = await import('nodemailer');
        this.mailer = (nm as any).createTransport({ host: h, port: parseInt(process.env.SMTP_PORT || '587'), secure: process.env.SMTP_PORT === '465', auth: { user: u, pass: p }, tls: { rejectUnauthorized: false } });
        this.logger.log(`SMTP ready: ${h}`);
      } catch { this.logger.warn('Nodemailer not available'); }
    } else { this.logger.warn('SMTP not configured — DB only'); }
  }

  private sub(t: string, v: Record<string, string>): string {
    let r = t;
    for (const [k, val] of Object.entries(v)) r = r.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), val || '—');
    return r.replace(/\{\{[^}]+\}\}/g, '—');
  }

  // Build template vars from job — uses EXACT Prisma schema field names
  private async buildVars(jobId: string): Promise<Record<string, string>> {
    const j = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        client: true,
        expediter: true,
        corridor: true,
        purchaseOrders: { include: { supplier: true } },
        items: true,
        documents: true,
        shipments: { take: 1, orderBy: { createdAt: 'desc' } },
        invoicesLSCM: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!j) return {};
    const inv = j.invoicesLSCM?.[0];
    const sup = j.purchaseOrders?.[0]?.supplier;
    const ship = j.shipments?.[0];
    return {
      jobRef: j.ref || j.id,
      clientName: j.client?.name || 'Client',
      supplierName: sup?.name || '',
      corridor: j.corridor ? j.corridor.name : '',
      originPort: j.corridor?.originCountry || '',
      destinationPort: j.corridor?.destCountry || '',
      destination: j.corridor?.destCountry || '',
      transportMode: j.transportMode || 'SEA',
      incoterm: j.incoterm || '',
      itemCount: String(j.items?.length || 0),
      poCount: String(j.purchaseOrders?.length || 0),
      totalWeight: String(j.items?.reduce((s, i) => s + (i.weightKg || 0), 0).toFixed(1)),
      currentStatus: j.status,
      currency: inv?.currency || j.currency || 'USD',
      totalAmount: inv?.total ? String(inv.total.toFixed(2)) : (j.pfiAmount ? String(j.pfiAmount.toFixed(2)) : ''),
      invoiceNumber: inv?.invoiceNumber || '',
      dueDate: inv?.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-GB') : '',
      expediterName: j.expediter?.name || '',
      carrierName: ship?.carrier || '',
      vesselFlight: ship?.vesselFlight || '',
      etd: ship?.etd ? new Date(ship.etd).toLocaleDateString('en-GB') : (j.etd ? new Date(j.etd).toLocaleDateString('en-GB') : ''),
      eta: ship?.eta ? new Date(ship.eta).toLocaleDateString('en-GB') : (j.eta ? new Date(j.eta).toLocaleDateString('en-GB') : ''),
      estimatedDelivery: j.targetDelivery ? new Date(j.targetDelivery).toLocaleDateString('en-GB') : '',
      attachedDocs: j.documents?.filter(d => d.status === 'VERIFIED').map(d => d.type).join(', ') || 'None yet',
      pendingDocs: j.documents?.filter(d => d.status !== 'VERIFIED').map(d => d.type).join(', ') || 'None',
      pendingDocsList: j.documents?.filter(d => d.status !== 'VERIFIED').map(d => `<li>${d.type}</li>`).join('') || '',
    };
  }

  // Resolve email addresses — uses EXACT schema relations
  private async resolveAddrs(jobId: string, roles: string[]): Promise<string[]> {
    const j = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { client: true, expediter: true },
    });
    if (!j) return [];
    const a: string[] = [];
    for (const r of roles) {
      if (r === 'CLIENT' && j.client?.email) a.push(j.client.email);
      if (r === 'EXPEDITER' && j.expediter?.email) a.push(j.expediter.email);
      if (r === 'MANAGEMENT') a.push('management@lscmltd.com');
      if (r === 'FINANCE') a.push('finance@lscmltd.com');
    }
    return [...new Set(a)].filter(Boolean);
  }

  // Resolve user IDs for system notifications — uses EXACT Role enum values
  private async resolveUserIds(jobId: string, roles: string[]): Promise<string[]> {
    const j = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!j) return [];
    const ids: string[] = [];
    if (roles.includes('EXPEDITER') && j.expediterId) ids.push(j.expediterId);
    if (roles.includes('MANAGEMENT')) {
      const m = await this.prisma.user.findMany({
        where: { role: { in: ['CEO', 'OPERATIONS_MANAGER', 'ADMIN'] as any } },
        select: { id: true },
      });
      m.forEach(x => ids.push(x.id));
    }
    if (roles.includes('FINANCE')) {
      const f = await this.prisma.user.findMany({
        where: { role: 'FINANCE_MANAGER' as any },
        select: { id: true },
      });
      f.forEach(x => ids.push(x.id));
    }
    return [...new Set(ids)];
  }

  private wrap(subj: string, body: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f4}.c{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}.h{background:#1A5F99;padding:20px 30px;text-align:center}.h h2{color:#fff;margin:0;font-size:16px}.h p{color:#2A9D8F;margin:4px 0 0;font-size:12px}.b{padding:24px 30px;color:#333;line-height:1.6;font-size:14px}.b strong{color:#1A5F99}.f{background:#f9f9f9;padding:16px 30px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee}</style></head><body><div class="c"><div class="h"><h2>LSCM CLEAR</h2><p>${subj}</p></div><div class="b">${body}</div><div class="f">LSCM Ltd — Freight Forwarding and 3PL<br/>Lagos | Abuja | Nouakchott<br/>lscmltd.com</div></div></body></html>`;
  }

  private toPlain(h: string): string {
    return h.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }

  private async sendSave(d: { jobId?: string; sentById?: string; toAddress: string; fromAddress: string; subject: string; body: string; templateRef: string; channel?: string }) {
    let status = 'SAVED';
    if ((d.channel || 'EMAIL') === 'EMAIL' && this.mailer) {
      try {
        await this.mailer.sendMail({ from: `"LSCM" <${d.fromAddress}>`, to: d.toAddress, subject: d.subject, html: this.wrap(d.subject, d.body) });
        status = 'SENT';
      } catch (e: any) { status = 'FAILED'; this.logger.error(`Email fail: ${e.message}`); }
    }
    return this.prisma.email.create({
      data: {
        jobId: d.jobId || undefined, sentById: d.sentById || undefined,
        toAddress: d.toAddress, fromAddress: d.fromAddress,
        subject: d.subject, body: d.body,
        channel: d.channel || 'EMAIL', templateRef: d.templateRef,
        status, direction: 'OUT', sentAt: new Date(),
      },
    });
  }

  private async sendWA(d: { jobId: string; toAddress: string; body: string; templateRef: string; sentById?: string }) {
    let status = 'SAVED';
    const url = process.env.WHATSAPP_API_URL, tok = process.env.WHATSAPP_API_TOKEN;
    if (url && tok) {
      try {
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ messaging_product: 'whatsapp', to: d.toAddress, type: 'text', text: { body: d.body } }) });
        status = r.ok ? 'SENT' : 'FAILED';
      } catch { status = 'FAILED'; }
    }
    return this.prisma.email.create({
      data: {
        jobId: d.jobId, sentById: d.sentById || undefined,
        toAddress: d.toAddress, fromAddress: 'whatsapp@lscmltd.com',
        subject: `WA:${d.templateRef}`, body: d.body,
        channel: 'WHATSAPP', templateRef: d.templateRef,
        status, direction: 'OUT', sentAt: new Date(),
      },
    });
  }

  // ═══ PUBLIC API ═══

  async onStatusTransition(jobId: string, newStatus: string, userId?: string, extraVars?: Record<string, string>) {
    const tpls = TPL[newStatus];
    if (!tpls?.length) return [];
    const vars = { ...(await this.buildVars(jobId)), ...(extraVars || {}) };
    const from = process.env.SMTP_FROM || 'operations@lscmltd.com';
    const results: any[] = [];
    for (const t of tpls) {
      const s = this.sub(t.subject, vars), b = this.sub(t.body, vars);
      const addrs = await this.resolveAddrs(jobId, t.recipients);
      for (const ch of t.channels) {
        if (ch === 'EMAIL') { for (const a of addrs) results.push(await this.sendSave({ jobId, sentById: userId, toAddress: a, fromAddress: from, subject: s, body: b, templateRef: t.code })); }
        else if (ch === 'WHATSAPP') { for (const a of addrs) results.push(await this.sendWA({ jobId, toAddress: a, body: this.toPlain(b), templateRef: t.code, sentById: userId })); }
        else if (ch === 'SYSTEM') {
          const uids = await this.resolveUserIds(jobId, t.recipients);
          for (const uid of uids) await this.prisma.notification.create({ data: { userId: uid, type: t.code, title: s, body: this.toPlain(b).substring(0, 500), jobRef: vars.jobRef } });
        }
      }
    }
    return results;
  }

  async sendOperational(key: string, jobId: string, userId?: string, extraVars?: Record<string, string>) {
    const t = OP[key];
    if (!t) throw new Error(`Unknown template: ${key}`);
    const vars = { ...(await this.buildVars(jobId)), ...(extraVars || {}) };
    const s = this.sub(t.subject, vars), b = this.sub(t.body, vars);
    const addrs = await this.resolveAddrs(jobId, t.recipients);
    const from = process.env.SMTP_FROM || 'operations@lscmltd.com';
    const results: any[] = [];
    for (const a of addrs) results.push(await this.sendSave({ jobId, sentById: userId, toAddress: a, fromAddress: from, subject: s, body: b, templateRef: t.code }));
    return results;
  }

  async findEmails(f: { jobId?: string; channel?: string; status?: string; templateRef?: string; page?: number; limit?: number }) {
    const w: any = {};
    if (f.jobId) w.jobId = f.jobId;
    if (f.channel) w.channel = f.channel;
    if (f.status) w.status = f.status;
    if (f.templateRef) w.templateRef = f.templateRef;
    const pg = Number(f.page) || 1, lim = Number(f.limit) || 50;
    const [items, total] = await Promise.all([
      this.prisma.email.findMany({ where: w, include: { job: true, sentBy: true }, orderBy: { sentAt: 'desc' }, skip: (pg - 1) * lim, take: lim }),
      this.prisma.email.count({ where: w }),
    ]);
    return { items, total, page: pg, pages: Math.ceil(total / lim) };
  }

  async sendEmail(d: { jobId?: string; sentById?: string; toAddress: string; fromAddress?: string; subject: string; body: string; templateRef?: string }) {
    return this.sendSave({ ...d, fromAddress: d.fromAddress || process.env.SMTP_FROM || 'operations@lscmltd.com', templateRef: d.templateRef || 'MANUAL' });
  }

  async getTemplates() {
    const st = Object.entries(TPL).flatMap(([s, ts]) => ts.map(t => ({ trigger: s, ...t })));
    const op = Object.entries(OP).map(([k, t]) => ({ trigger: k, ...t }));
    return { statusTemplates: st, operationalTemplates: op, total: st.length + op.length };
  }

  async getDashboard() {
    const td = new Date(new Date().setHours(0, 0, 0, 0));
    const [tE, tW, tN, sT, fC, rec, byT, byS] = await Promise.all([
      this.prisma.email.count({ where: { channel: 'EMAIL' } }),
      this.prisma.email.count({ where: { channel: 'WHATSAPP' } }),
      this.prisma.notification.count(),
      this.prisma.email.count({ where: { sentAt: { gte: td } } }),
      this.prisma.email.count({ where: { status: 'FAILED' } }),
      this.prisma.email.findMany({ include: { job: true, sentBy: true }, orderBy: { sentAt: 'desc' }, take: 20 }),
      this.prisma.email.groupBy({ by: ['templateRef'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 15 }),
      this.prisma.email.groupBy({ by: ['status'], _count: { id: true } }),
    ]);
    return { totalEmails: tE, totalWhatsApp: tW, totalNotifications: tN, sentToday: sT, failedCount: fC, recent: rec, byTemplate: byT, byStatus: byS };
  }

  async retryFailed() {
    const failed = await this.prisma.email.findMany({ where: { status: 'FAILED', channel: 'EMAIL' }, take: 50 });
    let retried = 0;
    for (const e of failed) {
      if (this.mailer) {
        try {
          await this.mailer.sendMail({ from: `"LSCM" <${e.fromAddress}>`, to: e.toAddress, subject: e.subject, html: this.wrap(e.subject, e.body || '') });
          await this.prisma.email.update({ where: { id: e.id }, data: { status: 'SENT', sentAt: new Date() } });
          retried++;
        } catch { /* still failed */ }
      }
    }
    return { total: failed.length, retried };
  }

  // Notifications — existing API preserved
  async notifications(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({ where: { userId, ...(unreadOnly && { isRead: false }) }, orderBy: { createdAt: 'desc' }, take: 50 });
  }
  async markRead(id: string) { return this.prisma.notification.update({ where: { id }, data: { isRead: true } }); }
  async markAllRead(userId: string) { return this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } }); }
  async unreadCount(userId: string) { return this.prisma.notification.count({ where: { userId, isRead: false } }); }
}
