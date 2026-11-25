import { PoolClient } from 'pg';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import { buildPage, Paginated } from '../../common/pagination.dto';
import { FinanceRepository } from './finance.repository';
import {
  CommissionDto,
  LedgerEntryDto,
  SettlementDto,
  StoreEarningsDto,
} from './dto/finance-response.dto';

@Injectable()
export class FinanceService {
  constructor(private readonly repo: FinanceRepository) {}

  // ═══════════════ Store Earnings ═══════════════

  async getStoreEarnings(storeId: string): Promise<StoreEarningsDto> {
    const e = await this.repo.getStoreEarnings(storeId);
    const breakdown = e.currency_breakdown.map((row) => ({
      currency: row.currency,
      todayEarnings: Number(row.today_earnings),
      weekEarnings: Number(row.week_earnings),
      monthEarnings: Number(row.month_earnings),
      totalEarnings: Number(row.total_earnings),
      todayOrders: Number(row.today_orders),
      weekOrders: Number(row.week_orders),
      monthOrders: Number(row.month_orders),
      totalOrders: Number(row.total_orders),
      pendingSettlement: Number(row.pending_settlement),
      lastSettlementAt: row.last_settlement_at ? row.last_settlement_at.toISOString() : null,
    }));
    const singleCurrency = breakdown.length === 1 ? breakdown[0] : null;
    return {
      // Legacy scalar money fields are populated only when a single currency exists.
      todayEarnings: singleCurrency?.todayEarnings ?? 0,
      weekEarnings: singleCurrency?.weekEarnings ?? 0,
      monthEarnings: singleCurrency?.monthEarnings ?? 0,
      totalEarnings: singleCurrency?.totalEarnings ?? 0,
      todayOrders: breakdown.reduce((sum, row) => sum + row.todayOrders, 0),
      weekOrders: breakdown.reduce((sum, row) => sum + row.weekOrders, 0),
      monthOrders: breakdown.reduce((sum, row) => sum + row.monthOrders, 0),
      totalOrders: breakdown.reduce((sum, row) => sum + row.totalOrders, 0),
      pendingSettlement: singleCurrency?.pendingSettlement ?? 0,
      lastSettlementAt: breakdown
        .map((row) => row.lastSettlementAt)
        .filter((value): value is string => value !== null)
        .sort()
        .at(-1) ?? null,
      currencyBreakdown: breakdown,
    };
  }

  // ═══════════════ Settlements ═══════════════

  async listSettlements(query: {
    page: number;
    limit: number;
    partyType?: string;
    status?: string;
  }): Promise<Paginated<SettlementDto>> {
    const { rows, total } = await this.repo.listSettlements(query);
    return buildPage(rows.map(this.toSettlement), total, query);
  }

  async getSettlement(id: string): Promise<SettlementDto> {
    const s = await this.repo.findSettlementById(id);
    if (!s) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Settlement not found',
      });
    }
    return this.toSettlement(s);
  }

  async createSettlement(
    actorId: string,
    params: {
      partyType: 'store' | 'driver';
      partyId: string;
      periodStart: string;
      periodEnd: string;
      notes?: string;
      actorRole?: string | null;
    },
  ): Promise<SettlementDto> {
    if (params.periodEnd < params.periodStart) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'Settlement period end must not be before its start',
      });
    }

    const settlement = await this.repo.createSettlement({
      partyType: params.partyType,
      partyId: params.partyId,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      notes: params.notes,
      createdBy: actorId,
      actorRole: params.actorRole ?? null,
    });

    if (!settlement) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'No unsettled commissions are available in this period',
      });
    }

    return this.toSettlement(settlement);
  }

  async approveSettlement(actorId: string, actorRole: string | null, id: string): Promise<SettlementDto> {
    const s = await this.repo.updateSettlementStatus(id, 'approved', actorId, actorRole);
    if (!s) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Settlement not found',
      });
    }
    return this.toSettlement(s);
  }

  async markSettlementPaid(actorId: string, actorRole: string | null, id: string): Promise<SettlementDto> {
    const s = await this.repo.updateSettlementStatus(id, 'paid', actorId, actorRole);
    if (!s) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Settlement not found',
      });
    }
    return this.toSettlement(s);
  }

  async cancelSettlement(actorId: string, actorRole: string | null, id: string): Promise<SettlementDto> {
    const s = await this.repo.updateSettlementStatus(id, 'cancelled', actorId, actorRole);
    if (!s) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Settlement not found',
      });
    }
    return this.toSettlement(s);
  }

  // ═══════════════ Commissions ═══════════════

  async listCommissions(query: {
    page: number;
    limit: number;
    storeId?: string;
  }): Promise<Paginated<CommissionDto>> {
    const { rows, total } = await this.repo.listCommissions(query);
    return buildPage(rows.map(this.toCommission), total, query);
  }

  async computeCommissionForOrder(orderId: string, transactionClient?: PoolClient): Promise<any> {
    return this.repo.computeCommissionForOrder(orderId, transactionClient);
  }

  // ═══════════════ Ledger ═══════════════

  async listLedger(query: {
    page: number;
    limit: number;
    accountType?: string;
    accountId?: string;
  }): Promise<Paginated<LedgerEntryDto>> {
    const { rows, total } = await this.repo.listLedger(query);
    return buildPage(rows.map(this.toLedger), total, query);
  }

  // ═══════════════ Helpers ═══════════════

  async resolveMyStore(userId: string): Promise<string> {
    const r = await this.repo.query<{ id: string }>(
      `SELECT id FROM stores WHERE owner_user_id = $1 AND deleted_at IS NULL LIMIT 1`,
      [userId],
    );
    if (!r.rows[0]) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'You do not own a store',
      });
    }
    return r.rows[0].id;
  }

  private toSettlement(s: any): SettlementDto {
    return {
      id: s.id,
      partyType: s.party_type,
      partyId: s.party_id,
      partyName: s.party_name,
      periodStart: s.period_start,
      periodEnd: s.period_end,
      grossAmount: Number(s.gross_amount),
      commissionAmount: Number(s.commission_amount),
      netAmount: Number(s.net_amount),
      currency: s.currency?.trim?.() ?? null,
      status: s.status,
      notes: s.notes,
      settledAt: s.settled_at ? s.settled_at.toISOString() : null,
      createdAt: s.created_at.toISOString(),
    };
  }

  private toCommission(c: any): CommissionDto {
    return {
      id: c.id,
      orderId: c.order_id,
      orderNumber: c.order_number,
      currency: c.currency,
      storeId: c.store_id,
      storeName: c.store_name,
      ratePercent: Number(c.rate_percent),
      orderAmount: Number(c.order_amount),
      deliveryFee: Number(c.delivery_fee),
      originalDeliveryFee: c.original_delivery_fee === null ? null : Number(c.original_delivery_fee),
      discountAmount: Number(c.discount_amount),
      commissionAmount: Number(c.commission_amount),
      storeAmount: Number(c.store_amount),
      driverAmount: Number(c.driver_amount),
      platformAmount: Number(c.platform_amount),
      createdAt: c.created_at.toISOString(),
    };
  }

  private toLedger(t: any): LedgerEntryDto {
    return {
      id: String(t.id),
      orderId: t.order_id,
      orderNumber: t.order_number,
      accountType: t.account_type,
      accountId: t.account_id,
      type: t.type,
      direction: t.direction,
      amount: Number(t.amount),
      currency: t.currency,
      description: t.description,
      createdAt: t.created_at.toISOString(),
    };
  }
}
