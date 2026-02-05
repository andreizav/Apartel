import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { StaffService } from './staff.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantId } from '../auth/user.decorator';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Controller('staff')
@UseGuards(AuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class StaffController {
    constructor(private readonly staffService: StaffService) { }

    @Get()
    findAll(@TenantId() tenantId: string) {
        return this.staffService.findAll(tenantId);
    }

    @Post()
    create(@TenantId() tenantId: string, @Body() member: CreateStaffDto) {
        return this.staffService.create(tenantId, member);
    }

    @Patch(':id')
    update(@TenantId() tenantId: string, @Param('id') id: string, @Body() updates: UpdateStaffDto) {
        return this.staffService.update(tenantId, id, updates);
    }

    @Delete(':id')
    remove(@TenantId() tenantId: string, @Param('id') id: string) {
        return this.staffService.remove(tenantId, id);
    }
}
