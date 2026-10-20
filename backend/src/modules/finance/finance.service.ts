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
    return {
      todayEarnings: Number(e.today_earnings),
      weekEarnings: Number(e.week_earnings),
      monthEarnings: Number(e.month_earnings),
      totalEarnings: Number(e.total_earnings),
      todayOrders: Number(e.today_orders),
      weekOrders: Number(e.week_orders),
      monthOrders: Number(e.month_orders),
      totalOrders: Number(e.total_orders),
      pendingSettlement: Number(e.pending_settlement),
      lastSettlementAt: e.last_settlement_at ? e.last_settlement_at.toISOString() : null,
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
    },
  ): Promise<SettlementDto> {
    // حساب المستحقات من commissions
    const totals = await this.repo.getUnsettledCommissions(
      params.partyType,
      params.partyId,
      params.periodStart,
      params.periodEnd,
    );

    const gross = Number(totals.gross);
    const commission = Number(totals.commission);
    const net = Number(totals.net);

    if (gross === 0) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'No unsettled commissions in this period',
      });
    }

    const settlement = await this.repo.createSettlement({
      partyType: params.partyType,
      partyId: params.partyId,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      grossAmount: gross,
      commissionAmount: commission,
      netAmount: net,
      notes: params.notes,
      createdBy: actorId,
    });

    return this.toSettlement(settlement);
  }

  async approveSettlement(actorId: string, id: string): Promise<SettlementDto> {
    const s = await this.repo.updateSettlementStatus(id, 'approved', actorId);
    if (!s) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Settlement not found',
      });
    }
    return this.toSettlement(s);
  }

  async markSettlementPaid(actorId: string, id: string): Promise<SettlementDto> {
    const s = await this.repo.updateSettlementStatus(id, 'paid', actorId);
    if (!s) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Settlement not found',
      });
    }
    return this.toSettlement(s);
  }

  async cancelSettlement(actorId: string, id: string): Promise<SettlementDto> {
    const s = await this.repo.updateSettlementStatus(id, 'cancelled', actorId);
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

  async computeCommissionForOrder(orderId: string): Promise<any> {
    return this.repo.computeCommissionForOrder(orderId);
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
      storeId: c.store_id,
      storeName: c.store_name,
      ratePercent: Number(c.rate_percent),
      orderAmount: Number(c.order_amount),
      deliveryFee: Number(c.delivery_fee),
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
