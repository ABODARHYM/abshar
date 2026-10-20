import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy بين الواجهة و NestJS backend.
 * - عنوان الـ backend من BACKEND_URL (افتراضي للتطوير: http://127.0.0.1:3000).
 * - يمرّر كل الطرق (GET/POST/PUT/PATCH/DELETE) مع الـ query والـ body والترويسات اللازمة
 *   (Authorization خصوصًا — كان يُسقَط في PATCH/DELETE فيفشل التعديل والحذف وتعليم الإشعارات كمقروءة).
 * - يمرّر الاستجابة كما هي (JSON أو غيره، بما فيها 204).
 */
export const dynamic = 'force-dynamic';

const BACKEND = (process.env.BACKEND_URL ?? 'http://127.0.0.1:3000').replace(/\/+$/, '');
const TIMEOUT_MS = 25_000;
const FORWARD_REQUEST_HEADERS = [
  'authorization',
  'content-type',
  'accept-language',
  'idempotency-key',
  'x-request-id',
] as const;
const NO_BODY_STATUS = new Set([204, 205, 304]);

type Ctx = { params: Promise<{ path: string[] }> };

function fail(status: number, code: string, message: string): NextResponse {
  // `error` يُبقى للتوافق مع الصفحات التي تقرأه؛ `code/message` بنفس صيغة أخطاء الـ backend.
  return NextResponse.json({ code, message, error: message }, { status });
}

async function handle(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path } = await ctx.params;

  // منع تسلّل مسارات مثل ../ إلى خارج /api/v1
  if (path.some((seg) => seg === '.' || seg === '..' || seg === '')) {
    return fail(400, 'BAD_REQUEST', 'Invalid path');
  }
  const url = `${BACKEND}/api/v1/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init: RequestInit & { signal: AbortSignal } = {
    method: request.method,
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const body = await request.arrayBuffer();
    if (body.byteLength > 0) {
      init.body = body;
      if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    }
  }

  try {
    const upstream = await fetch(url, init);
    if (NO_BODY_STATUS.has(upstream.status)) {
      return new NextResponse(null, { status: upstream.status });
    }
    const out = new Headers();
    out.set('content-type', upstream.headers.get('content-type') ?? 'application/json');
    const requestId = upstream.headers.get('x-request-id');
    if (requestId) out.set('x-request-id', requestId);
    out.set('cache-control', 'no-store');
    return new NextResponse(await upstream.arrayBuffer(), { status: upstream.status, headers: out });
  } catch (e) {
    const name = (e as Error).name;
    if (name === 'TimeoutError' || name === 'AbortError') {
      return fail(504, 'BACKEND_TIMEOUT', 'Backend did not respond in time');
    }
    return fail(503, 'BACKEND_UNREACHABLE', 'Backend unreachable');
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
