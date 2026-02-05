import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TelegramService } from './telegram.service';

@Global()
@Module({
  providers: [PrismaService, TelegramService],
  exports: [PrismaService, TelegramService],
})
export class SharedModule {}
