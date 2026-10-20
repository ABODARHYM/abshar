/**
 * Order State Machine
 *
 * المصدر الوحيد للحقيقة لـ:
 *   - كل حالات الطلب الممكنة
 *   - الانتقالات المسموحة
 *   - Actor المطلوب لكل انتقال
 *   - Labels العربية
 *
 * ⚠️ عند إضافة حالة جديدة:
 *   1. أضفها في OrderStatus
 *   2. أضفها في TRANSITIONS
 *   3. أضفها في STATUS_LABELS_AR
 *   4. أضف Migration للـ DB enum
 */

// ═══════════════════════════════════════════════════════════════
// 1) الأنواع
// ═══════════════════════════════════════════════════════════════

/**
 * كل حالات الطلب في DB
 * (يجب أن تطابق order_status enum في PostgreSQL)
 */
export type OrderStatus =
  // Normal flow
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'driverAssigned'
  | 'driverGoingToStore'
  | 'driverArrivedStore'
  | 'pickedUp'
  | 'driverGoingToCustomer'
  | 'driverArrivedCustomer'
  | 'delivered'
  // Cancellation
  | 'cancelled'              // legacy
  | 'cancelled_by_customer'
  | 'cancelled_by_store'
  | 'cancelled_by_driver'
  | 'cancelled_by_admin'
  // Problems
  | 'failed'
  | 'delayed'
  | 'disputed'
  // Legacy
  | 'rejected';

export type CancellationActor =
  | 'customer'
  | 'store'
  | 'driver'
  | 'admin'
  | 'system';

export type CancellationReason =
  | 'customer_changed_mind'
  | 'customer_wrong_address'
  | 'customer_too_long'
  | 'store_out_of_stock'
  | 'store_closed'
  | 'store_too_busy'
  | 'driver_unavailable'
  | 'driver_too_far'
  | 'payment_failed'
  | 'no_driver_found'
  | 'system_timeout'
  | 'admin_decision'
  | 'other';

// ═══════════════════════════════════════════════════════════════
// 2) Transition Rules
// ═══════════════════════════════════════════════════════════════

/**
 * من كل حالة → ما الحالات المسموح الانتقال إليها
 */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  // Normal flow
  pending: [
    'accepted',
    'cancelled_by_customer',
    'cancelled_by_store',
    'cancelled_by_admin',
    'failed',
  ],
  accepted: [
    'preparing',
    'cancelled_by_customer',
    'cancelled_by_store',
    'cancelled_by_admin',
    'failed',
    'delayed',
  ],
  preparing: [
    'ready',
    'cancelled_by_store',
    'cancelled_by_admin',
    'failed',
    'delayed',
  ],
  ready: [
    'driverAssigned',
    'cancelled_by_store',
    'cancelled_by_admin',
    'delayed',
  ],
  driverAssigned: [
    'driverGoingToStore',
    'driverArrivedStore',
    'cancelled_by_driver',
    'cancelled_by_admin',
    'delayed',
  ],
  driverGoingToStore: [
    'driverArrivedStore',
    'pickedUp',
    'cancelled_by_driver',
    'cancelled_by_admin',
    'delayed',
  ],
  driverArrivedStore: [
    'pickedUp',
    'cancelled_by_driver',
    'cancelled_by_admin',
    'delayed',
  ],
  pickedUp: [
    'driverGoingToCustomer',
    'driverArrivedCustomer',
    'delivered',
    'disputed',
  ],
  driverGoingToCustomer: [
    'driverArrivedCustomer',
    'delivered',
    'disputed',
  ],
  driverArrivedCustomer: [
    'delivered',
    'disputed',
  ],

  // Terminal — success
  delivered: [],

  // Terminal — cancellation
  cancelled: [],
  cancelled_by_customer: [],
  cancelled_by_store: [],
  cancelled_by_driver: [],
  cancelled_by_admin: [],

  // Terminal — problem
  failed: [],
  delayed: ['delivered', 'cancelled_by_admin'],  // يمكن أن ينتهي
  disputed: ['delivered', 'cancelled_by_admin'],

  // Legacy
  rejected: [],
};

// ═══════════════════════════════════════════════════════════════
// 3) Actor Mapping
// ═══════════════════════════════════════════════════════════════

/**
 * من actor → ما هي حالة الإلغاء المقابلة
 */
