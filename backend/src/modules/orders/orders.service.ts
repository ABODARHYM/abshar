import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ErrorCode } from '../../common/error-codes';
import { NotificationsService } from '../notifications/notifications.service';
import { PricingService } from '../pricing/pricing.service';
import { CouponsService } from '../coupons/coupons.service';
import { buildPage, Paginated } from '../../common/pagination.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import {
  OrderItemRow,
  OrdersRepository,
  OrderRow,
} from './orders.repository';
import {
  OrderStatus,
  CancellationReason,
  canActorCancel,
  assertTransition,
  getCancellationStatusForActor,
  STATUS_LABELS_AR,
} from './order-state-machine';

export interface OrderItemResponse {
  id: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  notes: string | null;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  storeId: string;
  storeName: string | null;
  status: string;
  statusLabelAr: string;
  paymentMethod: string;
  paymentStatus: string;
  currency: string;
  subtotal: number;
  deliveryFee: number;
  discountTotal: number;
  total: number;
  deliveryAddressText: string;
  recipientName: string;
  recipientPhone: string;
  customerNotes: string | null;
  placedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancellationActor: string | null;
  cancellationReasonCode: string | null;
  cancellationNote: string | null;
  cancelReason: string | null;
  createdAt: string;
  items?: OrderItemResponse[];
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly repo: OrdersRepository,
    private readonly notifications: NotificationsService,
    private readonly pricing: PricingService,
    private readonly coupons: CouponsService,
  ) {}

  async create(customerId: string, dto: CreateOrderDto): Promise<OrderResponse> {
    // 1) Idempotency
    if (dto.idempotencyKey) {
      const existing = await this.repo.findByIdempotencyKey(
        customerId,
        dto.idempotencyKey,
      );
      if (existing) {
        return this.toResponse(existing, await this.repo.listItems(existing.id));
      }
    }

    // 2) تحقق من المتجر
    const store = await this.repo.getStoreForOrder(dto.storeId);
    if (!store || store.deleted_at) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Store not found',
      });
    }
    if (store.status !== 'active' || !store.is_open || !store.accepts_orders) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'Store is not accepting orders right now',
      });
    }

    // 3) تحقق من العنوان
    const address = await this.repo.getAddressForUser(dto.addressId, customerId);
    if (!address || address.deleted_at) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Address not found',
      });
    }

    // 4) تحقق من المنتجات
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.repo.getProductsForOrder(productIds);
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product || product.deleted_at) {
        throw new NotFoundException({
          code: ErrorCode.NotFound,
          message: `Product not found: ${item.productId}`,
        });
      }
      if (product.store_id !== store.id) {
        throw new BadRequestException({
          code: ErrorCode.ValidationFailed,
          message: 'All products must be from the same store',
        });
      }
      if (!product.is_available) {
        throw new BadRequestException({
          code: ErrorCode.ValidationFailed,
          message: `Product is not available: ${product.name_ar}`,
        });
      }
    }

    // 5) احسب items + subtotal أولاً
    const items = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = Number(product.base_price);
      const lineTotal = unitPrice * item.quantity;
      return {
        productId: item.productId,
        variantId: item.variantId,
        productName: product.name_ar,
        variantName: undefined,
        unitPrice,
        quantity: item.quantity,
        lineTotal,
        notes: item.notes,
      };
    });

    const subtotal = items.reduce((t, i) => t + i.lineTotal, 0);

    if (subtotal < Number(store.min_order_amount)) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: `Minimum order amount is ${store.min_order_amount}`,
      });
    }

    // 6) معلومات المستخدم
    const user = await this.repo.getUserInfo(customerId);
    if (!user || !user.phone) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'Your profile is missing a phone number',
      });
    }

    // 7) العملة
    const currency = await this.repo.getCurrency();

    // 8) ═══ حساب delivery fee من Pricing Engine ═══
    let deliveryFee = Number(store.delivery_fee); // fallback
    try {
      const pricing = await this.pricing.calculate({
        storeId: store.id,
        storeLat: Number(store.latitude ?? 0),
        storeLng: Number(store.longitude ?? 0),
        storeDeliveryFee: Number(store.delivery_fee),
        storeMinOrderAmount: Number(store.min_order_amount),
        addressLat: Number(address.latitude),
        addressLng: Number(address.longitude),
        subtotal,
        currency,
      });
      deliveryFee = pricing.deliveryFee;

      console.log(
        `[orders] pricing: source=${pricing.source} distance=${pricing.distanceKm}km fee=${pricing.deliveryFee}`,
      );
    } catch (err) {
      console.warn('[orders] pricing failed, using store default:', (err as Error).message);
    }

    // 8.5) ═══ تطبيق الكوبون (إن وُجد) ═══
    let discountTotal = 0;
    let couponId: string | null = null;
    let finalDeliveryFee = deliveryFee;

    if (dto.couponCode) {
      try {
        const couponResult = await this.coupons.validateAndCompute(
          customerId,
          dto.couponCode,
          subtotal,
          store.id,
        );

        discountTotal = couponResult.discountAmount;
        couponId = couponResult.coupon.id;

        // إذا كان الكوبون "توصيل مجاني" → deliveryFee = 0
        if (couponResult.freeDelivery) {
          finalDeliveryFee = 0;
        }

        console.log(
          `[orders] coupon applied: ${couponResult.coupon.code} | discount=${discountTotal} | freeDelivery=${couponResult.freeDelivery}`,
        );
      } catch (err) {
        console.warn('[orders] coupon rejected:', (err as Error).message);
        throw new BadRequestException({
          code: ErrorCode.ValidationFailed,
          message: `فشل تطبيق الكوبون: ${(err as Error).message}`,
        });
      }
    }

    const total = subtotal + finalDeliveryFee - discountTotal;

    // 9) لقطة العنوان
    const addressText = [
      address.address_line,
      address.building && `بناء ${address.building}`,
      address.floor && `طابق ${address.floor}`,
      address.apartment && `شقة ${address.apartment}`,
      address.landmark,
    ]
      .filter(Boolean)
      .join(' - ');

    // 9) أنشئ الطلب
    const idempotencyKey = dto.idempotencyKey ?? randomUUID();
    const order = await this.repo.create(customerId, {
      storeId: store.id,
      currency,
      deliveryFee: finalDeliveryFee,
      subtotal,
      discountTotal,
      total,
      couponId,
      addressSnapshot: {
        addressId: address.id,
        addressText,
        latitude: Number(address.latitude),
        longitude: Number(address.longitude),
        recipientName: user.full_name,
        recipientPhone: user.phone,
      },
      customerNotes: dto.customerNotes,
      idempotencyKey,
      items,
    });

    // 8.6) ═══ تسجيل استخدام الكوبون ═══
    if (couponId) {
      try {
        await this.coupons.recordUsage(
          customerId,
          couponId,
          order.id,
          discountTotal,
        );
        console.log(`[orders] coupon usage recorded: couponId=${couponId} discount=${discountTotal}`);
      } catch (err) {
        console.warn('[orders] coupon usage record failed:', (err as Error).message);
      }
    }

    const savedItems = await this.repo.listItems(order.id);

    // إشعارات
    try {
      await this.notifications.notifyOrderCreated(
        customerId,
        order.order_number,
        store.name_ar,
      );

      const ownerUserId = await this.repo.getStoreOwnerId(store.id);
      if (ownerUserId) {
        await this.notifications.notifyStoreNewOrder(
          ownerUserId,
          order.order_number,
          total,
        );
      }
    } catch (err) {
      console.warn('[orders] notification failed:', (err as Error).message);
    }

    return this.toResponse(order, savedItems);
  }

  async listMyOrders(
    customerId: string,
    query: OrderQueryDto,
  ): Promise<Paginated<OrderResponse>> {
    const { rows, total } = await this.repo.listMyOrders(customerId, query);
    return buildPage(rows.map((r) => this.toResponse(r)), total, query);
  }

  async getMyOrder(customerId: string, id: string): Promise<OrderResponse> {
    const order = await this.repo.findByIdForCustomer(id, customerId);
    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Order not found',
      });
    }
    const items = await this.repo.listItems(order.id);
    return this.toResponse(order, items);
  }

  /**
   * إلغاء الطلب من قبل العميل.
   * يستخدم State Machine للتحقق من:
   *   1) هل actor (customer) يمكنه الإلغاء من الحالة الحالية؟
   *   2) هل الانتقال مسموح؟
   */
  async cancel(
    customerId: string,
    id: string,
    reasonCode: CancellationReason,
    note: string | null,
  ): Promise<OrderResponse> {
    const order = await this.repo.findByIdForCustomer(id, customerId);
    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Order not found',
      });
    }

    const currentStatus = order.status as OrderStatus;

    // 1) هل العميل يمكنه الإلغاء من هذه الحالة؟
    if (!canActorCancel(currentStatus, 'customer')) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: `لا يمكن إلغاء الطلب في حالته الحالية (${STATUS_LABELS_AR[currentStatus] ?? currentStatus})`,
      });
    }

    // 2) احسب الحالة الجديدة
    const newStatus = getCancellationStatusForActor('customer');

    // 3) هل الانتقال مسموح في State Machine؟
    assertTransition(currentStatus, newStatus);

    // 4) نفّذ الإلغاء
    const updated = await this.repo.cancelByCustomer(
      id,
      customerId,
      reasonCode,
      note,
    );

    if (!updated) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Order not found',
      });
    }

    const items = await this.repo.listItems(updated.id);

    // إشعار المتجر (إن وُجد owner)
    try {
      const ownerUserId = await this.repo.getStoreOwnerId(updated.store_id);
      if (ownerUserId) {
        await this.notifications.notifyOrderCancelled(
          ownerUserId,
          updated.order_number,
          note ?? reasonCode,
        );
      }
    } catch (err) {
      console.warn('[orders] cancel notification failed:', (err as Error).message);
    }

    return this.toResponse(updated, items);
  }

  // ───── helpers ─────

  private toResponse(order: OrderRow, items?: OrderItemRow[]): OrderResponse {
    const status = order.status as OrderStatus;
    const res: OrderResponse = {
      id: order.id,
      orderNumber: order.order_number,
      storeId: order.store_id,
      storeName: order.store_name,
      status: order.status,
      statusLabelAr: STATUS_LABELS_AR[status] ?? order.status,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      currency: order.currency,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.delivery_fee),
      discountTotal: Number(order.discount_total),
      total: Number(order.total),
      deliveryAddressText: order.delivery_address_text,
      recipientName: order.recipient_name,
      recipientPhone: order.recipient_phone,
      customerNotes: order.customer_notes,
      placedAt: order.placed_at ? order.placed_at.toISOString() : null,
      deliveredAt: order.delivered_at ? order.delivered_at.toISOString() : null,
      cancelledAt: order.cancelled_at ? order.cancelled_at.toISOString() : null,
      cancellationActor: (order as any).cancellation_actor ?? null,
      cancellationReasonCode: (order as any).cancellation_reason_code ?? null,
      cancellationNote: (order as any).cancellation_note ?? null,
      cancelReason: order.cancel_reason,
      createdAt: order.created_at.toISOString(),
    };
    if (items) {
      res.items = items.map((i) => ({
        id: i.id,
        productId: i.product_id,
        variantId: i.variant_id,
        productName: i.product_name,
        variantName: i.variant_name,
        unitPrice: Number(i.unit_price),
        quantity: i.quantity,
        lineTotal: Number(i.line_total),
        notes: i.notes,
      }));
    }
    return res;
  }
}
