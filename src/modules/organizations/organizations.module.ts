import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [OrganizationsController],
  providers: [PrismaService],
})
export class OrganizationsModule {}
