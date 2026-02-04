import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class TransactionsService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string) {
        return this.prisma.transaction.findMany({
            where: { tenantId },
            orderBy: { date: 'desc' }
        });
    }

    async create(tenantId: string, tx: any) {
        return this.prisma.transaction.create({
            data: {
                id: tx.id || `tx-${Date.now()}`,
                tenantId,
                date: new Date(tx.date),
                property: tx.property ?? '',
                category: tx.category ?? '',
                subCategory: tx.subCategory ?? '',
                description: tx.description ?? '',
                amount: tx.amount ?? 0,
                currency: tx.currency ?? 'USD',
                type: tx.type ?? 'expense',
                unitId: tx.unitId ?? null,
                bookingId: tx.bookingId ?? null
            }
        });
    }

    async getCategories(tenantId: string) {
        return this.prisma.transactionCategory.findMany({
            where: { tenantId },
            include: { subCategories: true },
            orderBy: { name: 'asc' }
        });
    }

    async createCategory(tenantId: string, data: { name: string; type: string }) {
        return this.prisma.transactionCategory.create({
            data: {
                id: `cat-${Date.now()}`,
                tenantId,
                name: data.name,
                type: data.type
            },
            include: { subCategories: true }
        });
    }

    async deleteCategory(tenantId: string, id: string) {
        // Verify ownership
        const cat = await this.prisma.transactionCategory.findFirst({
            where: { id, tenantId }
        });
        if (!cat) throw new Error('Category not found');

        return this.prisma.transactionCategory.delete({
            where: { id }
        });
    }

    async createSubCategory(tenantId: string, categoryId: string, name: string) {
        // Verify category exists and belongs to tenant
        const cat = await this.prisma.transactionCategory.findFirst({
            where: { id: categoryId, tenantId }
        });
        if (!cat) throw new Error('Category not found');

        return this.prisma.transactionSubCategory.create({
            data: {
                id: `sub-${Date.now()}`,
                categoryId,
                name
            }
        });
    }

    async deleteSubCategory(tenantId: string, id: string) {
        // Verify ownership via category
        const sub = await this.prisma.transactionSubCategory.findUnique({
            where: { id },
            include: { category: true }
        });

        if (!sub || sub.category.tenantId !== tenantId) {
            throw new Error('Subcategory not found');
        }

        return this.prisma.transactionSubCategory.delete({
            where: { id }
        });
    }

    async updateCategory(tenantId: string, id: string, name: string, type: string) {
        const cat = await this.prisma.transactionCategory.findFirst({ where: { id, tenantId } });
        if (!cat) throw new Error('Category not found');
        return this.prisma.transactionCategory.update({
            where: { id },
            data: { name, type }
        });
    }

    async updateSubCategory(tenantId: string, id: string, name: string) {
        const sub = await this.prisma.transactionSubCategory.findUnique({
            where: { id },
            include: { category: true }
        });
        if (!sub || sub.category.tenantId !== tenantId) throw new Error('Subcategory not found');

        return this.prisma.transactionSubCategory.update({
            where: { id },
            data: { name }
        });
    }

    async syncUnitIncome(tenantId: string, unitId: string) {
        // 1. Get all confirmed bookings for the unit
        const bookings = await this.prisma.booking.findMany({
            where: {
                tenantId,
                unitId,
                status: 'confirmed'
            }
        });

        // 2. Get all transactions for the unit that are linked to a booking
        const transactions = await this.prisma.transaction.findMany({
            where: {
                tenantId,
                unitId,
                bookingId: { not: null }
            }
        });

        const createdTransactions: any[] = [];
        const existingBookingIds = new Set(transactions.map(t => t.bookingId));

        // 3. Create transactions for missing bookings
        for (const booking of bookings) {
            if (!existingBookingIds.has(booking.id)) {
                // Determine category - ideally should be dynamic, but defaulting to 'Rental Income' or creating it
                // For simplicity, we'll use a string literal 'Rental Income' as category
                const tx = await this.create(tenantId, {
                    date: booking.startDate.toISOString(),
                    type: 'income',
                    category: 'Rental Income',
                    subCategory: booking.source, // e.g. Airbnb, Booking.com
                    description: `Booking Income: ${booking.guestName} (${booking.source})`,
                    amount: booking.price,
                    currency: 'USD', // Default
                    property: 'Unit Specific',
                    unitId: unitId,
                    bookingId: booking.id
                });
                createdTransactions.push(tx);
            }
        }

        return { synced: createdTransactions.length, transactions: createdTransactions };
    }
}
