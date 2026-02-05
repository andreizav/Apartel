import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { TelegramService } from '../../shared/telegram.service';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
  ) {}

  /**
   * Save a message locally without sending to external platform.
   * Used for simulator/local chat functionality.
   */
  async saveLocalMessage(
    tenantId: string,
    clientPhone: string,
    text: string,
    sender: string,
    platform?: string,
  ) {
    if (!clientPhone || !text) {
      throw new BadRequestException('Client phone and text are required');
    }

    // Find client by phone number or create a minimal one
    let client = await this.prisma.client.findFirst({
      where: { tenantId, phoneNumber: clientPhone },
    });

    if (!client) {
      client = await this.prisma.client.create({
        data: {
          id: `c-auto-${Date.now()}`,
          tenantId,
          phoneNumber: clientPhone,
          name: clientPhone,
          platform: platform || 'whatsapp',
          status: 'New',
          unreadCount: 0,
          lastActive: new Date(),
          createdAt: new Date(),
          avatar: `https://picsum.photos/seed/${clientPhone}/100/100`,
          email: '',
          address: '',
          country: '',
        },
      });
    }

    const msgId = `msg-${sender}-${Date.now()}`;

    await this.prisma.message.create({
      data: {
        id: msgId,
        clientId: client.id,
        text: text,
        sender: sender, // 'bot', 'client', 'agent'
        timestamp: new Date(),
        platform: platform || client.platform || 'whatsapp',
        status: 'sent',
      },
    });

    await this.prisma.client.update({
      where: { id: client.id },
      data: { lastActive: new Date() },
    });

    return { success: true, messageId: msgId };
  }

  async sendMessage(
    tenantId: string,
    recipientId: string,
    text: string,
    platform: string,
  ) {
    if (!recipientId || !text) {
      throw new BadRequestException('Recipient and text are required');
    }

    if (platform === 'telegram') {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      const token = tenant?.tgBotToken;
      if (!token) throw new BadRequestException('Telegram bot not configured');

      // Find client by platformId or phoneNumber
      const client = await this.prisma.client.findFirst({
        where: {
          tenantId,
          OR: [
            { platformId: recipientId },
            { phoneNumber: recipientId },
            { platformId: recipientId.replace('tg-', '') },
          ],
        },
      });

      const msgId = `msg-agent-${Date.now()}`;

      // Create message in database if client exists
      if (client) {
        await this.prisma.message.create({
          data: {
            id: msgId,
            clientId: client.id,
            text: text,
            sender: 'agent',
            timestamp: new Date(),
            platform: 'telegram',
            status: 'sending',
          },
        });

        await this.prisma.client.update({
          where: { id: client.id },
          data: { lastActive: new Date() },
        });
      }

      try {
        await this.telegramService.sendMessage(token, recipientId, text);

        if (client) {
          await this.prisma.message.update({
            where: { id: msgId },
            data: { status: 'sent' },
          });
        }
        return { success: true };
      } catch (err: any) {
        console.error('Message Send Failed:', err.message);
        if (client) {
          await this.prisma.message.update({
            where: { id: msgId },
            data: { status: 'failed' },
          });
        }
        throw new ServiceUnavailableException({
          success: false,
          error: err.message,
          saved: true,
        });
      }
    }

    throw new BadRequestException(
      'Unsupported platform or missing configuration',
    );
  }

  async sendAttachment(
    tenantId: string,
    recipientId: string,
    platform: string,
    file: Express.Multer.File,
    caption?: string,
  ) {
    if (!recipientId || !file) {
      throw new BadRequestException('Recipient and file are required');
    }

    if (platform === 'telegram') {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      const token = tenant?.tgBotToken;
      if (!token) throw new BadRequestException('Telegram bot not configured');

      // Find client by platformId or phoneNumber
      const client = await this.prisma.client.findFirst({
        where: {
          tenantId,
          OR: [
            { platformId: recipientId },
            { phoneNumber: recipientId },
            { platformId: recipientId.replace('tg-', '') },
          ],
        },
      });

      const msgId = `msg-agent-${Date.now()}`;
      const attachment = {
        name: file.originalname,
        type: file.mimetype,
        size: file.size,
      };

      if (client) {
        await this.prisma.message.create({
          data: {
            id: msgId,
            clientId: client.id,
            text: `[File] ${file.originalname}`,
            sender: 'agent',
            timestamp: new Date(),
            platform: 'telegram',
            status: 'sending',
            attachment: JSON.stringify(attachment),
          },
        });

        await this.prisma.client.update({
          where: { id: client.id },
          data: { lastActive: new Date() },
        });
      }

      try {
        await (this.telegramService as any).sendFile(
          token,
          recipientId,
          file.buffer,
          file.originalname,
          file.mimetype,
          caption,
        );

        if (client) {
          await this.prisma.message.update({
            where: { id: msgId },
            data: { status: 'sent' },
          });
        }
        return { success: true };
      } catch (err: any) {
        console.error('File Send Failed:', err.message);
        if (client) {
          await this.prisma.message.update({
            where: { id: msgId },
            data: { status: 'failed' },
          });
        }
        throw new ServiceUnavailableException({
          success: false,
          error: err.message,
          saved: true,
        });
      }
    }
    throw new BadRequestException('Unsupported platform');
  }
}
