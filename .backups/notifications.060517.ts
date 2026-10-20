import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import { PaginationQueryDto, buildPage } from '../../common/pagination.dto';
import { NotificationsRepository } from './notifications.repository';
import { PushService } from './push.service';
import { NotificationsGateway } from './notifications.gateway';
import { PushSubscribeDto } from './notifications.dto';
import {
  CreateNotificationInput,
  NotificationRow,
  NotificationCategory,
} from './notifications.types';

export interface NotificationResponse {
  id: string;
  type: string;
  title: string;
  body: string;
  data: any;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  category?: string | null;
  priority?: string | null;
  actionUrl?: string | null;
  icon?: string | null;
}

export interface NotificationListResponse {
  items: NotificationResponse[];
  unreadCount: number;
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repo: NotificationsRepository,
    private readonly push: PushService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async send(input: CreateNotificationInput): Promise<NotificationRow> {
    const notification = await this.repo.create(null, input);
    try {
      this.gateway.emitToUser(input.userId, 'notification', {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        category: notification.category,
        priority: notification.priority,
        actionUrl: notification.action_url,
        icon: notification.icon,
        createdAt: notification.created_at,
      });
    } catch (e) {
      this.logger.warn(`WS emit failed: ${(e as Error).message}`);
    }
    if (input.push !== false && this.push.isEnabled()) {
      try {
        await this.push.sendToUser(input.userId, {
          title: notification.title,
          body: notification.body,
          actionUrl: notification.action_url ?? undefined,
          icon: notification.icon ?? undefined,
        });
      } catch (e) {
        this.logger.warn(`Push failed: ${(e as Error).message}`);
      }
    }
    return notification;
  }

  async list(
    userId: string,
    query: { page: number; limit: number; unreadOnly?: boolean; category?: string },
  ): Promise<NotificationListResponse> {
    const { rows, total, unreadCount } = await this.repo.listMine(userId, {
      sortOrder: 'desc',
      page: query.page,
      limit: query.limit,
      unreadOnly: query.unreadOnly,
      category: query.category,
    } as any);
    const page = buildPage(rows.map((r) => this.toResponse(r)), total, {
      page: query.page,
      limit: query.limit,
    } as any);
    return { items: page.items, meta: page.meta, unreadCount };
  }

  async listMine(
    userId: string,
    q: PaginationQueryDto & { category?: NotificationCategory; unreadOnly?: boolean },
  ) {
    const { rows, total, unreadCount } = await this.repo.listMine(userId, q as any);
    const page = buildPage(rows.map((r) => this.toResponse(r)), total, q);
    return { items: page.items, meta: page.meta, unreadCount };
  }

