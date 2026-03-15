import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

// ── Document definitions with cascade and kit mappings ──
const DOC_DEFINITIONS: Record<string, { name: string; kit: string; requiredStatus?: string[]; cascadeFrom?: string }> = {
  RFC: { name: 'Request for Collection', kit: 'STARTER_KIT' },
  QR_STICKERS: { name: 'QR Code Stickers', kit: 'STARTER_KIT', cascadeFrom: 'RFC' },
  SHIPPING_MARK: { name: 'Shipping Mark Labels', kit: 'STARTER_KIT' },
  VPL: { name: 'Verified Packing List', kit: 'STARTER_KIT', cascadeFrom: 'RFC' },
  PFI: { name: 'Pro-Forma Invoice', kit: 'STARTER_KIT', requiredStatus: ['QUOTATION', 'PFI_SENT'] },
  JEP: { name: 'Job Execution Plan', kit: 'STARTER_KIT', requiredStatus: ['PLANNING', 'JEP_SENT'] },
  SI: { name: 'Shipping Instructions', kit: 'GL_KIT', requiredStatus: ['JEP_SENT', 'OPS_LAUNCHED'] },
  PI: { name: 'Packing Instructions', kit: 'GL_KIT' },
  GL_COVER: { name: 'Greenlight Cover Sheet', kit: 'GL_KIT', requiredStatus: ['GL_SUBMITTED'] },
  BL_AWB_CMR: { name: 'Bill of Lading / Air Waybill / CMR', kit: 'GL_KIT', requiredStatus: ['BOOKING_CONFIRMED'] },
  POC: { name: 'Proof of Collection', kit: 'PRE_ALERT_KIT', requiredStatus: ['PICKUP_COMPLETED'] },
  POR: { name: 'Proof of Receipt', kit: 'PRE_ALERT_KIT', requiredStatus: ['AT_HUB'] },
  PRE_ALERT: { name: 'Pre-Alert', kit: 'PRE_ALERT_KIT', requiredStatus: ['PRE_ALERT_SENT'] },
  POD: { name: 'Proof of Delivery', kit: 'PRE_ALERT_KIT', requiredStatus: ['DELIVERED', 'POD_RECEIVED'] },
  INSPECTION_REPORT: { name: 'Inspection Report', kit: 'JCR_KIT', requiredStatus: ['INSPECTION_DONE'] },
  SURVEY_REPORT: { name: 'Survey Report', kit: 'JCR_KIT' },
  JCR_COVER: { name: 'Job Completion Report', kit: 'JCR_KIT', requiredStatus: ['JCR_PENDING', 'JCR_COMPLETE'] },
  INVOICE: { name: 'LSCM Invoice', kit: 'JCR_KIT', requiredStatus: ['INVOICED'] },
  OSD_REPORT: { name: 'OS&D Report', kit: 'JCR_KIT' },
};

// ── Mandatory docs for JCR ──
const JCR_MANDATORY = ['RFC', 'VPL', 'SI', 'BL_AWB_CMR', 'POC', 'POD', 'SURVEY_REPORT'];

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async findByJob(jobId: string) {
    return this.prisma.document.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    return doc;
  }

  async generate(jobId: string, docType: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);

    const def = DOC_DEFINITIONS[docType];
    if (!def) throw new BadRequestException(`Unknown document type: ${docType}`);

    // Check if already exists
    const existing = await this.prisma.document.findFirst({
      where: { jobId, type: docType as any },
    });
    if (existing) {
      throw new BadRequestException(`Document ${docType} already exists for this job. Use update instead.`);
    }

    // Create document
    const doc = await this.prisma.document.create({
      data: {
        jobId,
        name: `${def.name} — ${job.ref}`,
        type: docType as any,
        kit: def.kit as any,
        status: 'DRAFT' as any,
        generatedAt: new Date(),
        templateRef: `TPL-${docType}-v1`,
      },
    });

    // Create tracking event
    await this.prisma.trackingEvent.create({
      data: {
        jobId,
        eventType: 'DOCUMENT_UPLOAD',
        description: `Document generated: ${def.name} (${docType})`,
        createdBy: userId,
      },
    });

    return doc;
  }

  async create(data: any) {
    return this.prisma.document.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.document.update({ where: { id }, data });
  }

  async kitStatus(jobId: string) {
    const docs = await this.prisma.document.findMany({ where: { jobId } });
    const kits: Record<string, { total: number; ready: number; docs: any[] }> = {};

    for (const d of docs) {
      const kit = (d.kit as string) || 'UNASSIGNED';
      if (!kits[kit]) kits[kit] = { total: 0, ready: 0, docs: [] };
      kits[kit].total++;
      if (['VERIFIED', 'SIGNED_UPLOADED'].includes(d.status as string)) kits[kit].ready++;
      kits[kit].docs.push({ type: d.type, name: d.name, status: d.status });
    }

    return { jobId, kits };
  }

  async jcrReadinessCheck(jobId: string) {
    const docs = await this.prisma.document.findMany({ where: { jobId } });
    const docTypes = docs.map(d => d.type as string);
    const readyTypes = docs.filter(d => ['VERIFIED', 'SIGNED_UPLOADED'].includes(d.status as string)).map(d => d.type as string);

    const missing: string[] = [];
    const pending: string[] = [];

    for (const req of JCR_MANDATORY) {
      if (!docTypes.includes(req)) {
        missing.push(req);
      } else if (!readyTypes.includes(req)) {
        pending.push(req);
      }
    }

    return {
      jobId,
      ready: missing.length === 0 && pending.length === 0,
      missingCount: missing.length + pending.length,
      missing: [...missing.map(m => `${m} (not generated)`), ...pending.map(p => `${p} (not verified)`)],
    };
  }

  async sign(id: string, signedBy: string, signatureData?: string) {
    return this.prisma.document.update({
      where: { id },
      data: {
        signedBy,
        signedAt: new Date(),
        signatureData,
        status: 'SIGNED_UPLOADED' as any,
      },
    });
  }

  async verify(id: string, userId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id }, include: { job: true } });
    if (!doc) throw new NotFoundException();

    const updated = await this.prisma.document.update({
      where: { id },
      data: { status: 'VERIFIED' as any, uploadedAt: new Date() },
    });

    // Track verification
    await this.prisma.trackingEvent.create({
      data: {
        jobId: doc.jobId,
        eventType: 'DOCUMENT_SIGNED',
        description: `Document verified: ${doc.name}`,
        createdBy: userId,
      },
    });

    return updated;
  }
}
