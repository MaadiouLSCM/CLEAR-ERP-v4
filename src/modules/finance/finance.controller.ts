import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Finance & Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private svc: FinanceService) {}

  // ── Dashboard ──
  @Get('dashboard') @ApiOperation({ summary: 'Finance dashboard — AR, AP, revenue, profit, collection rate' })
  dashboard() { return this.svc.dashboard(); }

  // ── LSCM Invoices (AR) ──
  @Get('invoices') @ApiOperation({ summary: 'List LSCM invoices with filters' })
  invoices(@Query() q: any) { return this.svc.invoices(q); }

  @Get('invoices/:id') @ApiOperation({ summary: 'Invoice detail with line items and job' })
  invoiceDetail(@Param('id') id: string) { return this.svc.invoiceDetail(id); }

  @Post('invoices') @ApiOperation({ summary: 'Create LSCM invoice (auto-generates number)' })
  createInvoice(@Body() data: any) { return this.svc.createInvoice(data); }

  @Post('invoices/:id/lines') @ApiOperation({ summary: 'Add line item to invoice (auto-recalc total)' })
  addLine(@Param('id') id: string, @Body() data: any) { return this.svc.addLineItem(id, data); }

  @Post('invoices/:id/transition') @ApiOperation({ summary: 'Transition invoice status (DRAFT→SENT→APPROVED→PAID)' })
  transitionInvoice(@Param('id') id: string, @Body() body: { status: string }) {
    return this.svc.transitionInvoice(id, body.status);
  }

  // ── Agent Invoices (AP) ──
  @Get('agent-invoices') @ApiOperation({ summary: 'List agent invoices (AP)' })
  agentInvoices(@Query() q: any) { return this.svc.agentInvoices(q); }

  @Post('agent-invoices') @ApiOperation({ summary: 'Record agent invoice' })
  createAgent(@Body() data: any) { return this.svc.createAgentInvoice(data); }

  @Post('agent-invoices/:id/approve') @ApiOperation({ summary: 'Approve agent invoice' })
  approveAgent(@Param('id') id: string, @Body() body: { approvedBy: string }) {
    return this.svc.approveAgentInvoice(id, body.approvedBy);
  }

  @Post('agent-invoices/:id/transition') @ApiOperation({ summary: 'Transition agent invoice status' })
  transitionAgent(@Param('id') id: string, @Body() body: { status: string; userId?: string }) {
    return this.svc.transitionAgentInvoice(id, body.status, body.userId);
  }

  // ── Cost Sheet ──
  @Get('cost-sheet/:jobId') @ApiOperation({ summary: 'Job cost sheet with agent breakdown (auto-calculated)' })
  costSheet(@Param('jobId') jobId: string) { return this.svc.costSheet(jobId); }

  // ── Billing Engine ──
  @Post('auto-price/:jobId') @ApiOperation({ summary: 'Auto-price job from contract pricing profile' })
  autoPrice(@Param('jobId') jobId: string) { return this.svc.autoPrice(jobId); }

  // ── Reports & Analytics ──
  @Get('aging') @ApiOperation({ summary: 'AR aging report (current, 30, 60, 90, 90+ days)' })
  aging() { return this.svc.agingReport(); }

  @Get('revenue/by-client') @ApiOperation({ summary: 'Revenue breakdown by client' })
  revenueByClient() { return this.svc.revenueByClient(); }

  @Get('revenue/by-corridor') @ApiOperation({ summary: 'Revenue breakdown by corridor' })
  revenueByCorridor() { return this.svc.revenueByCorridor(); }

  @Get('profitability') @ApiOperation({ summary: 'Profitability report by job (margin analysis)' })
  profitability() { return this.svc.profitabilityReport(); }

  @Get('budgets') @ApiOperation({ summary: 'List budgets' })
  @ApiQuery({ name: 'year', required: false })
  budgets(@Query('year') year?: string) { return this.svc.listBudgets(year ? parseInt(year) : undefined); }

  @Post('budgets') @ApiOperation({ summary: 'Create budget' })
  createBudget(@Body() data) { return this.svc.createBudget(data); }

  @Patch('budgets/:id') @ApiOperation({ summary: 'Update budget' })
  updateBudget(@Param('id') id: string, @Body() data) { return this.svc.updateBudget(id, data); }

  @Get('treasury') @ApiOperation({ summary: 'Treasury dashboard — AR/AP, overdue, cash position' })
  treasury() { return this.svc.treasuryDashboard(); }
}
