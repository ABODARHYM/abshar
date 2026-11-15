import {
  IsEmail, IsNumber, IsOptional, IsString, IsUUID,
  Matches, MaxLength, MinLength, Min, Max,
} from 'class-validator';

export class CreateStoreApplicationDto {
  @IsString() @MaxLength(160)
  ownerFullName!: string;

  @IsString() @Matches(/^\+?[0-9]{7,20}$/)
  phone!: string;

  @IsString() @MinLength(8) @MaxLength(100)
  password!: string;

  @IsString() @MaxLength(160)
  storeNameAr!: string;

  @IsOptional() @IsString() @MaxLength(160)
  storeNameEn?: string;

  @IsUUID()
  platformCategoryId!: string;

  @IsUUID()
  cityId!: string;

  @IsOptional() @IsUUID()
  districtId?: string;

  @IsOptional() @IsUUID()
  zoneId?: string;

  @IsString() @MaxLength(255)
  addressText!: string;

  @IsNumber() @Min(-90) @Max(90)
  latitude!: number;

  @IsNumber() @Min(-180) @Max(180)
  longitude!: number;

  @IsOptional() @IsString() @Matches(/^\+?[0-9]{7,20}$/)
  contactPhone?: string;

  @IsOptional() @IsEmail()
  contactEmail?: string;
}

export class CheckStoreApplicationDto {
  @IsString() @MinLength(20) @MaxLength(200)
  trackingToken!: string;
}

export class RejectStoreApplicationDto {
  @IsString() @MinLength(3) @MaxLength(1000)
  reason!: string;
}
