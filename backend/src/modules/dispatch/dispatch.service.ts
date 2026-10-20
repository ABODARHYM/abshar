import { Injectable, Logger } from '@nestjs/common';
import { DispatchRepository, DriverNearbyRow } from './dispatch.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { DispatchResultDto, NearbyDriverDto } from './dto/smart-dispatch.dto';

// ═══════════════ Constants ═══════════════

const TIER_SIZE = 3;              // 3 مندوبين في كل جولة
const OFFER_TTL_SECONDS = 30;     // 30 ثانية للعرض
const MAX_ROUNDS = 3;             // 3 جولات قبل الـ broadcast
const BROADCAST_LIMIT = 20;       // أقصى عدد في الـ broadcast

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly repo: DispatchRepository,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * 🎯 Smart Dispatch — يستدعيه StoreOwner عند markReady
   *
   * 1. يحسب الجولة الحالية
   * 2. إذا الجولة < MAX_ROUNDS → أرسل لـ 3 مندوبين فقط
   * 3. إذا استُنفدت الجولات → Broadcast لكل المتاحين
   */
  async dispatchOrder(params: {
    orderId: string;
    orderNumber: string;
    storeId: string;
    deliveryArea: string;
  }): Promise<DispatchResultDto> {
    // 1) معلومات المتجر
    const store = await this.repo.getStoreInfo(params.storeId);
    if (!store) {
      this.logger.warn(`Store ${params.storeId} not found`);
      return this.emptyResult(params.orderId);
    }

    // 2) الجولة الحالية
    const currentRound = await this.repo.getCurrentRound(params.orderId);
    const nextRound = currentRound + 1;

    // 3) المندوبون الذين عُرض عليهم سابقًا
    const offeredIds = await this.repo.getOfferedDriverIds(params.orderId);

    // 4) هل وصلنا للحد الأقصى من الجولات → broadcast
    if (nextRound > MAX_ROUNDS) {
      return this.broadcastToAll({
        ...params,
        storeLat: Number(store.latitude),
        storeLng: Number(store.longitude),
        excludedDriverIds: offeredIds,
        roundNumber: nextRound,
      });
    }

    // 5) احصل على أقرب 3 مندوبين
    const drivers = await this.repo.findNearbyAvailableDrivers({
      storeLat: Number(store.latitude),
      storeLng: Number(store.longitude),
      excludeDriverIds: offeredIds,
      limit: TIER_SIZE,
    });

    if (drivers.length === 0) {
      this.logger.warn(`No available drivers for order ${params.orderNumber}`);
      return this.emptyResult(params.orderId, nextRound);
    }

    // 6) أنشئ عرضًا لكل مندوب + إشعار
    const expiresAt = new Date(Date.now() + OFFER_TTL_SECONDS * 1000);
    let offered = 0;

    for (const d of drivers) {
      try {
        await this.repo.createOffer({
          orderId: params.orderId,
          driverId: d.user_id,
          expiresAt,
          roundNumber: nextRound,
          tier: 1,
          distanceKm: Number(d.distance_km),
          mode: 'auto',
        });

        await this.notifications.notifyDriverNewTask(
          d.user_id,
          params.orderNumber,
          store.name_ar,
          params.deliveryArea,
          Number(d.distance_km),
          OFFER_TTL_SECONDS,
          params.orderId,
        );

        offered++;
      } catch (err) {
        this.logger.warn(
          `Failed to offer to driver ${d.user_id}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(
      `[SmartDispatch] Round ${nextRound} — offered to ${offered} drivers for order ${params.orderNumber}`,
    );

    return {
      orderId: params.orderId,
      roundNumber: nextRound,
      driversOffered: offered,
      driversTier: 1,
      usesBroadcast: false,
      estimatedRadius: drivers.length > 0 ? Number(drivers[drivers.length - 1].distance_km) : 0,
    };
  }

  /**
   * 📣 Broadcast — لكل المندوبين المتاحين
   */
  private async broadcastToAll(params: {
    orderId: string;
    orderNumber: string;
    storeId: string;
    storeLat: number;
    storeLng: number;
    deliveryArea: string;
    excludedDriverIds: string[];
    roundNumber: number;
  }): Promise<DispatchResultDto> {
    const drivers = await this.repo.findNearbyAvailableDrivers({
      storeLat: params.storeLat,
      storeLng: params.storeLng,
      excludeDriverIds: params.excludedDriverIds,
      limit: BROADCAST_LIMIT,
    });

    if (drivers.length === 0) {
      this.logger.warn(`No drivers for broadcast order ${params.orderNumber}`);
      return this.emptyResult(params.orderId, params.roundNumber, true);
    }

    const expiresAt = new Date(Date.now() + 120 * 1000); // 2 دقيقة للـ broadcast
    let offered = 0;

    for (const d of drivers) {
      try {
        await this.repo.createOffer({
          orderId: params.orderId,
          driverId: d.user_id,
          expiresAt,
          roundNumber: params.roundNumber,
          tier: 2,
          distanceKm: Number(d.distance_km),
          mode: 'auto',
        });

        await this.notifications.notifyDriverNewTask(
          d.user_id,
          params.orderNumber,
          'متجر',
          params.deliveryArea,
          Number(d.distance_km),
          120,
          params.orderId,
        );

        offered++;
      } catch (err) {
        this.logger.warn(`Broadcast failed for ${d.user_id}: ${(err as Error).message}`);
      }
    }

    this.logger.log(
      `[SmartDispatch] BROADCAST to ${offered} drivers for order ${params.orderNumber}`,
    );

    return {
      orderId: params.orderId,
      roundNumber: params.roundNumber,
      driversOffered: offered,
      driversTier: 2,
      usesBroadcast: true,
      estimatedRadius: drivers.length > 0 ? Number(drivers[drivers.length - 1].distance_km) : 0,
    };
  }

  /**
   * عند قبول مندوب → احذف كل العروض الأخرى + الإشعارات
   */
  async onDriverAccepted(orderId: string, driverId: string): Promise<void> {
    // 1) احذف إشعارات ORDER_READY لكل المندوبين
    await this.notifications.removeOrderReadyNotifications(orderId);

    // 2) احذف كل العروض الأخرى
    const removed = await this.repo.removeAllOffersForOrder(orderId);
    this.logger.log(
      `[SmartDispatch] Driver ${driverId} accepted — removed ${removed} other offers`,
    );

    // 3) أعد إسناد هذا المندوب (assignment مُسجَّل بالفعل في driver.service)
  }

  /**
   * إلغاء توزيع الطلب (إذا أُلغي من المتجر)
   */
  async cancelDispatch(orderId: string): Promise<void> {
    await this.notifications.removeOrderReadyNotifications(orderId);
    await this.repo.removeAllOffersForOrder(orderId);
    this.logger.log(`[SmartDispatch] Cancelled dispatch for order ${orderId}`);
  }

  /**
   * تنظيف العروض المنتهية — يُستدعى دوريًا (cron)
   */
  async cleanupExpiredOffers(): Promise<number> {
    const n = await this.repo.expireOldOffers();
    if (n > 0) {
      this.logger.log(`[SmartDispatch] Expired ${n} offers`);
    }
    return n;
  }

  /**
   * أرجع المندوبين القريبين (لأغراض debugging/admin)
   */
  async getNearbyDrivers(params: {
    storeId: string;
    limit?: number;
  }): Promise<NearbyDriverDto[]> {
    const store = await this.repo.getStoreInfo(params.storeId);
    if (!store) return [];

    const drivers = await this.repo.findNearbyAvailableDrivers({
      storeLat: Number(store.latitude),
      storeLng: Number(store.longitude),
      limit: params.limit ?? 10,
    });

    return drivers.map((d) => ({
      driverId: d.user_id,
      fullName: d.full_name,
      distanceKm: Number(d.distance_km),
      ratingAvg: Number(d.rating_avg),
      availability: d.availability,
    }));
  }

  // ═══════════════ Helpers ═══════════════

  private emptyResult(
    orderId: string,
    roundNumber = 0,
    broadcast = false,
  ): DispatchResultDto {
    return {
      orderId,
      roundNumber,
      driversOffered: 0,
      driversTier: broadcast ? 2 : 1,
      usesBroadcast: broadcast,
      estimatedRadius: 0,
    };
  }
}
