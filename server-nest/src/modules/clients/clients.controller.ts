import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantId } from '../auth/user.decorator';

@Controller('clients')
@UseGuards(AuthGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.clientsService.findAll(tenantId);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() client: any) {
    return this.clientsService.create(tenantId, client);
  }

  @Patch(':phone')
  update(
    @TenantId() tenantId: string,
    @Param('phone') phone: string,
    @Body() updates: any,
  ) {
    return this.clientsService.update(tenantId, phone, updates);
  }

  @Delete(':phone')
  remove(@TenantId() tenantId: string, @Param('phone') phone: string) {
    return this.clientsService.remove(tenantId, phone);
  }
}
