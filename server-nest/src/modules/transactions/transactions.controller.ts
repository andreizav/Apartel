import { Body, Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantId } from '../auth/user.decorator';

@Controller('transactions')
@UseGuards(AuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.transactionsService.findAll(tenantId);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() tx: any) {
    return this.transactionsService.create(tenantId, tx);
  }

  @Get('categories')
  getCategories(@TenantId() tenantId: string) {
    return this.transactionsService.getCategories(tenantId);
  }

  @Post('categories')
  createCategory(
    @TenantId() tenantId: string,
    @Body() data: { name: string; type: string },
  ) {
    return this.transactionsService.createCategory(tenantId, data);
  }

  @Post('categories/:id/delete')
  deleteCategory(
    @TenantId() tenantId: string,
    @Body() body: any,
    @Param('id') id?: string,
  ) {
    return this.transactionsService.deleteCategory(tenantId, id || body.id);
  }

  @Post('subcategories')
  createSubCategory(
    @TenantId() tenantId: string,
    @Body() data: { categoryId: string; name: string },
  ) {
    return this.transactionsService.createSubCategory(
      tenantId,
      data.categoryId,
      data.name,
    );
  }

  @Post('subcategories/:id/delete')
  deleteSubCategory(
    @TenantId() tenantId: string,
    @Body() body: any,
    @Param('id') id?: string,
  ) {
    return this.transactionsService.deleteSubCategory(tenantId, id || body.id);
  }

  @Post('categories/:id/update')
  updateCategory(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { name: string; type: string },
  ) {
    return this.transactionsService.updateCategory(
      tenantId,
      id,
      body.name,
      body.type,
    );
  }

  @Post('subcategories/:id/update')
  updateSubCategory(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    return this.transactionsService.updateSubCategory(tenantId, id, body.name);
  }

  @Post('sync-unit-income/:unitId')
  syncUnitIncome(
    @TenantId() tenantId: string,
    @Param('unitId') unitId: string,
  ) {
    return this.transactionsService.syncUnitIncome(tenantId, unitId);
  }
}
