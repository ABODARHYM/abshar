import { BadRequestException } from '@nestjs/common';
import { FinanceService } from './finance.service';

describe('FinanceService settlement creation', () => {
  const makeSettlement = () => ({
    id: 'settlement-1',
    party_type: 'store',
    party_id: 'store-1',
    party_name: 'Test Store',
    period_start: '2026-11-01',
    period_end: '2026-11-07',
    gross_amount: '900',
    commission_amount: '100',
    net_amount: '900',
    status: 'pending',
    notes: null,
    settled_at: null,
    created_at: new Date('2026-11-17T00:00:00.000Z'),
  });

  it('delegates commission selection and reservation to the atomic repository operation', async () => {
    const repo = { createSettlement: jest.fn().mockResolvedValue(makeSettlement()) };
    const service = new FinanceService(repo as any);

    const result = await service.createSettlement('admin-1', {
      partyType: 'store',
      partyId: 'store-1',
      periodStart: '2026-11-01',
      periodEnd: '2026-11-07',
    });

    expect(repo.createSettlement).toHaveBeenCalledWith({
      partyType: 'store',
      partyId: 'store-1',
      periodStart: '2026-11-01',
      periodEnd: '2026-11-07',
      notes: undefined,
      createdBy: 'admin-1',
      actorRole: null,
    });
    expect(result.id).toBe('settlement-1');
    expect(result.status).toBe('pending');
  });

  it('rejects a period whose end precedes its start', async () => {
    const repo = { createSettlement: jest.fn() };
    const service = new FinanceService(repo as any);

    await expect(service.createSettlement('admin-1', {
      partyType: 'store',
      partyId: 'store-1',
      periodStart: '2026-11-08',
      periodEnd: '2026-11-01',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.createSettlement).not.toHaveBeenCalled();
  });

  it('rejects when no unreserved commissions remain in the requested period', async () => {
    const repo = { createSettlement: jest.fn().mockResolvedValue(null) };
    const service = new FinanceService(repo as any);

    await expect(service.createSettlement('admin-1', {
      partyType: 'driver',
      partyId: 'driver-1',
      periodStart: '2026-11-01',
      periodEnd: '2026-11-07',
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('FinanceService delivery fee review', () => {
  it('returns a paginated review queue with normalized amounts', async () => {
    const repo = {
      listUnverifiedDeliveryFees: jest.fn().mockResolvedValue({
        total: 1,
        rows: [{
          order_id: 'order-1', order_number: 'AB-1', driver_id: 'driver-1',
          driver_name: 'Driver', store_id: 'store-1', store_name: 'Store',
          delivery_fee: '0.00', original_delivery_fee: null, currency: 'YER',
          delivered_at: new Date('2026-11-24T10:00:00.000Z'),
        }],
      }),
    };
    const service = new FinanceService(repo as any);
    const result = await service.listUnverifiedDeliveryFees({ page: 1, limit: 20 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      orderId: 'order-1', customerDeliveryFee: 0, originalDeliveryFee: null,
      reviewStatus: 'pending_review',
    });
    expect(result.meta.total).toBe(1);
  });

  it('requires an existing delivered order before confirming a fee', async () => {
    const repo = { verifyOriginalDeliveryFee: jest.fn().mockResolvedValue(null) };
    const service = new FinanceService(repo as any);
    await expect(service.verifyOriginalDeliveryFee({
      orderId: 'order-missing', amount: 10, reason: 'Verified by source',
      actorId: 'admin-1', actorRole: 'admin',
    })).rejects.toThrow('Delivered order for financial review was not found');
  });
});
