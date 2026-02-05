import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ClientsModule } from './modules/clients/clients.module';
import { StaffModule } from './modules/staff/staff.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MessagesModule } from './modules/messages/messages.module';
import { BootstrapModule } from './modules/bootstrap/bootstrap.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    SharedModule,
    AuthModule,
    BookingsModule,
    TenantsModule,
    ClientsModule,
    StaffModule,
    PortfolioModule,
    TransactionsModule,
    InventoryModule,
    ChannelsModule,
    SettingsModule,
    MessagesModule,
    BootstrapModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
