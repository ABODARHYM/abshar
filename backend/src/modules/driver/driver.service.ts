import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import { FinanceService } from '../finance/finance.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { DriverCashService } from '../driver-cash/driver-cash.service';
import { DriverCashRepository } from '../driver-cash/driver-cash.repository';
import { LoyaltyService } from '../loyalty/loyalty.service';
import {
  OrderStatus,
  CancellationReason,
  canActorCancel,
  assertTransition,
  getCancellationStatusForActor,
  STATUS_LABELS_AR,
} from '../orders/order-state-machine';
import { buildPage, Paginated } from '../../common/pagination.dto';
import { DriverOrderQueryDto } from './dto/driver-order-query.dto';
import {
  DriverEarningsResponseDto,
  DriverOrderItemDto,
  DriverOrderResponseDto,
  DriverProfileResponseDto,
} from './dto/driver-response.dto';
import {
  DriverOrderItemRow,
  DriverOrderRow,
  DriverRepository,
  DriverRow,
} from './driver.repository';

@Injectable()
export class DriverService {
  constructor(
    private readonly repo: DriverRepository,
    private readonly finance: FinanceService,
    private readonly notifications: NotificationsService,
    private readonly dispatch: DispatchService,
    private readonly driverCash: DriverCashService,
    private readonly driverCashRepo: DriverCashRepository,
    private readonly loyalty: LoyaltyService,
  ) {}

  // ───── Profile ─────

  async requireDriver(userId: string): Promise<DriverRow> {
    const d = await this.repo.findDriverByUserId(userId);
    if (!d) {
      throw new ForbiddenException({
        code: ErrorCode.Forbidden,
        message: 'You are not a registered driver',
      });
    }
    if (d.status !== 'active') {
      throw new ForbiddenException({
        code: ErrorCode.Forbidden,
        message: `Driver account is ${d.status}`,
      });
    }
    return d;
  }

  async getProfile(userId: string): Promise<DriverProfileResponseDto> {
    const d = await this.requireDriver(userId);
    return this.toProfile(d);
  }

  async setAvailability(
    userId: string,
    availability: string,
  ): Promise<DriverProfileResponseDto> {
    const d = await this.requireDriver(userId);
    const updated = await this.repo.updateAvailability(d.user_id, availability);
    if (!updated) throw new NotFoundException({
      code: ErrorCode.NotFound, message: 'Driver not found',
    });
    return this.toProfile(updated);
  }

  async updateLocation(
    userId: string,
    lat: number,
    lng: number,
    orderId?: string,
  ): Promise<{ status: string }> {
    await this.requireDriver(userId);
    await this.repo.updateLocation(userId, lat, lng);
    await this.repo.insertLocationHistory(userId, orderId ?? null, lat, lng);
    return { status: 'ok' };
  }

  // ───── Orders ─────

  async listAvailableOrders(
    userId: string,
    query: DriverOrderQueryDto,
  ): Promise<Paginated<DriverOrderResponseDto>> {
    await this.requireDriver(userId);
    const { rows, total } = await this.repo.listAvailableOrdersForDriver(userId, query);
    return buildPage(rows.map((r) => this.toOrder(r)), total, query);
  }

  async listMyOrders(
    userId: string,
    query: DriverOrderQueryDto,
  ): Promise<Paginated<DriverOrderResponseDto>> {
    await this.requireDriver(userId);
    const { rows, total } = await this.repo.listMyOrders(userId, query);
    return buildPage(rows.map((r) => this.toOrder(r)), total, query);
  }

  async getMyOrder(
    userId: string,
    orderId: string,
  ): Promise<DriverOrderResponseDto> {
    await this.requireDriver(userId);
    const o = await this.repo.findOrderForDriver(orderId, userId);
    if (!o) throw new NotFoundException({
      code: ErrorCode.NotFound, message: 'Order not found',
    });
    const items = await this.repo.listOrderItems(orderId);
    return this.toOrder(o, items);
  }

  async getAvailableOrder(
    userId: string,
    orderId: string,
  ): Promise<DriverOrderResponseDto> {
    await this.requireDriver(userId);
    const o = await this.repo.findOrderForDriver(orderId, null);
    if (!o) throw new NotFoundException({
      code: ErrorCode.NotFound, message: 'Order not found',
    });
    const items = await this.repo.listOrderItems(orderId);
    return this.toOrder(o, items);
  }

