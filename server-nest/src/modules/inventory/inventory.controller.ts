import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantId } from '../auth/user.decorator';

@Controller('inventory')
@UseGuards(AuthGuard)
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Get()
    findAll(@TenantId() tenantId: string) {
        return this.inventoryService.findAll(tenantId);
    }

    @Put()
    update(@TenantId() tenantId: string, @Body() inventory: any[]) {
        return this.inventoryService.update(tenantId, inventory);
    }

    @Post('refill')
    refill(@TenantId() tenantId: string, @Body() body: { categoryId: string, itemId: string, quantity: number, price: number }) {
        return this.inventoryService.refillItem(tenantId, body.categoryId, body.itemId, body.quantity, body.price);
    }
}
