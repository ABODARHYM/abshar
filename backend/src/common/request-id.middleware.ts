import { randomUUID } from 'crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';
const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

export type RequestWithId = Request & { id: string };

/** يضمن وجود requestId لكل طلب (يقبل القيمة القادمة فقط إذا كانت آمنة) ويعيده في الاستجابة. */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
    const id = candidate && SAFE_ID.test(candidate) ? candidate : randomUUID();
    (req as RequestWithId).id = id;
    res.setHeader('X-Request-Id', id);
    next();
  }
}
