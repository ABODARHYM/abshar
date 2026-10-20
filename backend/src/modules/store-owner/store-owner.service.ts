import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import { buildPage, Paginated } from '../../common/pagination.dto';
import { PaginationQueryDto } from '../../common/pagination.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { StoreOrderQueryDto } from './dto/store-order-query.dto';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CategoryRow,
  MyStoreRow,
  OrderItemRow,
  ProductRow,
  StoreOrderRow,
  StoreOwnerRepository,
} from './store-owner.repository';

export interface MyStoreResponse {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  phone: string | null;
  email: string | null;
  addressText: string;
  latitude: number;
  longitude: number;
  status: string;
  isOpen: boolean;
  acceptsOrders: boolean;
  minOrderAmount: number;
  deliveryFee: number;
  avgPrepMinutes: number;
  ratingAvg: number;
  ratingCount: number;
  commissionRate: number | null;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductResponse {
  id: string;
  storeId: string;
  categoryId: string | null;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  basePrice: number;
  imageUrl: string | null;
  isAvailable: boolean;
  stockQuantity: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryResponse {
  id: string;
  storeId: string | null;
  parentId: string | null;
  nameAr: string;
  nameEn: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface OrderItemResponse {
  id: string;
  productId: string | null;
  productName: string;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  notes: string | null;
}

export interface StoreOrderResponse {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  currency: string;
  subtotal: number;
  deliveryFee: number;
  discountTotal: number;
  total: number;
  customerNotes: string | null;
  deliveryAddressText: string;
  recipientName: string;
  recipientPhone: string;
  rejectReason: string | null;
  placedAt: string | null;
  acceptedAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  items?: OrderItemResponse[];
}

export interface StatsResponse {
  totalOrders: number;
  pendingOrders: number;
  acceptedOrders: number;
  preparingOrders: number;
  readyOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalProducts: number;
  availableProducts: number;
  totalRevenue: number;
}

@Injectable()
export class StoreOwnerService {
  constructor(
    private readonly repo: StoreOwnerRepository,
    private readonly notifications: NotificationsService,
  ) {}

  async requireMyStore(userId: string): Promise<MyStoreRow> {
    const store = await this.repo.findMyStore(userId);
    if (!store) {
      throw new ForbiddenException({
        code: ErrorCode.Forbidden,
        message: 'You do not own any store',
      });
    }
    return store;
  }

  // ───── المتجر ─────

  async getMyStore(userId: string): Promise<MyStoreResponse> {
    const store = await this.requireMyStore(userId);
    return this.toStoreResponse(store);
  }

  async updateMyStore(
    userId: string,
    dto: {
      nameAr?: string;
      nameEn?: string;
      descriptionAr?: string;
      descriptionEn?: string;
      phone?: string;
      addressText?: string;
      isOpen?: boolean;
      acceptsOrders?: boolean;
      minOrderAmount?: number;
      deliveryFee?: number;
      avgPrepMinutes?: number;
    },
  ): Promise<MyStoreResponse> {
    const store = await this.requireMyStore(userId);
    const updated = await this.repo.updateMyStore(store.id, dto);
    if (!updated) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Store not found',
      });
    }
    return this.toStoreResponse(updated);
  }

  // ───── التصنيفات ─────

  async listCategories(userId: string): Promise<CategoryResponse[]> {
    const store = await this.requireMyStore(userId);
    const rows = await this.repo.listMyCategories(store.id);
    return rows.map((c) => this.toCategoryResponse(c));
  }

  async createCategory(
    userId: string,
    data: { nameAr: string; nameEn: string; sortOrder?: number },
  ): Promise<CategoryResponse> {
    const store = await this.requireMyStore(userId);
    const row = await this.repo.createCategory(store.id, data);
    return this.toCategoryResponse(row);
  }

  // ───── المنتجات ─────

  async listProducts(
    userId: string,
    query: { page: number; limit: number; search?: string; categoryId?: string },
  ): Promise<Paginated<ProductResponse>> {
    const store = await this.requireMyStore(userId);
    const { rows, total } = await this.repo.listProducts(store.id, query);
    return buildPage(rows.map((p) => this.toProductResponse(p)), total, query);
  }

