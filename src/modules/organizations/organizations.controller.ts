import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Organizations & Offices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class OrganizationsController {
  constructor(private prisma: PrismaService) {}

  @Get('organizations')
  @ApiOperation({ summary: 'List organizations with optional type filter' })
  @ApiQuery({ name: 'type', required: false, enum: ['CLIENT', 'SUPPLIER', 'AGENT', 'CARRIER', 'CUSTOMS_BROKER'] })
  async findAll(@Query('type') type?: string) {
    return this.prisma.organization.findMany({
      where: {
        isActive: true,
        ...(type && { type: type as any }),
      },
      orderBy: { name: 'asc' },
    });
  }

  @Get('organizations/:id')
  @ApiOperation({ summary: 'Get organization by ID' })
  async findOne(@Param('id') id: string) {
    return this.prisma.organization.findUnique({ where: { id } });
  }

  @Get('offices')
  @ApiOperation({ summary: 'List all LSCM offices' })
  async getOffices() {
    return this.prisma.lSCMOffice.findMany({
      where: { status: 'ACTIVE' as any },
      orderBy: { name: 'asc' },
    });
  }

  @Get('offices/:id')
  @ApiOperation({ summary: 'Get LSCM office by ID' })
  async getOffice(@Param('id') id: string) {
    return this.prisma.lSCMOffice.findUnique({ where: { id } });
  }

  @Get('corridors')
  @ApiOperation({ summary: 'List all corridors' })
  async getCorridors() {
    return this.prisma.corridor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  @Get('corridors/:id')
  @ApiOperation({ summary: 'Get corridor by ID with lanes' })
  async getCorridor(@Param('id') id: string) {
    return this.prisma.corridor.findUnique({
      where: { id },
      include: { lanes: true },
    });
  }

  @Get('users/expediters')
  @ApiOperation({ summary: 'List users with expediter roles (for assignment)' })
  async getExpediters() {
    return this.prisma.user.findMany({
      where: {
        role: { in: ['EXPEDITER', 'SENIOR_EXPEDITER', 'CEO'] as any[] },
        isActive: true,
      },
      select: { id: true, name: true, email: true, role: true, officeId: true },
      orderBy: { name: 'asc' },
    });
  }
}
