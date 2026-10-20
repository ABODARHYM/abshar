/** رموز أخطاء ثابتة تستخدمها التطبيقات لعرض رسالة عربية مناسبة. */
export const ErrorCode = {
  BadRequest: 'BAD_REQUEST',
  ValidationFailed: 'VALIDATION_FAILED',
  Unauthorized: 'UNAUTHORIZED',
  Forbidden: 'FORBIDDEN',
  NotFound: 'NOT_FOUND',
  Conflict: 'CONFLICT',
  TooManyRequests: 'TOO_MANY_REQUESTS',
  InternalError: 'INTERNAL_ERROR',
  ServiceUnavailable: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

export function codeForStatus(status: number): ErrorCodeValue {
  switch (status) {
    case 400: return ErrorCode.BadRequest;
    case 401: return ErrorCode.Unauthorized;
    case 403: return ErrorCode.Forbidden;
    case 404: return ErrorCode.NotFound;
    case 409: return ErrorCode.Conflict;
    case 422: return ErrorCode.ValidationFailed;
    case 429: return ErrorCode.TooManyRequests;
    case 503: return ErrorCode.ServiceUnavailable;
    default: return status >= 500 ? ErrorCode.InternalError : ErrorCode.BadRequest;
  }
}
