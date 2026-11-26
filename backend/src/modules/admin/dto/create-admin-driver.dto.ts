import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, Length, Matches, MaxLength } from 'class-validator';

export class CreateAdminDriverDto {
  @ApiProperty({ example: 'أحمد محمد' })
  @IsString()
  @Length(2, 120)
  fullName!: string;

  @ApiProperty({ example: '+9677XXXXXXXX' })
  @IsString()
  @Length(7, 20)
  @Matches(/^\+?[0-9]{7,20}$/)
  phone!: string;

  @ApiPropertyOptional({ example: 'driver@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ description: 'Active delivery zone UUID' })
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional({ enum: ['motorcycle', 'car', 'bicycle', 'scooter'], default: 'motorcycle' })
  @IsOptional()
  @IsIn(['motorcycle', 'car', 'bicycle', 'scooter'])
  vehicleType?: string;

  @ApiPropertyOptional({ example: 'مأرب 1234' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  vehiclePlate?: string;
}