export function getCancellationStatusForActor(
  actor: CancellationActor,
): OrderStatus {
  switch (actor) {
    case 'customer':
      return 'cancelled_by_customer';
    case 'store':
      return 'cancelled_by_store';
    case 'driver':
      return 'cancelled_by_driver';
    case 'admin':
      return 'cancelled_by_admin';
    case 'system':
      return 'cancelled_by_admin'; // system يستخدم admin
  }
}

/**
 * عكس: من الحالة → أي actor
 */
export function getActorFromCancellationStatus(
  status: OrderStatus,
): CancellationActor | null {
  switch (status) {
    case 'cancelled_by_customer':
      return 'customer';
    case 'cancelled_by_store':
      return 'store';
    case 'cancelled_by_driver':
      return 'driver';
    case 'cancelled_by_admin':
      return 'admin';
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// 4) Status Grouping (Predicates)
// ═══════════════════════════════════════════════════════════════

export function isCancellationStatus(s: OrderStatus): boolean {
  return (
    s === 'cancelled' ||
    s === 'cancelled_by_customer' ||
    s === 'cancelled_by_store' ||
    s === 'cancelled_by_driver' ||
    s === 'cancelled_by_admin' ||
    s === 'rejected'
  );
}

export function isTerminalStatus(s: OrderStatus): boolean {
  return (
    s === 'delivered' ||
    isCancellationStatus(s) ||
    s === 'failed'
  );
}

export function isProblemStatus(s: OrderStatus): boolean {
  return s === 'failed' || s === 'delayed' || s === 'disputed';
}

export function isActiveStatus(s: OrderStatus): boolean {
  return !isTerminalStatus(s);
}

/**
 * الطلب مكتمل بنجاح
 */
export function isSuccessfulStatus(s: OrderStatus): boolean {
  return s === 'delivered';
}

// ═══════════════════════════════════════════════════════════════
// 5) Guards
// ═══════════════════════════════════════════════════════════════

/**
 * هل الانتقال مسموح؟
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * نفس canTransition لكن يرمي خطأ عند الفشل
 */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid order transition: ${from} → ${to}. Allowed: ${TRANSITIONS[from].join(', ') || 'none'}`,
    );
  }
}

/**
 * كل الانتقالات المسموحة من حالة
 */
export function getAllowedTransitions(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from] ?? [];
}

// ═══════════════════════════════════════════════════════════════
// 6) Actor Permissions per Status
// ═══════════════════════════════════════════════════════════════

/**
 * أي actor يمكنه إلغاء الطلب من هذه الحالة؟
 */
export const CANCELLABLE_BY: Record<OrderStatus, CancellationActor[]> = {
  pending: ['customer', 'store', 'admin', 'system'],
  accepted: ['customer', 'store', 'admin'],
  preparing: ['store', 'admin'],
  ready: ['store', 'admin'],
  // ─── المندوب يمكنه التراجع قبل استلام الطلب ───
  driverAssigned: ['driver', 'admin'],
  driverGoingToStore: ['driver', 'admin'],
  driverArrivedStore: ['driver', 'admin'],
  // ─── بعد الاستلام: فقط admin ───
  pickedUp: ['admin'],
  driverGoingToCustomer: ['admin'],
  driverArrivedCustomer: ['admin'],
  // ─── Terminal ───
  delivered: [],
  cancelled: [],
  cancelled_by_customer: [],
  cancelled_by_store: [],
  cancelled_by_driver: [],
  cancelled_by_admin: [],
  failed: [],
  delayed: ['admin'],
  disputed: ['admin'],
  rejected: [],
};

/**
 * هل actor يمكنه إلغاء الطلب من هذه الحالة؟
 */
export function canActorCancel(
  status: OrderStatus,
  actor: CancellationActor,
): boolean {
  const allowed = CANCELLABLE_BY[status];
  return allowed ? allowed.includes(actor) : false;
}

// ═══════════════════════════════════════════════════════════════
// 7) Arabic Labels
// ═══════════════════════════════════════════════════════════════

export const STATUS_LABELS_AR: Record<OrderStatus, string> = {
  // Normal flow
  pending: 'بانتظار التأكيد',
  accepted: 'تم القبول',
  preparing: 'قيد التحضير',
  ready: 'جاهز للاستلام',
  driverAssigned: 'تم تعيين مندوب',
  driverGoingToStore: 'المندوب متجه للمتجر',
  driverArrivedStore: 'المندوب وصل المتجر',
  pickedUp: 'تم استلام الطلب',
  driverGoingToCustomer: 'في الطريق إليك',
  driverArrivedCustomer: 'وصل المندوب',
  delivered: 'تم التوصيل',

  // Cancellation
  cancelled: 'ملغي',                     // legacy
  cancelled_by_customer: 'ألغي بواسطة العميل',
  cancelled_by_store: 'ألغي بواسطة المتجر',
  cancelled_by_driver: 'ألغي بواسطة المندوب',
  cancelled_by_admin: 'ألغي بواسطة الإدارة',

  // Problems
  failed: 'فشل',
  delayed: 'متأخر',
  disputed: 'متنازع عليه',

  // Legacy
  rejected: 'مرفوض',
};

export const CANCELLATION_ACTOR_LABELS_AR: Record<CancellationActor, string> = {
  customer: 'العميل',
  store: 'المتجر',
  driver: 'المندوب',
  admin: 'الإدارة',
  system: 'النظام',
};

export const CANCELLATION_REASON_LABELS_AR: Record<CancellationReason, string> = {
  customer_changed_mind: 'العميل غيّر رأيه',
  customer_wrong_address: 'عنوان خاطئ',
  customer_too_long: 'الانتظار طويل جدًا',
  store_out_of_stock: 'المنتج غير متوفر',
  store_closed: 'المتجر مغلق',
  store_too_busy: 'المتجر مشغول',
  driver_unavailable: 'المندوب غير متاح',
  driver_too_far: 'المندوب بعيد',
  payment_failed: 'فشل الدفع',
  no_driver_found: 'لم يتم العثور على مندوب',
  system_timeout: 'انتهت المدة',
  admin_decision: 'قرار الإدارة',
  other: 'أخرى',
};

// ═══════════════════════════════════════════════════════════════
// 8) Status → Domain Event Mapping
// ═══════════════════════════════════════════════════════════════

export type OrderEventType =
  | 'ORDER_CREATED'
  | 'ORDER_ACCEPTED'
  | 'ORDER_REJECTED'
  | 'ORDER_PREPARING'
  | 'ORDER_READY'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ACCEPTED'
  | 'DRIVER_ARRIVED_STORE'
  | 'ORDER_PICKED_UP'
  | 'DRIVER_ON_THE_WAY'
  | 'DRIVER_ARRIVED'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'ORDER_FAILED'
  | 'ORDER_DELAYED'
  | 'ORDER_DISPUTED';

/**
 * من status → أي event يجب إطلاقه
 */
export function getEventTypeForStatus(
  status: OrderStatus,
): OrderEventType | null {
  switch (status) {
    case 'pending':                  return 'ORDER_CREATED';
    case 'accepted':                 return 'ORDER_ACCEPTED';
    case 'rejected':                 return 'ORDER_REJECTED';
    case 'preparing':                return 'ORDER_PREPARING';
    case 'ready':                    return 'ORDER_READY';
    case 'driverAssigned':           return 'DRIVER_ASSIGNED';
    case 'driverGoingToStore':       return 'DRIVER_ACCEPTED';
    case 'driverArrivedStore':       return 'DRIVER_ARRIVED_STORE';
    case 'pickedUp':                 return 'ORDER_PICKED_UP';
    case 'driverGoingToCustomer':    return 'DRIVER_ON_THE_WAY';
    case 'driverArrivedCustomer':    return 'DRIVER_ARRIVED';
    case 'delivered':                return 'ORDER_DELIVERED';
    case 'cancelled':
    case 'cancelled_by_customer':
    case 'cancelled_by_store':
    case 'cancelled_by_driver':
    case 'cancelled_by_admin':       return 'ORDER_CANCELLED';
    case 'failed':                   return 'ORDER_FAILED';
    case 'delayed':                  return 'ORDER_DELAYED';
    case 'disputed':                 return 'ORDER_DISPUTED';
    default:                         return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// 9) Utility
// ═══════════════════════════════════════════════════════════════

/**
 * كل الحالات كمصفوفة (للاختبارات والـ UI)
 */
export const ALL_ORDER_STATUSES: OrderStatus[] = Object.keys(
  TRANSITIONS,
) as OrderStatus[];

/**
 * كل الحالات النشطة
 */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] =
  ALL_ORDER_STATUSES.filter(isActiveStatus);

/**
 * كل حالات الإلغاء
 */
export const CANCELLATION_STATUSES: OrderStatus[] =
  ALL_ORDER_STATUSES.filter(isCancellationStatus);
