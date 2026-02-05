import { BadRequestException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../shared/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.booking.findMany({
      where: { tenantId },
    });
  }

  async create(tenantId: string, createBookingDto: CreateBookingDto) {
    const { startDate, endDate, unitId } = createBookingDto;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
      throw new BadRequestException('Invalid start date format.');
    }
    if (isNaN(end.getTime())) {
      throw new BadRequestException('Invalid end date format.');
    }
    if (start >= end) {
      throw new BadRequestException('End date must be after check-in date.');
    }

    // Check overlaps
    const overlapping = await this.prisma.booking.findFirst({
      where: {
        unitId,
        status: { not: 'cancelled' },
        AND: [{ startDate: { lt: end } }, { endDate: { gt: start } }],
      },
    });

    if (overlapping) {
      throw new BadRequestException(
        'Selected dates are unavailable for this unit.',
      );
    }

    const booking = await this.prisma.booking.create({
      data: {
        id: createBookingDto.id || `b-${Date.now()}`,
        tenantId,
        unitId,
        guestName: createBookingDto.guestName || '',
        guestPhone: createBookingDto.guestPhone || '',
        startDate: start,
        endDate: end,
        source: createBookingDto.source || 'direct',
        status: createBookingDto.status || 'confirmed',
        price: createBookingDto.price ?? 0,
        createdAt: createBookingDto.createdAt
          ? new Date(createBookingDto.createdAt)
          : new Date(),
        assignedCleanerId: createBookingDto.assignedCleanerId,
        description: createBookingDto.description,
      },
    });

    this.eventEmitter.emit('booking.created', { booking, tenantId });

    return { success: true, booking };
  }

  async update(
    tenantId: string,
    id: string,
    updateDto: Partial<CreateBookingDto>,
  ) {
    const data: any = { ...updateDto };

    // Handle Date objects if present strings
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    if (data.createdAt) data.createdAt = new Date(data.createdAt);

    // Ensure ID is removed from update data
    const bookingId = id;
    delete data.id;

    // Use upsert to handle case where booking exists in frontend but not DB
    const booking = await this.prisma.booking.upsert({
      where: { id: bookingId },
      update: data,
      create: {
        ...data,
        id: bookingId,
        tenantId,
        // Ensure required fields have fallbacks if mostly full object provided
        guestName: data.guestName || '',
        startDate: data.startDate || new Date(),
        endDate: data.endDate || new Date(),
        source: data.source || 'direct',
        status: data.status || 'confirmed',
        price: data.price ?? 0,
      },
    });

    // Emit updated event
    this.eventEmitter.emit('booking.updated', { booking, tenantId });

    return { success: true, booking };
  }
}
