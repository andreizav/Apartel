import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { TelegramService } from '../../shared/telegram.service';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
  ) {}

  async getSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return {
      waStatus: tenant.waStatus ?? 'disconnected',
      autoDraft: tenant.autoDraft ?? true,
      tgBotToken: tenant.tgBotToken ?? '',
      tgAdminGroupId: tenant.tgAdminGroupId ?? '',
      aiApiKey: tenant.aiApiKey ?? '',
      aiSystemPrompt:
        tenant.aiSystemPrompt ?? 'You are a helpful property manager.',
      ragSensitivity: tenant.ragSensitivity ?? 0.7,
    };
  }

  async updateSettings(tenantId: string, settings: any) {
    if (typeof settings !== 'object')
      throw new BadRequestException('appSettings must be an object');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(settings.waStatus !== undefined && { waStatus: settings.waStatus }),
        ...(settings.autoDraft !== undefined && {
          autoDraft: settings.autoDraft,
        }),
        ...(settings.tgBotToken !== undefined && {
          tgBotToken: settings.tgBotToken,
        }),
        ...(settings.tgAdminGroupId !== undefined && {
          tgAdminGroupId: settings.tgAdminGroupId,
        }),
        ...(settings.aiApiKey !== undefined && { aiApiKey: settings.aiApiKey }),
        ...(settings.aiSystemPrompt !== undefined && {
          aiSystemPrompt: settings.aiSystemPrompt,
        }),
        ...(settings.ragSensitivity !== undefined && {
          ragSensitivity: settings.ragSensitivity,
        }),
      },
    });

    return {
      waStatus: updated.waStatus,
      autoDraft: updated.autoDraft,
      tgBotToken: updated.tgBotToken,
      tgAdminGroupId: updated.tgAdminGroupId,
      aiApiKey: updated.aiApiKey,
      aiSystemPrompt: updated.aiSystemPrompt,
      ragSensitivity: updated.ragSensitivity,
    };
  }

  async testTelegram(token: string, chatId: string) {
    if (!token || !chatId) {
      throw new BadRequestException('Missing token or chat ID');
    }

    try {
      const text =
        '🔔 *ApartEl Test Notification*\n\nYour bot is successfully connected! You will receive system alerts here.';
      const result = await this.telegramService.sendMessage(
        token,
        chatId,
        text,
      );
      return { success: true, result };
    } catch (error: any) {
      if (error.message.includes('Telegram Unreachable')) {
        throw new ServiceUnavailableException(
          'Network Error: Cannot reach Telegram servers.',
        );
      }
      throw error;
    }
  }

  async syncTelegram(tenantId: string) {
    const settings = await this.getSettings(tenantId);
    const token = settings.tgBotToken;

    if (!token) {
      throw new BadRequestException('Bot token not configured.');
    }

    try {
      const result = await this.telegramService.syncUpdates(token, tenantId);
      return { success: true, ...result };
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }
}
