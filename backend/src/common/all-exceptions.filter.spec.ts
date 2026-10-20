import { ArgumentsHost, BadRequestException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function run(exception: unknown) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ id: 'req-12345678', method: 'GET', originalUrl: '/api/v1/x' }),
    }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return { status: status.mock.calls[0][0] as number, body: json.mock.calls[0][0] as Record<string, unknown> };
}

describe('AllExceptionsFilter', () => {
  it('returns the unified error shape with requestId', () => {
    const { status, body } = run(new NotFoundException('Order not found'));
    expect(status).toBe(404);
    expect(body).toEqual({ code: 'NOT_FOUND', message: 'Order not found', details: null, requestId: 'req-12345678' });
  });

  it('keeps custom code/message/details from the exception', () => {
    const { status, body } = run(
      new UnprocessableEntityException({ code: 'VALIDATION_FAILED', message: 'Validation failed', details: [{ field: 'email' }] }),
    );
    expect(status).toBe(422);
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(body.details).toEqual([{ field: 'email' }]);
  });

  it('maps 403 and array messages', () => {
    expect(run(new ForbiddenException()).body.code).toBe('FORBIDDEN');
    const arr = run(new BadRequestException(['a must be a string']));
    expect(arr.body.message).toBe('Validation failed');
    expect(arr.body.details).toEqual(['a must be a string']);
  });

  it('maps PostgreSQL unique violation to 409 without leaking SQL', () => {
    const { status, body } = run(Object.assign(new Error('duplicate key value violates unique constraint "users_email_key"'), { code: '23505' }));
    expect(status).toBe(409);
    expect(body.code).toBe('CONFLICT');
    expect(JSON.stringify(body)).not.toContain('users_email_key');
  });

  it('hides internal error details on unknown errors', () => {
    const { status, body } = run(new Error('secret stack info'));
    expect(status).toBe(500);
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('Internal server error');
  });
});
