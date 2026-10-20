import { UnprocessableEntityException, ValidationError, ValidationPipe } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export interface FieldError {
  field: string;
  constraints: string[];
}

function flatten(errors: ValidationError[], parent = ''): FieldError[] {
  const out: FieldError[] = [];
  for (const e of errors) {
    const path = parent ? `${parent}.${e.property}` : e.property;
    if (e.constraints) out.push({ field: path, constraints: Object.values(e.constraints) });
    if (e.children && e.children.length > 0) out.push(...flatten(e.children, path));
  }
  return out;
}

export function buildValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    errorHttpStatusCode: 422,
    exceptionFactory: (errors: ValidationError[]) =>
      new UnprocessableEntityException({
        code: ErrorCode.ValidationFailed,
        message: 'Validation failed',
        details: flatten(errors),
      }),
  });
}
