import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class ChannelsService {
  constructor(private prisma: PrismaService) {}

  async getMappings(tenantId: string) {
    // Get all units for this tenant to find their mappings
    const groups = await this.prisma.portfolioGroup.findMany({
      where: { tenantId },
      include: { units: { include: { channelMappings: true } } },
    });

    const mappings: any[] = [];
    groups.forEach((g) => {
      g.units.forEach((u) => {
        u.channelMappings.forEach((m) => mappings.push(m));
      });
    });
    return mappings;
  }

  async updateMappings(tenantId: string, list: any[]) {
    if (!Array.isArray(list))
      throw new BadRequestException('channelMappings must be an array');

    for (const mapping of list) {
      await this.prisma.channelMapping.upsert({
        where: { id: mapping.id },
        update: {
          unitName: mapping.unitName,
          groupName: mapping.groupName,
          airbnbId: mapping.airbnbId,
          bookingId: mapping.bookingId,
          markup: mapping.markup,
          isMapped: mapping.isMapped,
          status: mapping.status,
        },
        create: {
          id: mapping.id,
          unitId: mapping.unitId,
          unitName: mapping.unitName,
          groupName: mapping.groupName,
          airbnbId: mapping.airbnbId ?? '',
          bookingId: mapping.bookingId ?? '',
          markup: mapping.markup ?? 0,
          isMapped: mapping.isMapped ?? false,
          status: mapping.status ?? 'Inactive',
        },
      });
    }

    return this.getMappings(tenantId);
  }

  async getIcal(tenantId: string) {
    const groups = await this.prisma.portfolioGroup.findMany({
      where: { tenantId },
      include: { units: { include: { icalConnections: true } } },
    });

    const connections: any[] = [];
    groups.forEach((g) => {
      g.units.forEach((u) => {
        u.icalConnections.forEach((c) => connections.push(c));
      });
    });
    return connections;
  }

  async updateIcal(tenantId: string, list: any[]) {
    if (!Array.isArray(list))
      throw new BadRequestException('icalConnections must be an array');

    for (const conn of list) {
      await this.prisma.icalConnection.upsert({
        where: { id: conn.id },
        update: {
          unitName: conn.unitName,
          importUrl: conn.importUrl,
          exportUrl: conn.exportUrl,
          lastSync: conn.lastSync,
        },
        create: {
          id: conn.id,
          unitId: conn.unitId,
          unitName: conn.unitName,
          importUrl: conn.importUrl ?? '',
          exportUrl: conn.exportUrl ?? '',
          lastSync: conn.lastSync ?? 'Never',
        },
      });
    }

    return this.getIcal(tenantId);
  }

  async getOta(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant.otaConfigs ? JSON.parse(tenant.otaConfigs) : {};
  }

  async updateOta(tenantId: string, configs: any) {
    if (typeof configs !== 'object')
      throw new BadRequestException('otaConfigs must be an object');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const currentConfigs = tenant.otaConfigs
      ? JSON.parse(tenant.otaConfigs)
      : {};
    const updatedConfigs = { ...currentConfigs, ...configs };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { otaConfigs: JSON.stringify(updatedConfigs) },
    });

    return updatedConfigs;
  }

  async sync(tenantId: string) {
    const groups = await this.prisma.portfolioGroup.findMany({
      where: { tenantId },
      include: { units: true },
    });

    const allUnits: { unit: any; groupName: string }[] = [];
    groups.forEach((g) => {
      g.units.forEach((u) => allUnits.push({ unit: u, groupName: g.name }));
    });

    const currentMappings = await this.getMappings(tenantId);
    const currentIcals = await this.getIcal(tenantId);
    const updatedMappings: any[] = [];
    const updatedIcals: any[] = [];

    for (const { unit, groupName } of allUnits) {
      const existingMap = currentMappings.find(
        (m: any) => m.unitId === unit.id,
      );
      if (existingMap) {
        await this.prisma.channelMapping.update({
          where: { id: existingMap.id },
          data: { unitName: unit.name, groupName },
        });
        updatedMappings.push({
          ...existingMap,
          unitName: unit.name,
          groupName,
        });
      } else {
        const newMapping = await this.prisma.channelMapping.create({
          data: {
            id: `cm-${unit.id}`,
            unitId: unit.id,
            unitName: unit.name,
            groupName,
            airbnbId: '',
            bookingId: '',
            markup: 0,
            isMapped: false,
            status: 'Inactive',
          },
        });
        updatedMappings.push(newMapping);
      }

      const existingIcal = currentIcals.find((i: any) => i.unitId === unit.id);
      if (existingIcal) {
        await this.prisma.icalConnection.update({
          where: { id: existingIcal.id },
          data: { unitName: unit.name },
        });
        updatedIcals.push({ ...existingIcal, unitName: unit.name });
      } else {
        const newIcal = await this.prisma.icalConnection.create({
          data: {
            id: `ical-${unit.id}`,
            unitId: unit.id,
            unitName: unit.name,
            importUrl: '',
            exportUrl: `https://api.apartel.app/cal/${tenantId}/${unit.id}.ics`,
            lastSync: 'Never',
          },
        });
        updatedIcals.push(newIcal);
      }
    }

    return { channelMappings: updatedMappings, icalConnections: updatedIcals };
  }

  @Cron('0 */15 * * * *')
  async handleCron() {
    console.log('[Channels] Starting scheduled iCal sync...');

    const tenants = await this.prisma.tenant.findMany();

    for (const tenant of tenants) {
      const connections = await this.getIcal(tenant.id);

      for (const conn of connections) {
        if (conn.importUrl) {
          console.log(
            `[Channels] Syncing iCal for tenant ${tenant.id}, unit ${conn.unitId} from ${conn.importUrl}`,
          );
          // Mock sync: Just update timestamp
          await this.prisma.icalConnection.update({
            where: { id: conn.id },
            data: { lastSync: new Date().toISOString() },
          });
        }
      }
    }

    console.log('[Channels] Sync completed.');
  }
}
