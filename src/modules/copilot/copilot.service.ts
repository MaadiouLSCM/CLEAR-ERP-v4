import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

// ══════════════════════════════════════════════════════════════
// CLEAR ERP v7 — Phase 4.4: Copilot AI
// Claude API proxy — context-aware operations assistant
// Graceful fallback if ANTHROPIC_API_KEY not configured
// ══════════════════════════════════════════════════════════════

@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);
  private readonly apiKey: string | undefined;

  constructor(private prisma: PrismaService) {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    if (this.apiKey) { this.logger.log('Copilot AI configured'); }
    else { this.logger.warn('ANTHROPIC_API_KEY not set — Copilot will return guidance only'); }
  }

  async ask(question: string, context?: { jobId?: string; module?: string }) {
    // Build context from database
    let systemContext = 'You are CLEAR Copilot, an AI assistant for LSCM Ltd freight forwarding operations. You help expeditors, managers, and finance teams with operational questions. Be concise and action-oriented. Reference LSCM processes: RFC→BW→QR→Docs→PFI→JEP→Ops→Pickup→Hub→GL→Booking→PreAlert→Transit→Customs→Delivery→POD→JCR→Invoice→Close.';

    if (context?.jobId) {
      const job = await this.prisma.job.findUnique({
        where: { id: context.jobId },
        include: { client: true, corridor: true, expediter: true, documents: true, trackingEvents: { take: 5, orderBy: { timestamp: 'desc' } } },
      });
      if (job) {
        systemContext += `\n\nCurrent job context: ${job.ref} | Client: ${job.client?.name} | Status: ${job.status} | Corridor: ${job.corridor?.name} | Mode: ${job.transportMode} | Items: ${job.totalItems} | Weight: ${job.totalWeightKg}kg | Expediter: ${job.expediter?.name}`;
        if (job.documents?.length) systemContext += `\nDocuments: ${job.documents.map(d => `${d.type}:${d.status}`).join(', ')}`;
        if (job.trackingEvents?.length) systemContext += `\nRecent events: ${job.trackingEvents.map(e => `${e.eventType}: ${e.description}`).join(' | ')}`;
      }
    }

    // Summary stats
    const [activeJobs, overdueT] = await Promise.all([
      this.prisma.job.count({ where: { status: { notIn: ['CLOSED', 'ABORTED'] } } }),
      this.prisma.task.count({ where: { status: { in: ['TODO', 'IN_PROGRESS'] }, dueDate: { lt: new Date() } } }),
    ]);
    systemContext += `\n\nSystem state: ${activeJobs} active jobs, ${overdueT} overdue tasks.`;

    if (!this.apiKey) {
      return {
        answer: `Copilot AI is not configured yet. To enable AI assistance, add ANTHROPIC_API_KEY to your Railway environment variables.\n\nIn the meantime, here are suggestions based on your question:\n\n**Your question:** "${question}"\n\n**Quick guidance:**\n- For job status questions: check the Jobs module or Tracking timeline\n- For document issues: check Documents module → Kit Status\n- For customs: check Customs module → GreenLight status\n- For finance: check Finance → Aging report\n- For overdue tasks: check Tasks → Kanban board\n\nCurrent system: ${activeJobs} active jobs, ${overdueT} overdue tasks.`,
        model: 'fallback',
        configured: false,
      };
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemContext,
          messages: [{ role: 'user', content: question }],
        }),
      });
      const data = await response.json() as any;
      const answer = data.content?.[0]?.text || 'No response received.';
      return { answer, model: data.model || 'claude-sonnet-4-20250514', configured: true, tokensUsed: data.usage?.output_tokens };
    } catch (err: any) {
      this.logger.error(`Copilot API error: ${err.message}`);
      return { answer: `AI request failed: ${err.message}. Please check your ANTHROPIC_API_KEY configuration.`, model: 'error', configured: true };
    }
  }

  async status() {
    return { configured: !!this.apiKey, model: 'claude-sonnet-4-20250514' };
  }
}
