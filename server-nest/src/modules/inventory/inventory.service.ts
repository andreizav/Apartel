import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';

import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class InventoryService {
    constructor(
        private prisma: PrismaService,
        private transactionsService: TransactionsService
    ) { }

    async findAll(tenantId: string) {
        const categories = await this.prisma.inventoryCategory.findMany({
            where: { tenantId },
            include: { items: true }
        });
        return categories;
    }

    async update(tenantId: string, inventory: any[]) {
        if (!Array.isArray(inventory)) throw new BadRequestException('inventory must be an array');

        await this.prisma.$transaction(async (tx) => {
            for (const category of inventory) {
                // 1. Upsert the Category
                await tx.inventoryCategory.upsert({
                    where: { id: category.id },
                    update: {
                        name: category.name
                    },
                    create: {
                        id: category.id,
                        tenantId,
                        name: category.name
                    }
                });

                // 2. Upsert the Items within the category
                for (const item of (category.items || [])) {
                    await tx.inventoryItem.upsert({
                        where: { id: item.id },
                        update: {
                            categoryId: category.id,
                            name: item.name,
                            quantity: item.quantity ?? 0,
                            price: item.price ?? 0,
                            unitId: item.unitId
                        },
                        create: {
                            id: item.id,
                            categoryId: category.id,
                            name: item.name,
                            quantity: item.quantity ?? 0,
                            price: item.price ?? 0,
                            unitId: item.unitId
                        }
                    });
                }
            }
        });

        return this.findAll(tenantId);
    }
    async refillItem(tenantId: string, categoryId: string, itemId: string, quantity: number, price: number) {
        // 1. Find the Category and Item to verify ownership and get names
        const category = await this.prisma.inventoryCategory.findFirst({
            where: { id: categoryId, tenantId },
            include: { items: { where: { id: itemId } } }
        });

        if (!category || !category.items[0]) {
            throw new BadRequestException('Category or Item not found');
        }

        const item = category.items[0];

        // 2. Calculate new quantity
        const newQuantity = (item.quantity || 0) + quantity;

        // 3. Update Inventory Item
        await this.prisma.inventoryItem.update({
            where: { id: itemId },
            data: {
                quantity: newQuantity,
                price: price // Update price to latest refill price
            }
        });

        // 4. Create Expense Transaction
        /* 
           We use the TransactionsService to ensure consistency. 
           However, since TransactionsService expects specific inputs, we'll formatting the data here.
           Calculated Amount = Quantity * Price
        */
        const amount = quantity * price;
        if (amount > 0) {
            await this.transactionsService.create(tenantId, {
                date: new Date().toISOString(),
                type: 'expense',
                category: category.name,
                subCategory: item.name,
                description: `Inventory Refill: ${quantity}x ${item.name}`,
                amount: amount,
                currency: 'USD', // Defaulting to USD as per current simplified implementation
                property: item.unitId ? 'Unit Specific' : 'General', // Simple logic for property
                unitId: item.unitId // Pass unitId if available
            });
        }

        return this.findAll(tenantId);
    }

    async updateStock(tenantId: string, itemId: string, quantityDelta: number) {
        // 1. Verify item existence and ownership
        const item = await this.prisma.inventoryItem.findFirst({
            where: { id: itemId, category: { tenantId } }
        });

        if (!item) {
            throw new BadRequestException('Item not found');
        }

        // 2. Update quantity
        const newQuantity = (item.quantity || 0) + quantityDelta;

        await this.prisma.inventoryItem.update({
            where: { id: itemId },
            data: { quantity: newQuantity }
        });

        return { success: true, newQuantity };
    }
}
