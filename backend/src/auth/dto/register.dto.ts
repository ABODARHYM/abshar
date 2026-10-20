import { IsEmail, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{7,20}$/, {
    message: 'phone must contain 7-20 digits and may start with +',
  })
  phone?: string;

  @IsString()
  @Length(2, 120)
  fullName!: string;

  @IsString()
  @MinLength(8)
  @Length(8, 128)
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(/^(ar|en)$/, {
    message: 'locale must be ar or en',
  })
  locale?: string;
}
