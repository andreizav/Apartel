import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SharedModule } from '../../shared/shared.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [SharedModule, ConfigModule],
  providers: [NotificationsService],
})
export class NotificationsModule {}
