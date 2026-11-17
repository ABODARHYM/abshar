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