  async getProduct(userId: string, productId: string): Promise<ProductResponse> {
    const store = await this.requireMyStore(userId);
    const product = await this.repo.findProduct(productId, store.id);
    if (!product) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Product not found',
      });
    }
    return this.toProductResponse(product);
  }

  async createProduct(
    userId: string,
    dto: CreateProductDto,
  ): Promise<ProductResponse> {
    const store = await this.requireMyStore(userId);

    if (dto.categoryId) {
      const ok = await this.repo.categoryBelongsToStore(dto.categoryId, store.id);
      if (!ok) {
        throw new BadRequestException({
          code: ErrorCode.ValidationFailed,
          message: 'Category not found in your store',
          details: [{ field: 'categoryId', constraints: ['invalid'] }],
        });
      }
    }

    const row = await this.repo.createProduct(store.id, dto);
    return this.toProductResponse(row);
  }

  async updateProduct(
    userId: string,
    productId: string,
    dto: UpdateProductDto,
  ): Promise<ProductResponse> {
    const store = await this.requireMyStore(userId);

    const existing = await this.repo.findProduct(productId, store.id);
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Product not found',
      });
    }

    if (dto.categoryId) {
      const ok = await this.repo.categoryBelongsToStore(dto.categoryId, store.id);
      if (!ok) {
        throw new BadRequestException({
          code: ErrorCode.ValidationFailed,
          message: 'Category not found in your store',
          details: [{ field: 'categoryId', constraints: ['invalid'] }],
        });
      }
    }

    const updated = await this.repo.updateProduct(productId, store.id, dto);
    if (!updated) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Product not found',
      });
    }
    return this.toProductResponse(updated);
  }

  async deleteProduct(
    userId: string,
    productId: string,
  ): Promise<{ status: string }> {
    const store = await this.requireMyStore(userId);
    const ok = await this.repo.softDeleteProduct(productId, store.id);
    if (!ok) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Product not found',
      });
    }
    return { status: 'ok' };
  }

  // ───── الطلبات ─────

  async listOrders(
    userId: string,
    query: StoreOrderQueryDto,
  ): Promise<Paginated<StoreOrderResponse>> {
    const store = await this.requireMyStore(userId);
    const { rows, total } = await this.repo.listOrders(store.id, query);
    return buildPage(rows.map((o) => this.toOrderResponse(o)), total, query);
  }

  async getOrder(userId: string, orderId: string): Promise<StoreOrderResponse> {
    const store = await this.requireMyStore(userId);
    const order = await this.repo.findOrderForStore(orderId, store.id);
    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Order not found',
      });
    }
    const items = await this.repo.listOrderItems(orderId);
    return this.toOrderResponse(order, items);
  }

  async acceptOrder(userId: string, orderId: string): Promise<StoreOrderResponse> {
    const store = await this.requireMyStore(userId);

    const updated = await this.repo.transitionOrderStatus(
      orderId,
      store.id,
      ['pending'],
      'accepted',
      userId,
      'storeOwner',
      'تم القبول من المتجر',
    );

    if (!updated) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Order not found',
      });
    }
    const items = await this.repo.listOrderItems(orderId);
    const full = await this.repo.findOrderForStore(orderId, store.id);

    // 🆕 إشعار العميل + بث للمندوبين (Smart Dispatch)
    if (full) {
      try {
        await this.notifications.notifyOrderAccepted(full.customer_id, full.order_number);
      } catch (e) {
        console.warn('[store-owner] notify accepted failed:', (e as Error).message);
      }

      try {
        const sent = await this.notifications.broadcastOrderReadyToDrivers(
          store.id,
          full.id,
          full.order_number,
          'المتجر',
          '',
        );
        console.log(`[dispatch] ${full.order_number} -> ${sent} drivers`);
      } catch (e) {
        console.warn('[store-owner] dispatch failed:', (e as Error).message);
      }
    }

    return this.toOrderResponse(full ?? updated, items);
  }

  async rejectOrder(
    userId: string,
    orderId: string,
    reason: string,
  ): Promise<StoreOrderResponse> {
    const store = await this.requireMyStore(userId);

    try {
      const updated = await this.repo.transitionOrderStatus(
        orderId,
        store.id,
        ['pending'],
        'rejected',
        userId,
        'storeOwner',
        reason,
      );

      if (!updated) {
        throw new NotFoundException({
          code: ErrorCode.NotFound,
          message: 'Order not found',
        });
      }
      const items = await this.repo.listOrderItems(orderId);
      const full = await this.repo.findOrderForStore(orderId, store.id);
      return this.toOrderResponse(full ?? updated, items);
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

  async markPreparing(userId: string, orderId: string): Promise<StoreOrderResponse> {
    const store = await this.requireMyStore(userId);

    try {
      const updated = await this.repo.transitionOrderStatus(
        orderId,
        store.id,
        ['accepted'],
        'preparing',
        userId,
        'storeOwner',
        'بدأ التحضير',
      );
      if (!updated) {
        throw new NotFoundException({
          code: ErrorCode.NotFound,
          message: 'Order not found',
        });
      }
      const items = await this.repo.listOrderItems(orderId);
      const full = await this.repo.findOrderForStore(orderId, store.id);
      return this.toOrderResponse(full ?? updated, items);
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

  async markReady(userId: string, orderId: string): Promise<StoreOrderResponse> {
    const store = await this.requireMyStore(userId);

    try {
      const updated = await this.repo.transitionOrderStatus(
        orderId,
        store.id,
        ['accepted', 'preparing'],
        'ready',
        userId,
        'storeOwner',
        'الطلب جاهز للاستلام',
      );
      if (!updated) {
        throw new NotFoundException({
          code: ErrorCode.NotFound,
          message: 'Order not found',
        });
      }
      const items = await this.repo.listOrderItems(orderId);
      const full = await this.repo.findOrderForStore(orderId, store.id);

    if (full) {
      try {
        await this.notifications.notifyOrderReady(full.customer_id, full.order_number);
      } catch (e) {
        console.warn('[store-owner] notify ready failed:', (e as Error).message);
      }
    }

      return this.toOrderResponse(full ?? updated, items);
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

  // ───── الإحصائيات ─────


  async cancelOrder(
    userId: string,
    orderId: string,
    reason?: string | null,
    reasonCode?: string | null,
  ): Promise<StoreOrderResponse> {
    const store = await this.requireMyStore(userId);

    const updated = await this.repo.transitionOrderStatus(
      orderId,
      store.id,
      ['pending', 'accepted', 'preparing', 'ready'],
      'cancelled',
      userId,
      'storeOwner',
      reason ?? 'تم الإلغاء من المتجر',
      { actor: 'store', reasonCode: reasonCode ?? 'STORE_CANCELLED' },
    );

    if (!updated) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Order not found',
      });
    }

    const items = await this.repo.listOrderItems(orderId);
    const full = await this.repo.findOrderForStore(orderId, store.id);

    if (full) {
      try {
        await this.notifications.notifyOrderCancelled(
          full.customer_id,
          full.order_number,
          reason ?? 'تم إلغاء طلبك من المتجر',
        );
      } catch (e) {
        console.warn('[store-owner] notify cancelled failed:', (e as Error).message);
      }
    }

    return this.toOrderResponse(full ?? updated, items);
  }

  async getStats(userId: string): Promise<StatsResponse> {
    const store = await this.requireMyStore(userId);
    const s = await this.repo.getStats(store.id);
    return {
      totalOrders: s.total_orders,
      pendingOrders: s.pending_orders,
      acceptedOrders: s.accepted_orders,
      preparingOrders: s.preparing_orders,
      readyOrders: s.ready_orders,
      deliveredOrders: s.delivered_orders,
      cancelledOrders: s.cancelled_orders,
      totalProducts: s.total_products,
      availableProducts: s.available_products,
      totalRevenue: s.total_revenue,
    };
  }

  // ───── helpers ─────

  private toStoreResponse(row: MyStoreRow): MyStoreResponse {
    return {
      id: row.id,
      nameAr: row.name_ar,
      nameEn: row.name_en,
      slug: row.slug,
      descriptionAr: row.description_ar,
      descriptionEn: row.description_en,
      logoUrl: row.logo_url,
      coverUrl: row.cover_url,
      phone: row.phone,
      email: row.email,
      addressText: row.address_text,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      status: row.status,
      isOpen: row.is_open,
      acceptsOrders: row.accepts_orders,
      minOrderAmount: Number(row.min_order_amount),
      deliveryFee: Number(row.delivery_fee),
      avgPrepMinutes: row.avg_prep_minutes,
      ratingAvg: Number(row.rating_avg),
      ratingCount: row.rating_count,
      commissionRate: row.commission_rate !== null ? Number(row.commission_rate) : null,
      isFeatured: row.is_featured,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private toProductResponse(row: ProductRow): ProductResponse {
    return {
      id: row.id,
      storeId: row.store_id,
      categoryId: row.category_id,
      nameAr: row.name_ar,
      nameEn: row.name_en,
      descriptionAr: row.description_ar,
      descriptionEn: row.description_en,
      basePrice: Number(row.base_price),
      imageUrl: row.image_url,
      isAvailable: row.is_available,
      stockQuantity: row.stock_quantity,
      sortOrder: row.sort_order,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private toCategoryResponse(row: CategoryRow): CategoryResponse {
    return {
      id: row.id,
      storeId: row.store_id,
      parentId: row.parent_id,
      nameAr: row.name_ar,
      nameEn: row.name_en,
      imageUrl: row.image_url,
      sortOrder: row.sort_order,
      isActive: row.is_active,
    };
  }

  private toOrderResponse(
    row: StoreOrderRow,
    items?: OrderItemRow[],
  ): StoreOrderResponse {
    const res: StoreOrderResponse = {
      id: row.id,
      orderNumber: row.order_number,
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      status: row.status,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      currency: row.currency,
      subtotal: Number(row.subtotal),
      deliveryFee: Number(row.delivery_fee),
      discountTotal: Number(row.discount_total),
      total: Number(row.total),
      customerNotes: row.customer_notes,
      deliveryAddressText: row.delivery_address_text,
      recipientName: row.recipient_name,
      recipientPhone: row.recipient_phone,
      rejectReason: row.reject_reason,
      placedAt: row.placed_at ? row.placed_at.toISOString() : null,
      acceptedAt: row.accepted_at ? row.accepted_at.toISOString() : null,
      readyAt: row.ready_at ? row.ready_at.toISOString() : null,
      deliveredAt: row.delivered_at ? row.delivered_at.toISOString() : null,
      cancelledAt: row.cancelled_at ? row.cancelled_at.toISOString() : null,
      createdAt: row.created_at.toISOString(),
    };
    if (items) {
      res.items = items.map((i) => ({
        id: i.id,
        productId: i.product_id,
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
