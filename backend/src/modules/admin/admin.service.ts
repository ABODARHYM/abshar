import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import { buildPage, Paginated } from '../../common/pagination.dto';
import { AdminRepository } from './admin.repository';
import {
  OrderStatus,
  CancellationReason,
  canActorCancel,
  assertTransition,
  getCancellationStatusForActor,
  STATUS_LABELS_AR,
} from '../orders/order-state-machine';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import {
  AdminAuditLogDto,
  AdminDashboardDto,
  AdminDriverListItemDto,
  AdminOrderListItemDto,
  AdminRoleDto,
  AdminStoreListItemDto,
  AdminUserDetailDto,
  AdminUserListItemDto,
} from './dto/admin-response.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly repo: AdminRepository,
    private readonly notifications: NotificationsService,
  ) {}

  // ───── Dashboard ─────

  async getDashboard(): Promise<AdminDashboardDto> {
    const d = await this.repo.getDashboard();
    return {
      totalUsers: parseInt(d.total_users, 10),
      activeUsers: parseInt(d.active_users, 10),
      totalStores: parseInt(d.total_stores, 10),
      activeStores: parseInt(d.active_stores, 10),
      totalDrivers: parseInt(d.total_drivers, 10),
      activeDrivers: parseInt(d.active_drivers, 10),
      totalOrders: parseInt(d.total_orders, 10),
      pendingOrders: parseInt(d.pending_orders, 10),
      deliveredOrders: parseInt(d.delivered_orders, 10),
      cancelledOrders: parseInt(d.cancelled_orders, 10),
      totalRevenue: Number(d.total_revenue),
      todayOrders: parseInt(d.today_orders, 10),
      todayRevenue: Number(d.today_revenue),
    };
  }

  // ───── Users ─────

  async listUsers(query: AdminUserQueryDto): Promise<Paginated<AdminUserListItemDto>> {
    const { rows, total } = await this.repo.listUsers(query);
    return buildPage(rows.map(this.toUserListItem), total, query);
  }

  async getUser(userId: string): Promise<AdminUserDetailDto> {
    const u = await this.repo.findUserById(userId);
    if (!u) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'User not found',
      });
    }
    return {
      id: u.id,
      email: u.email,
      phone: u.phone,
      fullName: u.full_name,
      status: u.status,
      roles: u.roles || [],
      locale: u.locale,
      emailVerifiedAt: u.email_verified_at ? u.email_verified_at.toISOString() : null,
      phoneVerifiedAt: u.phone_verified_at ? u.phone_verified_at.toISOString() : null,
      lastLoginAt: u.last_login_at ? u.last_login_at.toISOString() : null,
      createdAt: u.created_at.toISOString(),
    };
  }

  async updateUserStatus(
    actorId: string,
    actorRoles: string[],
    userId: string,
    status: string,
  ): Promise<AdminUserDetailDto> {
    if (userId === actorId) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'You cannot change your own status',
      });
    }

    const target = await this.repo.findUserById(userId);
    if (!target) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'User not found',
      });
    }

    // superAdmin لا يُعدّل إلا من superAdmin آخر
    if ((target.roles || []).includes('superAdmin') && !actorRoles.includes('superAdmin')) {
      throw new ForbiddenException({
        code: ErrorCode.Forbidden,
        message: 'Only superAdmin can modify a superAdmin',
      });
    }

    const ok = await this.repo.updateUserStatus(userId, status);
    if (!ok) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'User not found',
      });
    }

    await this.repo.writeAuditLog({
      actorUserId: actorId,
      actorRole: actorRoles[0] ?? null,
      action: 'user.status.update',
      entityType: 'user',
      entityId: userId,
      oldValue: { status: target.status },
      newValue: { status },
    });

    return this.getUser(userId);
  }

  async assignRole(
    actorId: string,
    actorRoles: string[],
    userId: string,
    code: string,
  ): Promise<AdminUserDetailDto> {
    const target = await this.repo.findUserById(userId);
    if (!target) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'User not found',
      });
    }

    const role = await this.repo.findRoleByCode(code);
    if (!role) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: `Unknown role code: ${code}`,
      });
    }

    // تعيين superAdmin يتطلب superAdmin
    if (code === 'superAdmin' && !actorRoles.includes('superAdmin')) {
      throw new ForbiddenException({
        code: ErrorCode.Forbidden,
        message: 'Only superAdmin can assign superAdmin role',
      });
    }

    await this.repo.assignRole(userId, role.id, actorId);

    await this.repo.writeAuditLog({
      actorUserId: actorId,
      actorRole: actorRoles[0] ?? null,
      action: 'user.role.assign',
      entityType: 'user',
      entityId: userId,
      newValue: { roleCode: code },
    });

    return this.getUser(userId);
  }

  async removeRole(
    actorId: string,
    actorRoles: string[],
    userId: string,
    code: string,
  ): Promise<AdminUserDetailDto> {
    if (code === 'superAdmin' && !actorRoles.includes('superAdmin')) {
      throw new ForbiddenException({
        code: ErrorCode.Forbidden,
        message: 'Only superAdmin can remove superAdmin role',
      });
    }

    const ok = await this.repo.removeRole(userId, code);
    if (!ok) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Role not assigned to this user',
      });
    }

    await this.repo.writeAuditLog({
      actorUserId: actorId,
      actorRole: actorRoles[0] ?? null,
      action: 'user.role.remove',
      entityType: 'user',
      entityId: userId,
      oldValue: { roleCode: code },
    });

    return this.getUser(userId);
  }

  async listRoles(): Promise<AdminRoleDto[]> {
    const rows = await this.repo.listRoles();
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      nameAr: r.name_ar,
      nameEn: r.name_en,
      description: r.description,
    }));
  }

  // ───── Stores ─────

  async listStores(query: AdminUserQueryDto): Promise<Paginated<AdminStoreListItemDto>> {
    const { rows, total } = await this.repo.listStores(query);
    return buildPage(
      rows.map((s) => ({
        id: s.id,
        nameAr: s.name_ar,
        nameEn: s.name_en,
        status: s.status,
        isOpen: s.is_open,
        ownerEmail: s.owner_email,
        ratingAvg: Number(s.rating_avg),
        ratingCount: s.rating_count,
        createdAt: s.created_at.toISOString(),
      })),
      total,
      query,
    );
  }

  async updateStoreStatus(
    actorId: string,
    actorRoles: string[],
    storeId: string,
    status: string,
  ): Promise<{ status: string }> {
    const ok = await this.repo.updateStoreStatus(storeId, status);
    if (!ok) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Store not found',
      });
    }

    await this.repo.writeAuditLog({
      actorUserId: actorId,
      actorRole: actorRoles[0] ?? null,
      action: 'store.status.update',
      entityType: 'store',
      entityId: storeId,
      newValue: { status },
    });

    return { status: 'ok' };
  }

  // ───── Drivers ─────

  async listDrivers(query: AdminUserQueryDto): Promise<Paginated<AdminDriverListItemDto>> {
    const { rows, total } = await this.repo.listDrivers(query);
    return buildPage(
      rows.map((d) => ({
        userId: d.user_id,
        fullName: d.full_name,
        email: d.email,
        phone: d.phone,
        vehicleType: d.vehicle_type,
        status: d.status,
        availability: d.availability,
        ratingAvg: Number(d.rating_avg),
        ratingCount: d.rating_count,
      })),
      total,
      query,
    );
  }

  async updateDriverStatus(
    actorId: string,
    actorRoles: string[],
    userId: string,
    status: string,
  ): Promise<{ status: string }> {
    const ok = await this.repo.updateDriverStatus(userId, status);
    if (!ok) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Driver not found',
      });
    }

    await this.repo.writeAuditLog({
      actorUserId: actorId,
      actorRole: actorRoles[0] ?? null,
      action: 'driver.status.update',
      entityType: 'driver',
      entityId: userId,
      newValue: { status },
    });

    return { status: 'ok' };
  }

  // ───── Orders ─────

  async listOrders(query: AdminOrderQueryDto): Promise<Paginated<AdminOrderListItemDto>> {
    const { rows, total } = await this.repo.listOrders(query);
    return buildPage(
      rows.map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        status: o.status,
        customerName: o.customer_name,
        storeName: o.store_name,
        driverName: o.driver_name,
        total: Number(o.total),
        currency: o.currency,
        createdAt: o.created_at.toISOString(),
      })),
      total,
      query,
    );
  }

  async getOrder(orderId: string): Promise<any> {
    const o = await this.repo.findOrderById(orderId);
    if (!o) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Order not found',
      });
    }
    return {
      id: o.id,
      orderNumber: o.order_number,
      status: o.status,
      recipientName: o.recipient_name,
      recipientPhone: o.recipient_phone,
      deliveryAddressText: o.delivery_address_text,
      deliveryLatitude: Number(o.delivery_latitude),
      deliveryLongitude: Number(o.delivery_longitude),
      paymentMethod: o.payment_method,
      paymentStatus: o.payment_status,
      currency: o.currency,
      subtotal: Number(o.subtotal),
      deliveryFee: Number(o.delivery_fee),
      discountTotal: Number(o.discount_total),
      total: Number(o.total),
      customerNotes: o.customer_notes,
      cancelReason: o.cancel_reason,
      rejectReason: o.reject_reason,
      placedAt: o.placed_at ? o.placed_at.toISOString() : null,
      acceptedAt: o.accepted_at ? o.accepted_at.toISOString() : null,
      readyAt: o.ready_at ? o.ready_at.toISOString() : null,
      pickedUpAt: o.picked_up_at ? o.picked_up_at.toISOString() : null,
      deliveredAt: o.delivered_at ? o.delivered_at.toISOString() : null,
      cancelledAt: o.cancelled_at ? o.cancelled_at.toISOString() : null,
      createdAt: o.created_at.toISOString(),
      storeName: o.store_name,
      customerName: o.customer_name,
      customerEmail: o.customer_email,
      customerPhone: o.customer_phone,
      driverName: o.driver_name,
      driverPhone: o.driver_phone,
    };
  }

  /**
   * إلغاء الطلب من قبل الإدارة.
   * يمكن الإلغاء من أي حالة غير نهائية.
   */
  async cancelOrder(
    actorId: string,
    actorRoles: string[],
    orderId: string,
    reasonCode: CancellationReason,
    note: string | null,
  ): Promise<any> {
    const order = await this.repo.findOrderById(orderId);
    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Order not found',
      });
    }

    const currentStatus = order.status as OrderStatus;

    if (!canActorCancel(currentStatus, 'admin')) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: `لا يمكن إلغاء الطلب في حالته الحالية (${STATUS_LABELS_AR[currentStatus] ?? currentStatus})`,
      });
    }

    const newStatus = getCancellationStatusForActor('admin');
    assertTransition(currentStatus, newStatus);

    // نفّذ الإلغاء
    const updated = await this.repo.cancelOrderAsAdmin(
      orderId,
      actorId,
      reasonCode,
      note,
    );

    if (!updated) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Order not found',
      });
    }

    // إشعار العميل
    try {
      if (order.customer_id) {
        await this.notifications.notifyOrderCancelled(
          order.customer_id,
          order.order_number,
          note ?? reasonCode,
        );
      }
    } catch (err) {
      console.warn('[admin] notify cancel failed:', (err as Error).message);
    }

    // Audit Log
    await this.repo.writeAuditLog({
      actorUserId: actorId,
      actorRole: actorRoles[0] ?? null,
      action: 'order.cancel',
      entityType: 'order',
      entityId: orderId,
      oldValue: { status: currentStatus },
      newValue: { status: newStatus, reasonCode, note },
    });

    return this.getOrder(orderId);
  }

  // ───── Audit Logs ─────

  async listAuditLogs(query: AdminUserQueryDto): Promise<Paginated<AdminAuditLogDto>> {
    const { rows, total } = await this.repo.listAuditLogs(query);
    return buildPage(
      rows.map((a) => ({
        id: String(a.id),
        actorUserId: a.actor_user_id,
        actorRole: a.actor_role,
        action: a.action,
        entityType: a.entity_type,
        entityId: a.entity_id,
        ipAddress: a.ip_address,
        createdAt: a.created_at.toISOString(),
      })),
      total,
      query,
    );
  }

  // ───── Private ─────

  private toUserListItem(u: any): AdminUserListItemDto {
    return {
      id: u.id,
      email: u.email,
      phone: u.phone,
      fullName: u.full_name,
      status: u.status,
      roles: u.roles || [],
      lastLoginAt: u.last_login_at ? u.last_login_at.toISOString() : null,
      createdAt: u.created_at.toISOString(),
    };
  }
}
