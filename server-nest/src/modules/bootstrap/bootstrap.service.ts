import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class BootstrapService {
  constructor(private prisma: PrismaService) {}

  async getBootstrapData(tenantId: string, user: any, tenant: any) {
    // Get portfolio with units
    const groups = await this.prisma.portfolioGroup.findMany({
      where: { tenantId },
      include: { units: true },
    });

    // Get bookings
    const bookings = await this.prisma.booking.findMany({
      where: { tenantId },
    });

    // Get clients with messages
    const clients = await this.prisma.client.findMany({
      where: { tenantId },
      include: { messages: true },
    });
    const clientsWithMessages = clients.map((c) => ({
      ...c,
      messages: c.messages.map((m) => ({
        ...m,
        attachment: m.attachment ? JSON.parse(m.attachment) : null,
      })),
    }));

    // Get staff
    const staff = await this.prisma.staff.findMany({
      where: { tenantId },
    });

    // Get transactions
    const transactions = await this.prisma.transaction.findMany({
      where: { tenantId },
      orderBy: { date: 'desc' },
    });

    // Get inventory
    const inventory = await this.prisma.inventoryCategory.findMany({
      where: { tenantId },
      include: { items: true },
    });

    // Get channel mappings and ical connections from units
    const channelMappings: any[] = [];
    const icalConnections: any[] = [];

    for (const group of groups) {
      for (const unit of group.units) {
        const mappings = await this.prisma.channelMapping.findMany({
          where: { unitId: unit.id },
        });
        channelMappings.push(...mappings);

        const icals = await this.prisma.icalConnection.findMany({
          where: { unitId: unit.id },
        });
        icalConnections.push(...icals);
      }
    }

    // Get tenant settings
    const tenantData = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const storedOtaConfigs = tenantData?.otaConfigs
      ? JSON.parse(tenantData.otaConfigs)
      : {};
    const otaConfigs = {
      airbnb: { isEnabled: false },
      booking: { isEnabled: false },
      expedia: { isEnabled: false },
      ...storedOtaConfigs,
    };
    const appSettings = {
      waStatus: tenantData?.waStatus ?? 'disconnected',
      autoDraft: tenantData?.autoDraft ?? true,
      tgBotToken: tenantData?.tgBotToken ?? '',
      tgAdminGroupId: tenantData?.tgAdminGroupId ?? '',
      aiApiKey: tenantData?.aiApiKey ?? '',
      aiSystemPrompt:
        tenantData?.aiSystemPrompt ?? 'You are a helpful property manager.',
      ragSensitivity: tenantData?.ragSensitivity ?? 0.7,
    };

    return {
      user,
      tenant,
      portfolio: groups.map((g) => ({
        ...g,
        units: g.units.map((u) => ({
          ...u,
          photos: u.photos ? JSON.parse(u.photos) : [],
        })),
      })),
      bookings,
      clients: clientsWithMessages,
      staff,
      transactions,
      inventory,
      channelMappings,
      icalConnections,
      otaConfigs,
      appSettings,
    };
  }

  async reset(tenantId: string, currentUserId?: string) {
    // 1. Clear everything (except current user if provided)
    await this.clearTenantData(tenantId, currentUserId);

    // 2. Seed with mock data
    await this.seedTenantData(tenantId);

    return { success: true, message: 'Data reset to default demo values' };
  }

  async clear(tenantId: string) {
    await this.clearTenantData(tenantId);
    return { success: true, message: 'All data cleared' };
  }

  private async seedTenantData(tenantId: string) {
    // --- 1. Portfolio & Units ---
    const groupId = `pg-${Date.now()}`;
    await this.prisma.portfolioGroup.create({
      data: {
        id: groupId,
        tenantId,
        name: 'City Center Lofts',
        expanded: true,
      },
    });

    const units = [
      {
        id: `u-101-${Date.now()}`,
        name: 'Loft 101',
        basePrice: 150,
        cleaningFee: 50,
      },
      {
        id: `u-102-${Date.now()}`,
        name: 'Loft 102',
        basePrice: 165,
        cleaningFee: 50,
      },
      {
        id: `u-201-${Date.now()}`,
        name: 'Penthouse Suite',
        basePrice: 350,
        cleaningFee: 100,
      },
    ];

    for (const u of units) {
      await this.prisma.unit.create({
        data: {
          id: u.id,
          groupId,
          name: u.name,
          internalName: u.name,
          basePrice: u.basePrice,
          cleaningFee: u.cleaningFee,
          status: 'Active',
          officialAddress: '123 Main St, Central City',
          wifiSsid: 'ApartEL_Guest',
          wifiPassword: 'welcome-home',
          photos: '[]',
        },
      });
    }

    // --- 2. Staff ---
    const staff = [
      {
        id: `s1-${Date.now()}`,
        name: 'Alice Thompson',
        role: 'Manager',
        email: 'alice@apartel.com',
      },
      {
        id: `s2-${Date.now()}`,
        name: 'Bob Wilson',
        role: 'Cleaner',
        email: 'bob@apartel.com',
      },
    ];

    for (const s of staff) {
      await this.prisma.staff.create({
        data: {
          id: s.id,
          tenantId,
          name: s.name,
          role: s.role,
          email: s.email,
          status: 'Active',
          avatar: `https://picsum.photos/seed/${s.name}/100/100`,
          online: Math.random() > 0.5,
          lastActive: new Date(),
        },
      });
    }

    // --- 3. Clients & Messages ---
    const client1Id = `c1-${Date.now()}`;
    await this.prisma.client.create({
      data: {
        id: client1Id,
        tenantId,
        name: 'John Smith',
        phoneNumber: '+1555010022',
        email: 'john.smith@example.com',
        status: 'Replied',
        platform: 'whatsapp',
        lastActive: new Date(),
        avatar: 'https://picsum.photos/seed/john/100/100',
        unreadCount: 0,
        previousBookings: 1,
      },
    });

    await this.prisma.message.createMany({
      data: [
        {
          id: `m1-${Date.now()}`,
          clientId: client1Id,
          text: 'Hi, I would like to check the availability for next weekend.',
          sender: 'client',
          timestamp: new Date(Date.now() - 3600000),
          platform: 'whatsapp',
          status: 'read',
        },
        {
          id: `m2-${Date.now()}`,
          clientId: client1Id,
          text: 'Hello John! Yes, we still have Loft 101 available. Would you like me to reserve it?',
          sender: 'bot',
          timestamp: new Date(Date.now() - 3000000),
          platform: 'whatsapp',
          status: 'read',
        },
      ],
    });

    // --- 4. Bookings ---
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const endWeek = new Date(nextWeek);
    endWeek.setDate(endWeek.getDate() + 3);

    await this.prisma.booking.create({
      data: {
        id: `b1-${Date.now()}`,
        tenantId,
        unitId: units[0].id,
        guestName: 'John Smith',
        guestPhone: '+1555010022',
        startDate: nextWeek,
        endDate: endWeek,
        source: 'direct',
        status: 'confirmed',
        price: units[0].basePrice * 3 + units[0].cleaningFee,
        createdAt: new Date(),
      },
    });

    // --- 5. Inventory ---
    const cat1Id = `cat1-${Date.now()}`;
    await this.prisma.inventoryCategory.create({
      data: {
        id: cat1Id,
        tenantId,
        name: 'Bedding & Linen',
      },
    });

    await this.prisma.inventoryItem.createMany({
      data: [
        {
          id: `i1-${Date.now()}`,
          categoryId: cat1Id,
          name: 'Pillow Cases',
          quantity: 24,
        },
        {
          id: `i2-${Date.now()}`,
          categoryId: cat1Id,
          name: 'White Bed Sheets (King)',
          quantity: 12,
        },
      ],
    });

    // --- 6. Transactions ---
    await this.prisma.transaction.create({
      data: {
        id: `t1-${Date.now()}`,
        tenantId,
        date: new Date().toISOString(),
        property: units[0].name,
        category: 'Accommodation',
        subCategory: 'Booking Revenue',
        description: 'Direct booking #b1 payment',
        amount: units[0].basePrice * 3,
        currency: 'USD',
        type: 'income',
      },
    });
  }

  private async clearTenantData(tenantId: string, excludeStaffId?: string) {
    // Get all portfolio groups for this tenant
    const groups = await this.prisma.portfolioGroup.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const groupIds = groups.map((g) => g.id);

    // Get all units
    const units = await this.prisma.unit.findMany({
      where: { groupId: { in: groupIds } },
      select: { id: true },
    });
    const unitIds = units.map((u) => u.id);

    // Get all clients
    const clients = await this.prisma.client.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const clientIds = clients.map((c) => c.id);

    // Get all inventory categories
    const categories = await this.prisma.inventoryCategory.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const categoryIds = categories.map((c) => c.id);

    // Delete in correct order (foreign keys)
    await this.prisma.message.deleteMany({
      where: { clientId: { in: clientIds } },
    });
    await this.prisma.client.deleteMany({ where: { tenantId } });
    await this.prisma.booking.deleteMany({ where: { tenantId } });
    await this.prisma.staff.deleteMany({
      where: {
        tenantId,
        id: excludeStaffId ? { not: excludeStaffId } : undefined,
      },
    });
    await this.prisma.transaction.deleteMany({ where: { tenantId } });
    await this.prisma.channelMapping.deleteMany({
      where: { unitId: { in: unitIds } },
    });
    await this.prisma.icalConnection.deleteMany({
      where: { unitId: { in: unitIds } },
    });
    await this.prisma.inventoryItem.deleteMany({
      where: { categoryId: { in: categoryIds } },
    });
    await this.prisma.inventoryCategory.deleteMany({ where: { tenantId } });
    await this.prisma.unit.deleteMany({ where: { groupId: { in: groupIds } } });
    await this.prisma.portfolioGroup.deleteMany({ where: { tenantId } });
  }
}
