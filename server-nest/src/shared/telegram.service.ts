import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class TelegramService {
  constructor(private prisma: PrismaService) {}

  async syncUpdates(token: string, tenantId: string) {
    if (!token) return { count: 0, messages: [] };

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) return { count: 0, messages: [] };

    const lastId = tenant.tgLastUpdateId || 0;
    const mainAdminGroupId = tenant.tgAdminGroupId || '';

    const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastId + 1}`;

    try {
      const response: any = await fetch(url);

      if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
          console.warn(
            `[Telegram] Invalid token or bot not found for tenant ${tenantId}`,
          );
          return { count: 0, messages: [] };
        }
        throw new Error(
          `Telegram API Error: ${response.status} ${response.statusText}`,
        );
      }

      const json = await response.json();

      if (!json.ok) {
        console.error('Telegram Update Error:', json);
        throw new Error(json.description || 'Failed to fetch updates');
      }

      const updates = json.result;
      if (!updates || updates.length === 0) return { count: 0, messages: [] };

      let processedCount = 0;
      const processedMessages: any[] = [];
      let maxUpdateId = lastId;

      for (const update of updates) {
        if (update.update_id > maxUpdateId) {
          maxUpdateId = update.update_id;
        }

        const msg = update.message;
        if (!msg || !msg.text) continue;

        const chatId = msg.chat.id.toString();
        const text = msg.text;
        const senderName =
          msg.from.first_name +
          (msg.from.last_name ? ' ' + msg.from.last_name : '');

        if (chatId !== mainAdminGroupId) {
          // Find or create client
          let client = await this.prisma.client.findFirst({
            where: { tenantId, platform: 'telegram', platformId: chatId },
          });

          if (!client) {
            client = await this.prisma.client.create({
              data: {
                tenantId,
                phoneNumber: `tg-${chatId}`,
                name: senderName || `User ${chatId}`,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName || 'U')}&background=0088cc&color=fff`,
                email: '',
                address: '',
                country: '',
                platform: 'telegram',
                platformId: chatId,
                status: 'New',
                unreadCount: 1,
                online: true,
                lastActive: new Date(),
                createdAt: new Date(),
                previousBookings: 0,
              },
            });
          }

          const messageId = `msg-${msg.message_id}`;
          const existingMsg = await this.prisma.message.findUnique({
            where: { id: messageId },
          });

          if (!existingMsg) {
            const newMessage = await this.prisma.message.create({
              data: {
                id: messageId,
                clientId: client.id,
                text: text,
                sender: 'client',
                timestamp: new Date(msg.date * 1000),
                platform: 'telegram',
                status: 'read',
              },
            });

            await this.prisma.client.update({
              where: { id: client.id },
              data: {
                lastActive: newMessage.timestamp,
                unreadCount: { increment: 1 },
              },
            });

            processedCount++;
            processedMessages.push(newMessage);
          }
        }
      }

      // Update the last update ID
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { tgLastUpdateId: maxUpdateId },
      });

      return { count: processedCount, messages: processedMessages };
    } catch (error: any) {
      if (
        error.cause &&
        (error.cause.code === 'ECONNRESET' || error.cause.code === 'ETIMEDOUT')
      ) {
        return { count: 0, messages: [] };
      }
      console.error(
        `[Telegram] Sync Failed (Tenant: ${tenantId}):`,
        error.message,
      );
      return { count: 0, messages: [] };
    }
  }

  async sendMessage(token: string, chatId: string, text: string) {
    if (!token || !chatId || !text) {
      throw new Error('Missing token, chatId, or text');
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
      const response: any = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown',
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        console.error('Telegram Send Error:', result);
        throw new Error(result.description || 'Failed to send message');
      }

      return result;
    } catch (error: any) {
      if (
        error.cause &&
        (error.cause.code === 'ECONNRESET' || error.cause.code === 'ETIMEDOUT')
      ) {
        console.error('Telegram Connection Lost:', error.message);
        throw new Error('Telegram Unreachable: Connection reset or timed out');
      }
      console.error('Telegram Network Error:', error);
      throw error;
    }
  }

  async sendFile(
    token: string,
    chatId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    caption: string = '',
  ) {
    if (!token || !chatId || !fileBuffer) {
      throw new Error('Missing token, chatId, or file');
    }

    const isImage = mimeType.startsWith('image/');
    const method = isImage ? 'sendPhoto' : 'sendDocument';
    const url = `https://api.telegram.org/bot${token}/${method}`;

    const formData = new FormData();
    formData.append('chat_id', chatId);
    if (caption) formData.append('caption', caption);

    const fileBlob = new Blob([fileBuffer as any], { type: mimeType });
    const fieldName = isImage ? 'photo' : 'document';
    formData.append(fieldName, fileBlob, fileName);

    try {
      const response: any = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.ok) {
        console.error(`Telegram ${method} Error:`, result);
        throw new Error(result.description || `Failed to send ${fieldName}`);
      }

      return result;
    } catch (error: any) {
      if (
        error.cause &&
        (error.cause.code === 'ECONNRESET' || error.cause.code === 'ETIMEDOUT')
      ) {
        console.error('Telegram Connection Lost:', error.message);
        throw new Error('Telegram Unreachable: Connection reset or timed out');
      }
      console.error('Telegram Network Error:', error);
      throw error;
    }
  }
}
