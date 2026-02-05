import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { SharedModule } from '../../shared/shared.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [SharedModule, TransactionsModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
