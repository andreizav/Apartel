import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantId } from '../auth/user.decorator';

@Controller('tenants')
@UseGuards(AuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  getTenant(@TenantId() tenantId: string) {
    return this.tenantsService.getTenant(tenantId);
  }

  @Patch('me')
  updateTenant(@TenantId() tenantId: string, @Body() body: any) {
    return this.tenantsService.updateTenant(tenantId, body);
  }
}
