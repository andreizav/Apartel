import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class InventoryService {
    constructor(private prisma: PrismaService) { }

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
}
