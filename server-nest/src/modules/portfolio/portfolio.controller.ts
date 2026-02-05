import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantId } from '../auth/user.decorator';

@Controller('portfolio')
@UseGuards(AuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.portfolioService.findAll(tenantId);
  }

  @Put()
  update(@TenantId() tenantId: string, @Body() portfolio: any[]) {
    return this.portfolioService.update(tenantId, portfolio);
  }

  @Delete('units/:unitId')
  removeUnit(@TenantId() tenantId: string, @Param('unitId') unitId: string) {
    return this.portfolioService.removeUnit(tenantId, unitId);
  }
}
