import { ApiProperty } from '@nestjs/swagger';

/** شكل الخطأ الموحّد لكل الـ API: code / message / details / requestId */
export class ApiErrorResponse {
  @ApiProperty({ example: 'VALIDATION_FAILED' })
  code!: string;

  @ApiProperty({ example: 'Validation failed' })
  message!: string;

  @ApiProperty({ required: false, nullable: true, description: 'تفاصيل إضافية مثل أخطاء الحقول' })
  details?: unknown;

  @ApiProperty({ example: '3f1c9a52-6b0e-4c1e-9a77-0f6f4c2b8d11' })
  requestId!: string;
}
