import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const clients = await this.prisma.client.findMany({
      where: { tenantId },
      include: { messages: true },
    });
    return clients.map((c) => ({
      ...c,
      messages: c.messages.map((m) => ({
        ...m,
        attachment: m.attachment ? JSON.parse(m.attachment) : null,
      })),
    }));
  }

  async create(tenantId: string, client: any) {
    if (!client?.phoneNumber)
      throw new ConflictException('phoneNumber required');

    const existing = await this.prisma.client.findFirst({
      where: { tenantId, phoneNumber: client.phoneNumber },
    });

    const data = {
      tenantId,
      phoneNumber: client.phoneNumber,
      name: client.name,
      email: client.email || '',
      address: client.address || '',
      country: client.country || '',
      avatar: client.avatar,
      platform: client.platform,
      platformId: client.platformId,
      status: client.status ?? 'New',
      lastActive: client.lastActive ? new Date(client.lastActive) : new Date(),
      createdAt: existing ? existing.createdAt : new Date(),
      unreadCount: client.unreadCount ?? 0,
      online: client.online ?? false,
      previousBookings: client.previousBookings ?? 0,
    };

    if (existing) {
      return this.prisma.client.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.client.create({
      data: {
        id: client.id || `c-${Date.now()}`,
        ...data,
      },
    });
  }

  async update(tenantId: string, phone: string, updates: any) {
    const decodedPhone = decodeURIComponent(phone);
    const client = await this.prisma.client.findFirst({
      where: { tenantId, phoneNumber: decodedPhone },
    });
    if (!client) throw new NotFoundException('Client not found');

    const { phoneNumber: _, tenantId: __, messages: ___, ...rest } = updates;
    return this.prisma.client.update({
      where: { id: client.id },
      data: rest,
    });
  }

  async remove(tenantId: string, phone: string) {
    const decodedPhone = decodeURIComponent(phone);
    const client = await this.prisma.client.findFirst({
      where: { tenantId, phoneNumber: decodedPhone },
    });
    if (!client) throw new NotFoundException('Client not found');

    // Delete messages first (cascade)
    await this.prisma.message.deleteMany({ where: { clientId: client.id } });
    await this.prisma.client.delete({ where: { id: client.id } });
    return { ok: true };
  }
}
