import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class TrackingService {
  constructor(private prisma: PrismaService) {}

  async timeline(jobId: string) {
    return this.prisma.trackingEvent.findMany({
      where: { jobId },
      include: { shipment: true, box: true, photos: true },
      orderBy: { timestamp: 'desc' },
    });
  }

  async createEvent(data: { jobId: string; shipmentId?: string; boxId?: string; eventType: string; description: string; location?: string; lat?: number; lng?: number; createdBy?: string }) {
    return this.prisma.trackingEvent.create({ data, include: { photos: true } });
  }

  async addPhoto(data: { jobId?: string; trackingEventId?: string; url: string; caption?: string; gpsLat?: number; gpsLng?: number }) {
    return this.prisma.photo.create({ data });
  }

  async shipmentTracking(shipmentId: string) {
    return this.prisma.trackingEvent.findMany({
      where: { shipmentId },
      include: { photos: true },
      orderBy: { timestamp: 'asc' },
    });
  }

  async latestByJob(jobId: string) {
    return this.prisma.trackingEvent.findFirst({
      where: { jobId },
      include: { photos: true },
      orderBy: { timestamp: 'desc' },
    });
  }
}
