import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantId } from '../auth/user.decorator';

@Controller('settings')
@UseGuards(AuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(@TenantId() tenantId: string) {
    return this.settingsService.getSettings(tenantId);
  }

  @Put()
  updateSettings(@TenantId() tenantId: string, @Body() settings: any) {
    return this.settingsService.updateSettings(tenantId, settings);
  }

  @Post('telegram/test')
  testTelegram(@Body() body: any) {
    const { token, chatId } = body;
    return this.settingsService.testTelegram(token, chatId);
  }

  @Post('telegram/sync')
  syncTelegram(@TenantId() tenantId: string) {
    return this.settingsService.syncTelegram(tenantId);
  }
}
