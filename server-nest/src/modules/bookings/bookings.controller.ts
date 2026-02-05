import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantId } from '../auth/user.decorator';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
@UseGuards(AuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.bookingsService.findAll(tenantId);
  }

  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingsService.create(tenantId, createBookingDto);
  }

  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateBookingDto>,
  ) {
    return this.bookingsService.update(tenantId, id, updateDto);
  }
}