  async acceptOrder(
    userId: string,
    orderId: string,
  ): Promise<DriverOrderResponseDto> {
    await this.requireDriver(userId);
    const updated = await this.repo.acceptOrder(orderId, userId);
    if (!updated) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'Cannot accept this order (already taken or not ready)',
      });
    }
    const full = await this.repo.findOrderForDriver(orderId, userId);
    const items = await this.repo.listOrderItems(orderId);

      // إشعار العميل
      if (full) {
        try {
          await this.notifications.notifyDriverAssigned(full.customer_id, full.order_number);

          // 🆕 إشعار المندوب (تم تعيينك)
          try {
            await this.notifications.notifyDriverTaskConfirmed(
              full.driver_id!,
              full.order_number,
              (full as any).store_name ?? 'المتجر',
            );
          } catch {}

          // 🆕 إشعار المتجر (مندوب قادم لاستلام الطلب)
          try {
            await this.notifications.notifyDriverComing(
              full.store_id,
              full.order_number,
              (full as any).driver_name ?? 'المندوب',
            );
          } catch {}
        } catch (err) {
          console.warn("[driver] notify accept failed:", (err as Error).message);
        }
      }

      // Smart Dispatch — إلغاء باقي العروض
      try {
        await this.dispatch.onDriverAccepted(orderId, userId);
      } catch (err) {
        console.warn('[driver] dispatch cleanup failed:', (err as Error).message);
      }
    return this.toOrder(full ?? updated, items);
  }


  /**
   * رفض عرض Smart Dispatch.
   *
   * يتم تسجيل الرفض في driver_assignments بدل حذفه،
   * ثم إعادة تشغيل Smart Dispatch للبحث عن مندوب آخر.
   */
  async rejectOrder(
    userId: string,
    orderId: string,
  ): Promise<{ status: string; message: string }> {
    await this.requireDriver(userId);

    const result = await this.repo.rejectOffer(orderId, userId);

    if (!result.rejected) {
      if (result.reason === 'ALREADY_TAKEN') {
        throw new BadRequestException({
          code: ErrorCode.ValidationFailed,
          message: 'سبق أن استلم مندوب آخر هذا الطلب',
        });
      }

      if (result.reason === 'ALREADY_REJECTED') {
        return {
          status: 'already_rejected',
          message: 'تم رفض هذا العرض مسبقًا',
        };
      }

      if (result.reason === 'ORDER_NOT_FOUND') {
        throw new NotFoundException({
          code: ErrorCode.NotFound,
          message: 'الطلب غير موجود',
        });
      }

      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'العرض غير متاح أو انتهت صلاحيته',
      });
    }

    /*
     * بعد الرفض، حاول تشغيل جولة توزيع جديدة.
     * إذا لم يوجد مندوب آخر، لا نلغي نجاح الرفض.
     */
    try {
      const dispatchInfo = await this.repo.getDispatchInfo(orderId);

      if (dispatchInfo) {
        await this.dispatch.dispatchOrder(dispatchInfo);
      }
    } catch (err) {
      console.warn(
        '[driver] redispatch after reject failed:',
        (err as Error).message,
      );
    }

    return {
      status: 'rejected',
      message: 'تم رفض العرض بنجاح',
    };
  }

  async pickup(userId: string, orderId: string): Promise<DriverOrderResponseDto> {
    return this.transition(userId, orderId, ['driverAssigned', 'driverGoingToStore', 'driverArrivedStore'], 'pickedUp', 'تم استلام الطلب من المتجر');
  }

  async inTransit(userId: string, orderId: string): Promise<DriverOrderResponseDto> {
    return this.transition(userId, orderId, ['pickedUp'], 'driverGoingToCustomer', 'المندوب في الطريق للعميل');
  }

  async arrived(userId: string, orderId: string): Promise<DriverOrderResponseDto> {
    return this.transition(userId, orderId, ['driverGoingToCustomer'], 'driverArrivedCustomer', 'وصل المندوب للعميل');
  }

  async deliver(userId: string, orderId: string): Promise<DriverOrderResponseDto> {
    return this.transition(userId, orderId, ['driverArrivedCustomer', 'driverGoingToCustomer', 'pickedUp'], 'delivered', 'تم التسليم بنجاح');
  }

  /**
   * إلغاء المهمة من قبل المندوب.
   */
  async cancelOrder(
    userId: string,
    orderId: string,
    reasonCode: CancellationReason,
    note: string | null,
  ): Promise<DriverOrderResponseDto> {
    await this.requireDriver(userId);

    const order = await this.repo.findOrderForDriver(orderId, userId);
    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Order not found or not assigned to you',
      });
    }

    const currentStatus = order.status as OrderStatus;

    if (!canActorCancel(currentStatus, 'driver')) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: `لا يمكن إلغاء المهمة في حالتها الحالية (${STATUS_LABELS_AR[currentStatus] ?? currentStatus})`,
      });
    }

    const newStatus = getCancellationStatusForActor('driver');
    assertTransition(currentStatus, newStatus);

    try {
      const updated = await this.repo.transitionOrderStatus(
        orderId,
        userId,
        [currentStatus],
        newStatus,
        note ?? reasonCode,
        { actor: 'driver', reasonCode },
      );

      if (!updated) {
        throw new NotFoundException({
          code: ErrorCode.NotFound,
          message: 'Order not found',
        });
      }

      // إشعار العميل
      if (order) {
        try {
          await this.notifications.notifyOrderCancelled(
            order.customer_id,
            order.order_number,
            note ?? reasonCode,
          );
        } catch (err) {
          console.warn('[driver] notify cancel failed:', (err as Error).message);
        }
      }

      const full = await this.repo.findOrderForDriver(orderId, userId);
      const items = await this.repo.listOrderItems(orderId);
      return this.toOrder(full ?? updated, items);
    } catch (e) {
      if ((e as Error).message?.includes('Cannot transition')) {
        throw new BadRequestException({
          code: ErrorCode.ValidationFailed,
          message: (e as Error).message,
        });
      }
      throw e;
    }
  }

  // ───── Earnings ─────

  async getEarnings(userId: string): Promise<DriverEarningsResponseDto> {
    await this.requireDriver(userId);
    const e = await this.repo.getEarnings(userId);
    return {
      totalEarnings: Number(e.total_earnings),
      totalDeliveries: Number(e.total_deliveries),
      todayEarnings: Number(e.today_earnings),
      todayDeliveries: Number(e.today_deliveries),
      weekEarnings: Number(e.week_earnings),
      weekDeliveries: Number(e.week_deliveries),
      monthEarnings: Number(e.month_earnings),
      monthDeliveries: Number(e.month_deliveries),
    };
  }

  // ───── Private ─────

  private async transition(
    userId: string,
    orderId: string,
    expectedFrom: string[],
    toStatus: string,
    note: string,
  ): Promise<DriverOrderResponseDto> {
    await this.requireDriver(userId);
    try {
      const updated = await this.repo.transitionOrderStatus(
        orderId, userId, expectedFrom, toStatus, note,
      );
      if (!updated) {
        throw new NotFoundException({
          code: ErrorCode.NotFound, message: 'Order not found or not assigned to you',
        });
      }
      const full = await this.repo.findOrderForDriver(orderId, userId);
      const items = await this.repo.listOrderItems(orderId);

      // احسب العمولة عند التسليم
      if (toStatus === 'delivered') {
        try {
          await this.finance.computeCommissionForOrder(orderId);
        } catch (err) {
          console.warn('[driver] commission compute failed:', (err as Error).message);
        }

        // ═══ Driver Cash — تسجيل الأرباح + COD ═══
        if (full) {
          try {
            const currency = full.currency || 'YER';
            const deliveryFee = Number(full.delivery_fee);
            const total = Number(full.total);
            const paymentMethod = full.payment_method;

            // 1) driver_earning (من delivery_fee)
            if (deliveryFee > 0) {
              await this.driverCashRepo.recordDriverEarning(
                undefined as any,  // لا نحتاج transaction خارجي
                { driverId: userId, orderId, amount: deliveryFee, currency },
              );
            }

            // 2) cod_collection (إذا COD)
            if (paymentMethod === 'cash_on_delivery' && total > 0) {
              await this.driverCashRepo.recordCashCollection(
                undefined as any,
                { driverId: userId, orderId, amount: total, currency },
              );
            }

            console.log(
              `[driver] cash recorded: earning=${deliveryFee} cod=${paymentMethod === 'cash_on_delivery' ? total : 0} currency=${currency}`,
            );
          } catch (err) {
            console.warn('[driver] cash record failed:', (err as Error).message);
          }

          // ═══ Loyalty — كسب نقاط للعميل ═══
          try {
            await this.loyalty.earnFromOrder(
              full.customer_id,
              orderId,
              Number(full.total),
              full.currency || 'YER',
            );
            console.log(`[driver] loyalty points earned for customer ${full.customer_id}`);
          } catch (err) {
            console.warn('[driver] loyalty earn failed:', (err as Error).message);
          }
        }

        // إشعار العميل
        if (full) {
          try {
            await this.notifications.notifyOrderDelivered(full.customer_id, full.order_number);

            // 🆕 إشعار أرباح للمندوب
            try {
              await this.notifications.notifyEarningsAdded(
                full.driver_id!,
                full.order_number,
                Number((full as any).driver_earnings ?? (full as any).delivery_fee ?? 0),
              );
            } catch {}

            // 🆕 نقاط ولاء للعميل
            const earned = Number((full as any).loyalty_points_earned ?? 0);
            if (earned > 0) {
              try {
                await this.notifications.notifyLoyaltyEarned(
                  full.customer_id,
                  full.order_number,
                  earned,
                );
              } catch {}
            }
          } catch (err) {
            console.warn('[driver] notify delivered failed:', (err as Error).message);
          }
        }
      }

      return this.toOrder(full ?? updated, items);
    } catch (e) {
      if ((e as Error).message?.includes('Cannot transition')) {
        throw new BadRequestException({
          code: ErrorCode.ValidationFailed,
          message: (e as Error).message,
        });
      }
      throw e;
    }
  }

  private toProfile(d: DriverRow): DriverProfileResponseDto {
    return {
      userId: d.user_id,
      fullName: d.full_name,
      phone: d.phone,
      email: d.email,
      vehicleType: d.vehicle_type,
      vehiclePlate: d.vehicle_plate,
      status: d.status,
      availability: d.availability,
      ratingAvg: Number(d.rating_avg),
      ratingCount: d.rating_count,
      lastLatitude: d.last_latitude !== null ? Number(d.last_latitude) : null,
      lastLongitude: d.last_longitude !== null ? Number(d.last_longitude) : null,
      lastLocationAt: d.last_location_at ? d.last_location_at.toISOString() : null,
    };
  }

  private toOrder(
    row: DriverOrderRow,
    items?: DriverOrderItemRow[],
  ): DriverOrderResponseDto {
    // أرباح السائق = رسوم التوصيل
    const driverEarning = Number(row.delivery_fee);
    const res: DriverOrderResponseDto = {
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      storeId: row.store_id,
      storeName: row.store_name,
      storeAddressText: row.store_address_text,
      storeLatitude: Number(row.store_latitude),
      storeLongitude: Number(row.store_longitude),
      storePhone: row.store_phone,
      customerId: row.customer_id,
      customerName: row.customer_name,
      recipientName: row.recipient_name,
      recipientPhone: row.recipient_phone,
      deliveryAddressText: row.delivery_address_text,
      deliveryLatitude: Number(row.delivery_latitude),
      deliveryLongitude: Number(row.delivery_longitude),
      paymentMethod: row.payment_method,
      currency: row.currency,
      subtotal: Number(row.subtotal),
      deliveryFee: Number(row.delivery_fee),
      total: Number(row.total),
      driverEarning,
      customerNotes: row.customer_notes,
      placedAt: row.placed_at ? row.placed_at.toISOString() : null,
      acceptedAt: row.accepted_at ? row.accepted_at.toISOString() : null,
      readyAt: row.ready_at ? row.ready_at.toISOString() : null,
      pickedUpAt: row.picked_up_at ? row.picked_up_at.toISOString() : null,
      deliveredAt: row.delivered_at ? row.delivered_at.toISOString() : null,
      createdAt: row.created_at.toISOString(),
    };
    if (items) {
      res.items = items.map<DriverOrderItemDto>((i) => ({
        id: i.id,
        productName: i.product_name,
        variantName: i.variant_name,
        quantity: i.quantity,
        unitPrice: Number(i.unit_price),
        lineTotal: Number(i.line_total),
        notes: i.notes,
      }));
    }
    return res;
  }
}
