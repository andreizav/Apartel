import { Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { BootstrapService } from './bootstrap.service';
import { AuthGuard } from '../auth/auth.guard';
import { User, TenantId } from '../auth/user.decorator';

@Controller('bootstrap')
@UseGuards(AuthGuard)
export class BootstrapController {
  constructor(private readonly bootstrapService: BootstrapService) {}

  @Get()
  getBootstrapData(
    @TenantId() tenantId: string,
    @User() user: any,
    @Req() req: any,
  ) {
    // req.tenant is populated by AuthGuard
    return this.bootstrapService.getBootstrapData(tenantId, user, req.tenant);
  }

  @Post('reset')
  reset(@TenantId() tenantId: string, @User() user: any) {
    return this.bootstrapService.reset(tenantId, user?.id);
  }

  @Post('clear')
  clear(@TenantId() tenantId: string) {
    return this.bootstrapService.clear(tenantId);
  }
}
