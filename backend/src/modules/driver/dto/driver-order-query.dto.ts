import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination.dto';

const STATUSES = [
  'ready',
  'driverAssigned',
  'driverGoingToStore',
  'driverArrivedStore',
  'pickedUp',
  'driverGoingToCustomer',
  'driverArrivedCustomer',
  'delivered',
] as const;

export class DriverOrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional() @IsIn(STATUSES as unknown as string[])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  search?: string;
}
