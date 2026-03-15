import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

/**
 * Documents Service
 * Entities: Document, DocumentKit
 * Purpose: Document generation, kits, status tracking, signatures
 * 
 * TODO: Implement business logic per CLEAR ERP v4.2 specs
 * Reference: Entity Registry, Status Map, Orchestration v3.1
 */
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
    return this.prisma.document.findUnique({ where: { id } });
  }

  async create(data: any) {
    return this.prisma.document.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.document.update({ where: { id }, data });
  }

  async kitStatus(jobId: string) {
    const docs = await this.prisma.document.findMany({ where: { jobId } });
    const byKit = docs.reduce((acc, d) => {
      const kit = d.kit || 'UNASSIGNED';
      if (!acc[kit]) acc[kit] = { total: 0, ready: 0 };
      acc[kit].total++;
      if (d.status === 'VERIFIED' || d.status === 'SIGNED_UPLOADED') acc[kit].ready++;
      return acc;
    }, {} as Record<string, { total: number; ready: number }>);
    return { jobId, kits: byKit };
  }

  async jcrReadinessCheck(jobId: string) {
    const docs = await this.prisma.document.findMany({ where: { jobId } });
    const missing = docs.filter((d) => d.status === 'PENDING' || d.status === 'DRAFT');
    return { jobId, ready: missing.length === 0, missingCount: missing.length, missing: missing.map((d) => d.name) };
  }

  async sign(id: string, signedBy: string, signatureData?: string) {
    return this.prisma.document.update({
      where: { id },
      data: { signedBy, signedAt: new Date(), signatureData, status: 'SIGNED_UPLOADED' as any },
    });
  }
}
