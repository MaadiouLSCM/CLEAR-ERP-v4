import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ComplianceService {
  constructor(private prisma: PrismaService) {}

  async certifications(filters: { officeId?: string; status?: string }) {
    return this.prisma.certification.findMany({
      where: { ...(filters.officeId && { officeId: filters.officeId }), ...(filters.status && { status: filters.status as any }) },
      include: { office: true, audits: { orderBy: { date: 'desc' }, take: 1 }, renewalInstances: { where: { status: { not: 'COMPLETED' } } } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async certDetail(id: string) {
    return this.prisma.certification.findUnique({
      where: { id },
      include: { office: true, audits: { include: { findings: true }, orderBy: { date: 'desc' } }, renewalInstances: { include: { tasks: true, template: true } } },
    });
  }

  async expiringWithin(days: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    return this.prisma.certification.findMany({
      where: { expiryDate: { lte: cutoff }, status: { not: 'EXPIRED' } },
      include: { office: true, renewalInstances: { where: { status: { not: 'COMPLETED' } } } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  // ── RENEWAL ENGINE ──
  async renewalTemplates() {
    return this.prisma.renewalProcessTemplate.findMany({ include: { steps: { orderBy: { stepNumber: 'asc' } } } });
  }

  async activeRenewals() {
    return this.prisma.renewalInstance.findMany({
      where: { status: { not: 'COMPLETED' } },
      include: { certification: { include: { office: true } }, template: true, tasks: { orderBy: { dueDate: 'asc' } } },
      orderBy: { targetExpiryDate: 'asc' },
    });
  }

  async renewalDetail(id: string) {
    return this.prisma.renewalInstance.findUnique({
      where: { id },
      include: { certification: true, template: { include: { steps: { orderBy: { stepNumber: 'asc' } } } }, tasks: { include: { assignee: true }, orderBy: { dueDate: 'asc' } } },
    });
  }

  /**
   * NIGHTLY BATCH: Check all active certifications for renewal triggers
   * For each cert: if today >= (expiryDate - template.totalLeadTimeDays) and no active instance exists → create instance + tasks
   */
  async runRenewalCheck() {
    const certs = await this.prisma.certification.findMany({
      where: { status: { in: ['ACTIVE', 'EXPIRING_SOON'] } },
      include: { renewalInstances: { where: { status: { not: 'COMPLETED' } } } },
    });

    const created: string[] = [];
    for (const cert of certs) {
      if (cert.renewalInstances.length > 0) continue; // already has active renewal
      const template = await this.prisma.renewalProcessTemplate.findUnique({
        where: { certType: cert.certType },
        include: { steps: { orderBy: { stepNumber: 'asc' } } },
      });
      if (!template) continue;

      const triggerDate = new Date(cert.expiryDate);
      triggerDate.setDate(triggerDate.getDate() - template.totalLeadTimeDays);
      if (new Date() < triggerDate) continue; // not yet time

      const instance = await this.prisma.renewalInstance.create({
        data: { certId: cert.id, templateId: template.id, targetExpiryDate: cert.expiryDate, processStartDate: new Date(), status: 'IN_PROGRESS', currentStep: 1, totalSteps: template.steps.length },
      });

      // Create tasks for steps whose trigger date has passed
      for (const step of template.steps) {
        const stepTrigger = new Date(cert.expiryDate);
        stepTrigger.setDate(stepTrigger.getDate() - step.triggerDaysBeforeExpiry);
        if (new Date() >= stepTrigger) {
          const dueDate = new Date(stepTrigger);
          dueDate.setDate(dueDate.getDate() + step.durationDays);

          // Find user with matching role for assignment
          const assignee = await this.prisma.user.findFirst({ where: { role: step.assigneeRole, isActive: true } });
          if (assignee) {
            await this.prisma.task.create({
              data: {
                title: `[${cert.certType}] Renewal — Step ${step.stepNumber}: ${step.stepName}`,
                taskType: 'RENEWAL', priority: 'HIGH', status: step.stepNumber === 1 ? 'TODO' : (step.blocking ? 'BLOCKED' : 'TODO'),
                assigneeId: assignee.id, createdById: assignee.id,
                dueDate, sourceType: 'RENEWAL', sourceId: step.id,
                renewalInstanceId: instance.id,
              },
            });
          }
        }
      }
      created.push(`${cert.certType} (${cert.certNumber})`);
    }
    return { checked: certs.length, renewalsCreated: created.length, details: created };
  }

  // ── AUDITS ──
  async createAudit(data: any) {
    return this.prisma.certificationAudit.create({ data, include: { findings: true } });
  }

  async addFinding(auditId: string, data: any) {
    return this.prisma.auditFinding.create({ data: { ...data, auditId } });
  }
}
