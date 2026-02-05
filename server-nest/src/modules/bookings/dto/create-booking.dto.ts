import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsISO8601,
} from 'class-validator';

export class CreateBookingDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsNotEmpty()
  @IsString()
  unitId!: string;

  @IsNotEmpty()
  @IsISO8601()
  startDate!: string;

  @IsNotEmpty()
  @IsISO8601()
  endDate!: string;

  @IsOptional()
  @IsString()
  guestName?: string;

  @IsOptional()
  @IsString()
  guestPhone?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  createdAt?: string;

  @IsOptional()
  @IsString()
  assignedCleanerId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
