import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { TelegramService } from '../../shared/telegram.service';
import { StoreService } from '../../shared/store.service';

@Injectable()
export class NotificationsService {
    constructor(
        private configService: ConfigService,
        private telegramService: TelegramService,
        private storeService: StoreService,
    ) { }

    @OnEvent('booking.created')
    async handleBookingCreated(payload: { booking: any, tenantId: string }) {
        const { booking, tenantId } = payload;
        console.log('⚡ Event received: booking.created', payload);

        // 1. Send Telegram Notification
        await this.sendTelegramNotification(tenantId, booking);

        // 2. Send Email Notification (Stub)
        await this.sendEmailNotification(booking);
    }

    private async sendTelegramNotification(tenantId: string, booking: any) {
        const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
        if (!token) {
            console.warn('[Notifications] No TELEGRAM_BOT_TOKEN configured');
            return;
        }

        const data = this.storeService.getTenantData(tenantId);
        const adminGroupId = data.appSettings.tgAdminGroupId;

        if (!adminGroupId) {
            console.warn(`[Notifications] No Admin Group ID for tenant ${tenantId}`);
            return;
        }

        const message = `
*New Booking Created!*
🆔 ID: \`${booking.id}\`
👤 Guest: ${booking.guestName}
📅 Check-in: ${booking.startDate}
📅 Check-out: ${booking.endDate}
💰 Price: $${booking.price}
Source: ${booking.source}
        `;

        try {
            await this.telegramService.sendMessage(token, adminGroupId, message);
        } catch (error) {
            console.error('[Notifications] Failed to send Telegram message:', error);
        }
    }

    private async sendEmailNotification(booking: any) {
        // Stub implementation
        console.log(`[Notifications] Sending email to ${booking.guestName} (Stub)`);
    }
}
