import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'required_permissions';

/**
 * يحدد الصلاحيات المطلوبة للوصول إلى endpoint.
 * المستخدم يجب أن يملك كل الصلاحيات المذكورة (AND).
 *
 * أمثلة:
 *   @RequirePermission('orders.manage')
 *   @RequirePermission('orders.manage', 'orders.assign_driver')
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
