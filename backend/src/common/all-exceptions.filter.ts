import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { codeForStatus, ErrorCode } from './error-codes';
import type { RequestWithId } from './request-id.middleware';

interface NormalizedError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

/** أكواد أخطاء PostgreSQL الشائعة → استجابات مفهومة (بدون تسريب تفاصيل SQL). */
const PG_ERRORS: Record<string, { status: number; code: string; message: string }> = {
  '23505': { status: 409, code: ErrorCode.Conflict, message: 'Resource already exists' },
  '23503': { status: 409, code: ErrorCode.Conflict, message: 'Operation conflicts with related data' },
  '23514': { status: 422, code: ErrorCode.ValidationFailed, message: 'Data violates a validation rule' },
  '23502': { status: 422, code: ErrorCode.ValidationFailed, message: 'A required value is missing' },
  '22P02': { status: 422, code: ErrorCode.ValidationFailed, message: 'Invalid value format' },
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<RequestWithId>();
    const requestId = req.id ?? 'unknown';

    const normalized = this.normalize(exception);

    if (normalized.status >= 500) {
      const err = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(`[${requestId}] ${req.method} ${req.originalUrl} -> ${normalized.status}: ${err.message}`, err.stack);
    } else {
      this.logger.warn(`[${requestId}] ${req.method} ${req.originalUrl} -> ${normalized.status} ${normalized.code}`);
    }

    res.status(normalized.status).json({
      code: normalized.code,
      message: normalized.message,
      details: normalized.details ?? null,
      requestId,
    });
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        return { status, code: codeForStatus(status), message: body };
      }

      const obj = body as Record<string, unknown>;
      const code = typeof obj.code === 'string' ? obj.code : codeForStatus(status);
      const rawMessage = obj.message;
      let message: string;
      let details: unknown = obj.details;

      if (Array.isArray(rawMessage)) {
        // رسائل class-validator الافتراضية
        message = 'Validation failed';
        details = details ?? rawMessage;
      } else if (typeof rawMessage === 'string') {
        message = rawMessage;
      } else {
        message = exception.message;
      }
      return { status, code, message, details };
    }

    const pg = this.asPgError(exception);
    if (pg) {
      const mapped = PG_ERRORS[pg.code];
      if (mapped) return { ...mapped };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.InternalError,
      message: 'Internal server error',
    };
  }

  private asPgError(e: unknown): { code: string } | null {
    if (typeof e === 'object' && e !== null && 'code' in e) {
      const code = (e as { code: unknown }).code;
      if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return { code };
    }
    return null;
  }
}
