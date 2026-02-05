import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.staff.findMany({
      where: { tenantId },
    });
  }

  async create(tenantId: string, member: any) {
    if (!member?.email) throw new ConflictException('email required');

    // SQLite doesn't support mode:'insensitive'
    const allStaff = await this.prisma.staff.findMany();
    const existing = allStaff.find(
      (s) => s.email.toLowerCase() === member.email.toLowerCase(),
    );
    if (existing) {
      throw new ConflictException('Staff with this email already exists');
    }

    return this.prisma.staff.create({
      data: {
        id: member.id || `u-${Date.now()}`,
        tenantId,
        name: member.name ?? member.email.split('@')[0],
        role: member.role ?? 'Staff',
        email: member.email,
        phone: member.phone ?? '',
        avatar:
          member.avatar ?? `https://picsum.photos/seed/${Date.now()}/100/100`,
        status: member.status ?? 'Active',
        unreadCount: member.unreadCount ?? 0,
        online: false,
        lastActive: new Date(),
      },
    });
  }

  async update(tenantId: string, id: string, updates: any) {
    const staff = await this.prisma.staff.findFirst({
      where: { id, tenantId },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    const { id: _, tenantId: __, ...rest } = updates;
    return this.prisma.staff.update({
      where: { id },
      data: rest,
    });
  }

  async remove(tenantId: string, id: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id, tenantId },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    await this.prisma.staff.delete({ where: { id } });
    return { ok: true };
  }
}