  async markAsRead(userId: string, id: string): Promise<{ status: string }> {
    const ok = await this.repo.markRead(userId, id);
    if (!ok) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Notification not found',
      });
    }
    return { status: 'ok' };
  }

  async markAllAsRead(userId: string): Promise<{ marked: number }> {
    const n = await this.repo.markAllRead(userId);
    return { marked: n };
  }

  async remove(userId: string, id: string): Promise<{ status: string }> {
    const ok = await this.repo.delete(userId, id);
    if (!ok) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Notification not found',
      });
    }
    return { status: 'ok' };
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const n = await this.repo.unreadCount(userId);
    return { unreadCount: n };
  }

  async unreadCount(userId: string) {
    const count = await this.repo.unreadCount(userId);
    return { count };
  }

  async markRead(userId: string, id: string) {
    const ok = await this.repo.markRead(userId, id);
    return { success: ok };
  }

  async markAllRead(userId: string) {
    const count = await this.repo.markAllRead(userId);
    return { success: true, count };
  }

  async delete(userId: string, id: string) {
    const ok = await this.repo.delete(userId, id);
    return { success: ok };
  }

  async notifyOrderCreated(
    customerId: string,
    orderNumber: string,
    storeName: string,
  ): Promise<void> {
    await this.send({
      userId: customerId,
      type: 'ORDER_CREATED',
      title: 'تم استلام طلبك',
      body: `طلبك ${orderNumber} من ${storeName} قيد المراجعة`,
      category: 'order',
      metadata: { orderNumber },
    });
  }

  async notifyOrderAccepted(customerId: string, orderNumber: string): Promise<void> {
    await this.send({
      userId: customerId,
      type: 'ORDER_ACCEPTED',
      title: 'تم قبول طلبك',
      body: `طلبك ${orderNumber} قيد التحضير`,
      category: 'order',
      metadata: { orderNumber },
    });
  }

  async notifyOrderReady(customerId: string, orderNumber: string): Promise<void> {
    await this.send({
      userId: customerId,
      type: 'ORDER_READY',
      title: 'طلبك جاهز',
      body: `طلبك ${orderNumber} جاهز للاستلام من المتجر`,
      category: 'order',
      metadata: { orderNumber },
    });
  }

  async notifyDriverAssigned(customerId: string, orderNumber: string): Promise<void> {
    await this.send({
      userId: customerId,
      type: 'DRIVER_ASSIGNED',
      title: 'المندوب في الطريق',
      body: `المندوب استلم طلبك ${orderNumber}`,
      category: 'delivery',
      metadata: { orderNumber },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 🆕 notifyDriverComing — المندوب في الطريق
  // ═══════════════════════════════════════════════════════════
  async notifyDriverComing(
    recipientId: string,
    orderNumber: string,
    driverName: string,
  ): Promise<void> {
    await this.send({
      userId: recipientId,
      type: 'DRIVER_ASSIGNED',
      title: '🛵 مندوب في الطريق',
      body: `${driverName} قادم للطلب ${orderNumber}`,
      category: 'delivery',
      metadata: { orderNumber, driverName },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 🆕 notifyDriverTaskConfirmed — تأكيد للمندوب
  // ═══════════════════════════════════════════════════════════
  async notifyDriverTaskConfirmed(
    driverId: string,
    orderNumber: string,
    storeName: string,
  ): Promise<void> {
    await this.send({
      userId: driverId,
      type: 'DRIVER_ASSIGNED',
      title: '✅ تم تعيينك',
      body: `أنت الآن مندوب الطلب ${orderNumber} من ${storeName}`,
      category: 'delivery',
      priority: 'high',
      metadata: { orderNumber, storeName, action: 'confirmed' },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 🆕 notifyEarningsAdded — ربح جديد للمندوب
  // ═══════════════════════════════════════════════════════════
  async notifyEarningsAdded(
    driverId: string,
    orderNumber: string,
    amount: number,
  ): Promise<void> {
    await this.send({
      userId: driverId,
      type: 'EARNINGS_ADDED',
      title: '💰 ربح جديد',
      body: `+${amount} ر.س من الطلب ${orderNumber}`,
      category: 'delivery',
      priority: 'normal',
      metadata: { orderNumber, amount },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 🆕 notifyLoyaltyEarned — نقاط ولاء للعميل
  // ═══════════════════════════════════════════════════════════
  async notifyLoyaltyEarned(
    customerId: string,
    orderNumber: string,
    points: number,
  ): Promise<void> {
    await this.send({
      userId: customerId,
      type: 'LOYALTY_EARNED',
      title: '🎁 نقاط ولاء',
      body: `حصلت على ${points} نقطة من الطلب ${orderNumber}`,
      category: 'loyalty',
      priority: 'normal',
      metadata: { orderNumber, points },
    });
  }


  async notifyOrderDelivered(customerId: string, orderNumber: string): Promise<void> {
    await this.send({
      userId: customerId,
      type: 'ORDER_DELIVERED',
      title: 'تم التوصيل',
      body: `طلبك ${orderNumber} تم توصيله بنجاح`,
      category: 'delivery',
      metadata: { orderNumber },
    });
  }

  async notifyOrderCancelled(
    customerId: string,
    orderNumber: string,
    reason: string,
  ): Promise<void> {
    await this.send({
      userId: customerId,
      type: 'ORDER_CANCELLED',
      title: 'تم إلغاء الطلب',
      body: `طلبك ${orderNumber} تم إلغاؤه: ${reason}`,
      category: 'order',
      metadata: { orderNumber, reason },
    });
  }

  async notifyStoreNewOrder(
    storeOwnerId: string,
    orderNumber: string,
    total: number,
  ): Promise<void> {
    await this.send({
      userId: storeOwnerId,
      type: 'ORDER_CREATED',
      title: 'طلب جديد',
      body: `طلب جديد ${orderNumber} بقيمة ${total}`,
      category: 'order',
      priority: 'high',
      metadata: { orderNumber, total },
    });
  }

  async notifyDriverNewTask(
    driverId: string,
    orderNumber: string,
    storeName: string,
    deliveryArea: string,
    distanceKm: number,
    expiresInSeconds: number,
    orderId: string,
  ): Promise<void> {
    const distanceText = distanceKm < 9000 ? ` | ${distanceKm.toFixed(1)} كم` : '';
    await this.send({
      userId: driverId,
      type: 'ORDER_READY',
      title: 'طلب جديد متاح',
      body: `${storeName} - ${deliveryArea}${distanceText}`,
      category: 'delivery',
      priority: 'high',
      metadata: {
        orderId,
        orderNumber,
        storeName,
        deliveryArea,
        distanceKm,
        expiresInSeconds,
        action: 'available',
      },
    });
  }

  async broadcastOrderReadyToDrivers(
    storeId: string,
    orderId: string,
    orderNumber: string,
    storeName: string,
    deliveryArea: string,
  ): Promise<number> {
    const drivers = await this.repo.getAvailableDriversForStore(storeId, 20);
    if (drivers.length === 0) return 0;
    let sent = 0;
    for (const d of drivers) {
      try {
        await this.send({
          userId: d.user_id,
          type: 'ORDER_READY',
          title: 'طلب جديد متاح',
          body: `طلب ${orderNumber} من ${storeName}`,
          category: 'delivery',
          priority: 'high',
          metadata: { orderId, orderNumber, storeName, action: 'available' },
        });
        sent++;
      } catch {}
    }
    return sent;
  }

  async removeOrderReadyNotifications(orderId: string): Promise<number> {
    try {
      return await this.repo.deleteByOrderAndType(orderId, 'ORDER_READY');
    } catch {
      return 0;
    }
  }

  async subscribePush(userId: string, dto: PushSubscribeDto) {
    // الصيغة القياسية (keys.*) لها الأولوية؛ وإلا الحقول المسطّحة. الـ DTO يضمن وجود أحدهما.
    const p256dh = dto.keys?.p256dh ?? dto.p256dh;
    const auth = dto.keys?.auth ?? dto.auth;
    if (!p256dh || !auth) {
      throw new BadRequestException('Push subscription keys (p256dh, auth) are required');
    }
    await this.repo.savePushSubscription(userId, {
      endpoint: dto.endpoint,
      p256dh,
      auth,
      userAgent: dto.userAgent,
    });
    return { success: true };
  }

  async unsubscribePush(userId: string, endpoint: string) {
    await this.repo.removePushSubscription(userId, endpoint);
    return { success: true };
  }

  async registerDevice(
    userId: string,
    token: string,
    platform: 'web' | 'android' | 'ios',
  ) {
    await this.repo.saveDeviceToken(userId, token, platform);
    return { success: true };
  }

  pushPublicKey() {
    return {
      publicKey: this.push.getPublicKey(),
      enabled: this.push.isEnabled(),
    };
  }

  private toResponse(row: NotificationRow): NotificationResponse {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      data: (row.metadata ?? {}) as any,
      isRead: row.is_read,
      readAt: row.read_at ? row.read_at.toISOString() : null,
      createdAt: row.created_at.toISOString(),
      category: row.category,
      priority: row.priority,
      actionUrl: row.action_url,
      icon: row.icon,
    };
  }
}
