import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Finance & Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private svc: FinanceService) {}

  @Get('dashboard') @ApiOperation({ summary: 'Finance dashboard KPIs' })
  dashboard() { return this.svc.dashboard(); }

  @Get('invoices') @ApiOperation({ summary: 'LSCM invoices (AR)' })
  invoices(@Query() q) { return this.svc.invoices(q); }

  @Post('invoices') @ApiOperation({ summary: 'Create LSCM invoice' })
  createInvoice(@Body() data) { return this.svc.createInvoice(data); }

  @Post('invoices/:id/lines') @ApiOperation({ summary: 'Add line item to invoice' })
  addLine(@Param('id') id: string, @Body() data) { return this.svc.addLineItem(id, data); }

  @Get('agent-invoices') @ApiOperation({ summary: 'Agent invoices (AP)' })
  agentInvoices(@Query() q) { return this.svc.agentInvoices(q); }

  @Post('agent-invoices') @ApiOperation({ summary: 'Record agent invoice' })
  createAgent(@Body() data) { return this.svc.createAgentInvoice(data); }

  @Post('agent-invoices/:id/approve') @ApiOperation({ summary: 'Approve agent invoice' })
  approveAgent(@Param('id') id: string, @Body() body: { approvedBy: string }) { return this.svc.approveAgentInvoice(id, body.approvedBy); }

  @Get('cost-sheet/:jobId') @ApiOperation({ summary: 'Job cost sheet (auto-calculated)' })
  costSheet(@Param('jobId') jobId: string) { return this.svc.costSheet(jobId); }

  @Post('auto-price/:jobId') @ApiOperation({ summary: 'Billing engine: auto-price job from contract' })
  autoPrice(@Param('jobId') jobId: string) { return this.svc.autoPrice(jobId); }
}
