import { OrdersService } from './orders.service';

describe('OrdersService original delivery fee', () => {
  it('persists the pre-coupon fee while applying free delivery to the customer total', async () => {
    const order = {
      id: 'order-1',
      order_number: 'AB261120000001',
      store_id: 'store-1',
      store_name: 'Test Store',
      status: 'pending',
      payment_method: 'cash_on_delivery',
      payment_status: 'pending',
      currency: 'YER',
      subtotal: '1000.00',
      delivery_fee: '0.00',
      discount_total: '0.00',
      total: '1000.00',
      delivery_address_text: 'Marib',
      recipient_name: 'Customer',
      recipient_phone: '777000000',
      customer_notes: null,
      placed_at: null,
      delivered_at: null,
      cancelled_at: null,
      cancellation_actor: null,
      cancellation_reason_code: null,
      cancellation_note: null,
      cancel_reason: null,
      created_at: new Date('2026-11-20T00:00:00.000Z'),
    };
    const repo = {
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      getStoreForOrder: jest.fn().mockResolvedValue({
        id: 'store-1', name_ar: 'Test Store', delivery_fee: '150',
        min_order_amount: '0', is_open: true, accepts_orders: true,
        status: 'active', latitude: '15.4', longitude: '45.3', deleted_at: null,
      }),
      getAddressForUser: jest.fn().mockResolvedValue({
        id: 'address-1', address_line: 'Marib', building: null, floor: null,
        apartment: null, landmark: null, latitude: '15.4', longitude: '45.3',
      }),
      getProductsForOrder: jest.fn().mockResolvedValue([{
        id: 'product-1', store_id: 'store-1', deleted_at: null,
        is_available: true, base_price: '1000', name_ar: 'Product',
      }]),
      getUserInfo: jest.fn().mockResolvedValue({ full_name: 'Customer', phone: '777000000' }),
      getCurrency: jest.fn().mockResolvedValue('YER'),
      create: jest.fn().mockResolvedValue(order),
      listItems: jest.fn().mockResolvedValue([]),
      getStoreOwnerId: jest.fn().mockResolvedValue(null),
    };
    const notifications = { notifyOrderCreated: jest.fn().mockResolvedValue(undefined) };
    const pricing = {
      calculate: jest.fn().mockResolvedValue({ deliveryFee: 120, source: 'test', distanceKm: 1 }),
    };
    const coupons = {
      validateAndCompute: jest.fn().mockResolvedValue({
        discountAmount: 0,
        coupon: { id: 'coupon-1', code: 'FREE' },
        freeDelivery: true,
      }),
      recordUsage: jest.fn().mockResolvedValue(undefined),
    };
    const service = new OrdersService(repo as any, notifications as any, pricing as any, coupons as any);

    await service.create('customer-1', {
      storeId: 'store-1',
      addressId: 'address-1',
      couponCode: 'FREE',
      items: [{ productId: 'product-1', quantity: 1 }],
    } as any);

    expect(repo.create).toHaveBeenCalledWith('customer-1', expect.objectContaining({
      deliveryFee: 0,
      originalDeliveryFee: 120,
      total: 1000,
    }));
  });
});
