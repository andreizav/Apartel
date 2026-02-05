import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class BootstrapService {
    constructor(private prisma: PrismaService) { }

    async getBootstrapData(tenantId: string, user: any, tenant: any) {
        // Get portfolio with units
        const groups = await this.prisma.portfolioGroup.findMany({
            where: { tenantId },
            include: { units: true }
        });

        // Get bookings
        const bookings = await this.prisma.booking.findMany({
            where: { tenantId }
        });

        // Get clients with messages
        const clients = await this.prisma.client.findMany({
            where: { tenantId },
            include: { messages: true }
        });
        const clientsWithMessages = clients.map(c => ({
            ...c,
            messages: c.messages.map(m => ({
                ...m,
                attachment: m.attachment ? JSON.parse(m.attachment) : null
            }))
        }));

        // Get staff
        const staff = await this.prisma.staff.findMany({
            where: { tenantId }
        });

        // Get transactions
        const transactions = await this.prisma.transaction.findMany({
            where: { tenantId },
            orderBy: { date: 'desc' }
        });

        // Get inventory
        const inventory = await this.prisma.inventoryCategory.findMany({
            where: { tenantId },
            include: { items: true }
        });

        // Get channel mappings and ical connections from units
        const channelMappings: any[] = [];
        const icalConnections: any[] = [];

        for (const group of groups) {
            for (const unit of group.units) {
                const mappings = await this.prisma.channelMapping.findMany({
                    where: { unitId: unit.id }
                });
                channelMappings.push(...mappings);

                const icals = await this.prisma.icalConnection.findMany({
                    where: { unitId: unit.id }
                });
                icalConnections.push(...icals);
            }
        }

        // Get tenant settings
        const tenantData = await this.prisma.tenant.findUnique({
            where: { id: tenantId }
        });

        const storedOtaConfigs = tenantData?.otaConfigs ? JSON.parse(tenantData.otaConfigs) : {};
        const otaConfigs = {
            airbnb: { isEnabled: false },
            booking: { isEnabled: false },
            expedia: { isEnabled: false },
            ...storedOtaConfigs
        };
        const appSettings = {
            waStatus: tenantData?.waStatus ?? 'disconnected',
            autoDraft: tenantData?.autoDraft ?? true,
            tgBotToken: tenantData?.tgBotToken ?? '',
            tgAdminGroupId: tenantData?.tgAdminGroupId ?? '',
            aiApiKey: tenantData?.aiApiKey ?? '',
            aiSystemPrompt: tenantData?.aiSystemPrompt ?? 'You are a helpful property manager.',
            ragSensitivity: tenantData?.ragSensitivity ?? 0.7
        };

        return {
            user,
            tenant,
            portfolio: groups.map(g => ({
                ...g,
                units: g.units.map(u => ({
                    ...u,
                    photos: u.photos ? JSON.parse(u.photos) : []
                }))
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
                expanded: true
            }
        });

        const units = [
            { id: `u-101-${Date.now()}`, name: 'Loft 101', basePrice: 150, cleaningFee: 50, photos: JSON.stringify([{ url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=800&auto=format&fit=crop', caption: 'Living Room' }]) },
            { id: `u-102-${Date.now()}`, name: 'Loft 102', basePrice: 165, cleaningFee: 50, photos: JSON.stringify([{ url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop', caption: 'Bedroom' }]) },
            { id: `u-201-${Date.now()}`, name: 'Penthouse Suite', basePrice: 350, cleaningFee: 100, photos: JSON.stringify([{ url: 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?q=80&w=800&auto=format&fit=crop', caption: 'View' }]) }
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
                    photos: u.photos
                }
            });
        }

        // --- 2. Staff ---
        const staff = [
            { id: `s1-${Date.now()}`, name: 'Alice Thompson', role: 'Details Manager', email: 'alice@apartel.com' },
            { id: `s2-${Date.now()}`, name: 'Bob Wilson', role: 'Cleaner', email: 'bob@apartel.com' }
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
                    avatar: `https://ui-avatars.com/api/?name=${s.name}&background=random`,
                    online: Math.random() > 0.5,
                    lastActive: new Date()
                }
            });
        }

        // --- 3. Transaction Categories (P&L) ---
        // Income
        const incCatId = `tc-inc-${Date.now()}`;
        await this.prisma.transactionCategory.create({
            data: {
                id: incCatId,
                tenantId,
                name: 'Accommodation',
                type: 'income',
                subCategories: {
                    create: [
                        { id: `tsc-book-${Date.now()}`, name: 'Booking Revenue' },
                        { id: `tsc-clean-${Date.now()}`, name: 'Cleaning Fee' }
                    ]
                }
            }
        });

        // Expenses
        const expCat1 = `tc-exp1-${Date.now()}`;
        await this.prisma.transactionCategory.create({
            data: {
                id: expCat1,
                tenantId,
                name: 'Operations',
                type: 'expense',
                subCategories: { create: [{ id: `tsc-ut-${Date.now()}`, name: 'Utilities' }, { id: `tsc-int-${Date.now()}`, name: 'Internet' }] }
            }
        });
        const expCat2 = `tc-exp2-${Date.now()}`;
        await this.prisma.transactionCategory.create({
            data: {
                id: expCat2,
                tenantId,
                name: 'Maintenance',
                type: 'expense',
                subCategories: { create: [{ id: `tsc-rep-${Date.now()}`, name: 'Repairs' }, { id: `tsc-sup-${Date.now()}`, name: 'Supplies' }] }
            }
        });

        // --- 4. Clients & Messages ---
        const client1Id = `c1-${Date.now()}`;
        const client2Id = `c2-${Date.now()}`;

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
                avatar: 'https://ui-avatars.com/api/?name=John+Smith&background=0D8ABC&color=fff',
                unreadCount: 0,
                previousBookings: 2
            }
        });

        await this.prisma.client.create({
            data: {
                id: client2Id,
                tenantId,
                name: 'Sarah Connor',
                phoneNumber: '+15550998877',
                email: 'sarah@example.com',
                status: 'Confirmed',
                platform: 'telegram',
                lastActive: new Date(),
                avatar: 'https://ui-avatars.com/api/?name=Sarah+Connor&background=random',
                unreadCount: 1,
                previousBookings: 0
            }
        });

        await this.prisma.message.createMany({
            data: [
                { id: `m1-${Date.now()}`, clientId: client1Id, text: 'Hi, checking availability for next weekend.', sender: 'client', timestamp: new Date(Date.now() - 86400000), platform: 'whatsapp', status: 'read' },
                { id: `m2-${Date.now()}`, clientId: client1Id, text: 'We have Loft 101 available!', sender: 'bot', timestamp: new Date(Date.now() - 86000000), platform: 'whatsapp', status: 'read' },
                { id: `m3-${Date.now()}`, clientId: client2Id, text: 'Is the wifi fast?', sender: 'client', timestamp: new Date(), platform: 'telegram', status: 'delivered' }
            ]
        });

        // --- 5. Bookings & Transactions ---
        const now = new Date();
        const pastStart = new Date(now); pastStart.setDate(now.getDate() - 10);
        const pastEnd = new Date(now); pastEnd.setDate(now.getDate() - 5);

        const currentStart = new Date(now); currentStart.setDate(now.getDate() - 1);
        const currentEnd = new Date(now); currentEnd.setDate(now.getDate() + 3);

        const futureStart = new Date(now); futureStart.setDate(now.getDate() + 10);
        const futureEnd = new Date(now); futureEnd.setDate(now.getDate() + 15);

        // Past Booking
        await this.prisma.booking.create({
            data: {
                id: `b-past-${Date.now()}`, tenantId, unitId: units[0].id,
                guestName: 'Past Guest', guestPhone: '+1000001',
                startDate: pastStart, endDate: pastEnd,
                source: 'airbnb', status: 'checked_out',
                price: 500, createdAt: pastStart
            }
        });
        // Income for past booking
        await this.prisma.transaction.create({
            data: {
                id: `t-inc-1-${Date.now()}`, tenantId, date: pastStart.toISOString(),
                property: units[0].name, category: 'Accommodation', subCategory: 'Booking Revenue',
                description: 'Airbnb Payout #123', amount: 500, currency: 'USD', type: 'income',
                unitId: units[0].id
            }
        });

        // Current Booking
        await this.prisma.booking.create({
            data: {
                id: `b-curr-${Date.now()}`, tenantId, unitId: units[1].id,
                guestName: 'John Smith', guestPhone: '+1555010022',
                startDate: currentStart, endDate: currentEnd,
                source: 'direct', status: 'checked_in',
                price: 600, createdAt: currentStart
            }
        });

        // Future Booking
        await this.prisma.booking.create({
            data: {
                id: `b-fut-${Date.now()}`, tenantId, unitId: units[2].id,
                guestName: 'Future Guest', guestPhone: '+1000002',
                startDate: futureStart, endDate: futureEnd,
                source: 'booking', status: 'confirmed',
                price: 1500, createdAt: now
            }
        });

        // Random Expenses
        await this.prisma.transaction.create({
            data: {
                id: `t-exp-1-${Date.now()}`, tenantId, date: new Date().toISOString(),
                property: units[1].name, category: 'Operations', subCategory: 'Internet',
                description: 'Monthly Fiber Bill', amount: 65, currency: 'USD', type: 'expense',
                unitId: units[1].id
            }
        });

        // --- 6. Inventory ---
        const bedCat = `cat-bed-${Date.now()}`;
        const bathCat = `cat-bath-${Date.now()}`;

        await this.prisma.inventoryCategory.create({ data: { id: bedCat, tenantId, name: 'Bedding' } });
        await this.prisma.inventoryCategory.create({ data: { id: bathCat, tenantId, name: 'Bathroom' } });

        await this.prisma.inventoryItem.createMany({
            data: [
                { id: `i1-${Date.now()}`, categoryId: bedCat, name: 'King Sheets', quantity: 15, price: 45 },
                { id: `i2-${Date.now()}`, categoryId: bedCat, name: 'Pillows', quantity: 20, price: 15 },
                { id: `i3-${Date.now()}`, categoryId: bathCat, name: 'Shampoo (Bottle)', quantity: 5, price: 8 }, // Low stock
                { id: `i4-${Date.now()}`, categoryId: bathCat, name: 'Towels', quantity: 30, price: 12 }
            ]
        });

        // --- 7. Channel Mappings ---
        await this.prisma.channelMapping.create({
            data: {
                id: `cm-${Date.now()}`, unitId: units[1].id,
                unitName: units[1].name, groupName: 'City Center Lofts',
                airbnbId: 'ab-123456', status: 'Mapped', isMapped: true,
                markup: 15
            }
        });
    }

    private async clearTenantData(tenantId: string, excludeStaffId?: string) {
        // Get all portfolio groups for this tenant
        const groups = await this.prisma.portfolioGroup.findMany({
            where: { tenantId },
            select: { id: true }
        });
        const groupIds = groups.map(g => g.id);

        // Get all units
        const units = await this.prisma.unit.findMany({
            where: { groupId: { in: groupIds } },
            select: { id: true }
        });
        const unitIds = units.map(u => u.id);

        // Get all clients
        const clients = await this.prisma.client.findMany({
            where: { tenantId },
            select: { id: true }
        });
        const clientIds = clients.map(c => c.id);

        // Get all inventory categories
        const categories = await this.prisma.inventoryCategory.findMany({
            where: { tenantId },
            select: { id: true }
        });
        const categoryIds = categories.map(c => c.id);

        // Delete in correct order (foreign keys)
        await this.prisma.message.deleteMany({ where: { clientId: { in: clientIds } } });
        await this.prisma.client.deleteMany({ where: { tenantId } });
        await this.prisma.booking.deleteMany({ where: { tenantId } });
        await this.prisma.staff.deleteMany({
            where: {
                tenantId,
                id: excludeStaffId ? { not: excludeStaffId } : undefined
            }
        });
        await this.prisma.transaction.deleteMany({ where: { tenantId } });
        await this.prisma.channelMapping.deleteMany({ where: { unitId: { in: unitIds } } });
        await this.prisma.icalConnection.deleteMany({ where: { unitId: { in: unitIds } } });
        await this.prisma.inventoryItem.deleteMany({ where: { categoryId: { in: categoryIds } } });
        await this.prisma.inventoryCategory.deleteMany({ where: { tenantId } });
        await this.prisma.unit.deleteMany({ where: { groupId: { in: groupIds } } });
        await this.prisma.portfolioGroup.deleteMany({ where: { tenantId } });
    }
}
