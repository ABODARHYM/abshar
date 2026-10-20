import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCode } from '../../common/error-codes';
import { AuthUser } from '../auth.types';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';

/**
 * يتحقق من أن المستخدم يملك الصلاحيات المطلوبة.
 * - يجب أن يُستخدم مع JwtAuthGuard حتى يكون req.user موجودًا.
 * - superAdmin يملك كل الصلاحيات ضمنيًا.
 * - بدون @RequirePermission => لا فحص.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        code: ErrorCode.Forbidden,
        message: 'No authenticated user',
      });
    }

    // superAdmin يملك كل الصلاحيات ضمنيًا
    if (user.roles.includes('superAdmin')) return true;

    const userPermissions = new Set(user.permissions);
    const missing = required.filter((p) => !userPermissions.has(p));

    if (missing.length > 0) {
      throw new ForbiddenException({
        code: ErrorCode.Forbidden,
        message: 'Insufficient permissions',
        details: { missing },
      });
    }

    return true;
  }
}
