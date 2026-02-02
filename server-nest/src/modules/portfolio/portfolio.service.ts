import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class PortfolioService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string) {
        // Get all portfolio groups for this tenant with their units
        const groups = await this.prisma.portfolioGroup.findMany({
            where: { tenantId },
            include: { units: true }
        });
        return groups;
    }

    async update(tenantId: string, portfolio: any[]) {
        if (!Array.isArray(portfolio)) throw new BadRequestException('portfolio must be an array');

        await this.prisma.$transaction(async (tx) => {
            for (const group of portfolio) {
                // 1. Upsert the Group
                await tx.portfolioGroup.upsert({
                    where: { id: group.id },
                    update: {
                        name: group.name,
                        expanded: group.expanded ?? true,
                        isMerge: group.isMerge ?? false
                    },
                    create: {
                        id: group.id,
                        tenantId,
                        name: group.name,
                        expanded: group.expanded ?? true,
                        isMerge: group.isMerge ?? false
                    }
                });

                // 2. Upsert the Units within the group
                for (const u of (group.units || [])) {
                    await tx.unit.upsert({
                        where: { id: u.id },
                        update: {
                            groupId: group.id, // Ensure it's in the correct group
                            name: u.name,
                            internalName: u.internalName,
                            officialAddress: u.officialAddress,
                            basePrice: u.basePrice,
                            cleaningFee: u.cleaningFee,
                            wifiSsid: u.wifiSsid,
                            wifiPassword: u.wifiPassword,
                            accessCodes: u.accessCodes,
                            status: u.status ?? 'Active',
                            assignedCleanerId: u.assignedCleanerId
                        },
                        create: {
                            id: u.id,
                            groupId: group.id,
                            name: u.name,
                            internalName: u.internalName,
                            officialAddress: u.officialAddress,
                            basePrice: u.basePrice,
                            cleaningFee: u.cleaningFee,
                            wifiSsid: u.wifiSsid,
                            wifiPassword: u.wifiPassword,
                            accessCodes: u.accessCodes,
                            status: u.status ?? 'Active',
                            assignedCleanerId: u.assignedCleanerId
                        }
                    });
                }
            }
        });

        return this.findAll(tenantId);
    }

    async removeUnit(tenantId: string, unitId: string) {
        // Verify the unit belongs to this tenant
        const unit = await this.prisma.unit.findUnique({
            where: { id: unitId },
            include: { group: true }
        });
        if (!unit || unit.group.tenantId !== tenantId) {
            throw new NotFoundException('Unit not found');
        }

        // Delete related records first
        await this.prisma.booking.deleteMany({ where: { unitId } });
        await this.prisma.channelMapping.deleteMany({ where: { unitId } });
        await this.prisma.icalConnection.deleteMany({ where: { unitId } });
        await this.prisma.transaction.deleteMany({ where: { property: unit.name } });

        // Delete the unit
        await this.prisma.unit.delete({ where: { id: unitId } });

        // Delete empty merge groups
        const group = await this.prisma.portfolioGroup.findUnique({
            where: { id: unit.groupId },
            include: { units: true }
        });
        if (group && group.isMerge && group.units.length === 0) {
            await this.prisma.portfolioGroup.delete({ where: { id: group.id } });
        }

        // Get updated tenant data to reflect "plan configuration" changes if any
        const updatedTenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId }
        });

        return {
            ok: true,
            tenant: updatedTenant ? {
                ...updatedTenant,
                features: updatedTenant.features ? JSON.parse(updatedTenant.features) : {}
            } : null
        };
    }
}
