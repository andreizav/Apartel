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
import { StaffService } from './staff.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantId } from '../auth/user.decorator';

@Controller('staff')
@UseGuards(AuthGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.staffService.findAll(tenantId);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() member: any) {
    return this.staffService.create(tenantId, member);
  }

  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() updates: any,
  ) {
    return this.staffService.update(tenantId, id, updates);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.staffService.remove(tenantId, id);
  }
}
