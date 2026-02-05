import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async getTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return {
      ...tenant,
      features: tenant.features ? JSON.parse(tenant.features) : {},
    };
  }

  async updateTenant(tenantId: string, updates: any) {
    const { plan, maxUnits, features } = updates;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const currentFeatures = tenant.features ? JSON.parse(tenant.features) : {};
    const updatedFeatures = features
      ? { ...currentFeatures, ...features }
      : currentFeatures;

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(plan && { plan }),
        ...(typeof maxUnits === 'number' && { maxUnits }),
        features: JSON.stringify(updatedFeatures),
      },
    });

    return {
      ...updated,
      features: JSON.parse(updated.features || '{}'),
    };
  }
}
