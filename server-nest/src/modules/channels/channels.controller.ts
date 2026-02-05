import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantId } from '../auth/user.decorator';

@Controller('channels')
@UseGuards(AuthGuard)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get('mappings')
  getMappings(@TenantId() tenantId: string) {
    return this.channelsService.getMappings(tenantId);
  }

  @Put('mappings')
  updateMappings(@TenantId() tenantId: string, @Body() list: any[]) {
    return this.channelsService.updateMappings(tenantId, list);
  }

  @Get('ical')
  getIcal(@TenantId() tenantId: string) {
    return this.channelsService.getIcal(tenantId);
  }

  @Put('ical')
  updateIcal(@TenantId() tenantId: string, @Body() list: any[]) {
    return this.channelsService.updateIcal(tenantId, list);
  }

  @Get('ota')
  getOta(@TenantId() tenantId: string) {
    return this.channelsService.getOta(tenantId);
  }

  @Put('ota')
  updateOta(@TenantId() tenantId: string, @Body() configs: any) {
    return this.channelsService.updateOta(tenantId, configs);
  }

  @Post('sync')
  sync(@TenantId() tenantId: string) {
    return this.channelsService.sync(tenantId);
  }
}
