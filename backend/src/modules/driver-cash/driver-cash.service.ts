import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import { buildPage, Paginated } from '../../common/pagination.dto';
import {
  DriverCashRepository,
} from './driver-cash.repository';
import {
  CashSubmitResponseDto,
  DriverCashSummaryDto,
  DriverCashTransactionDto,
  OutstandingDriverDto,
} from './dto/cash-summary.dto';

@Injectable()
export class DriverCashService {
  constructor(private readonly repo: DriverCashRepository) {}

  // ═══════════════ Driver Side ═══════════════

  async getSummary(driverId: string): Promise<DriverCashSummaryDto> {
    const [summary, currency] = await Promise.all([
      this.repo.getSummary(driverId),
      this.repo.getCurrency(),
    ]);

    const totalCollected = Number(summary.total_collected);
    const totalSubmitted = Number(summary.total_submitted);
    const totalEarnings = Number(summary.total_earnings);
    const outstandingCash = Math.max(0, totalCollected - totalSubmitted);
    const netOwed = totalEarnings - outstandingCash;

    return {
      totalCollected,
      totalSubmitted,
      outstandingCash,
      totalEarnings,
      netOwed,
      currency,
    };
  }

  async listMyTransactions(
    driverId: string,
    query: { page: number; limit: number },
  ): Promise<Paginated<DriverCashTransactionDto>> {
    const { rows, total } = await this.repo.listTransactions(driverId, query);
    return buildPage(
      rows.map((r) => this.toTransaction(r)),
      total,
      query,
    );
  }

  async submitCash(
    driverId: string,
    amount: number,
    note: string | null,
  ): Promise<CashSubmitResponseDto> {
    const summary = await this.getSummary(driverId);

    if (amount <= 0) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'المبلغ يجب أن يكون أكبر من صفر',
      });
    }

    if (amount > summary.outstandingCash) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: `المبلغ أكبر من العهدة المعلّقة (${summary.outstandingCash} ${summary.currency})`,
      });
    }

    const currency = await this.repo.getCurrency();
    const result = await this.repo.submitCash(driverId, amount, note, currency);

    const newSummary = await this.getSummary(driverId);

    return {
      success: true,
      submittedAmount: amount,
      newOutstanding: newSummary.outstandingCash,
      transactionId: result.transactionId,
    };
  }

  // ═══════════════ Admin Side ═══════════════

  async listOutstandingDrivers(query: {
    page: number;
    limit: number;
  }): Promise<Paginated<OutstandingDriverDto>> {
    const { rows, total } = await this.repo.listOutstandingDrivers(query);
    const currency = await this.repo.getCurrency();

    return buildPage(
      rows.map((r) => ({
        driverId: r.driver_id,
        fullName: r.full_name,
        phone: r.phone,
        outstandingCash: Number(r.outstanding_cash),
        totalEarnings: Number(r.total_earnings),
        lastCollectionAt: r.last_collection_at
          ? r.last_collection_at.toISOString()
          : null,
        currency,
      })),
      total,
      query,
    );
  }

  async listDriverTransactions(
    driverId: string,
    query: { page: number; limit: number },
  ): Promise<Paginated<DriverCashTransactionDto>> {
    const { rows, total } = await this.repo.listTransactions(driverId, query);
    return buildPage(
      rows.map((r) => this.toTransaction(r)),
      total,
      query,
    );
  }

  async adjust(
    actorId: string,
    driverId: string,
    amount: number,
    reason: string,
  ): Promise<{ transactionId: string; amount: number }> {
    if (amount === 0) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'المبلغ لا يمكن أن يكون صفراً',
      });
    }

    const currency = await this.repo.getCurrency();
    const result = await this.repo.adjust(
      actorId,
      driverId,
      amount,
      reason,
      currency,
    );

    return { transactionId: result.transactionId, amount };
  }

  // ═══════════════ Helpers ═══════════════

  private toTransaction(r: any): DriverCashTransactionDto {
    return {
      id: r.id,
      type: r.type,
      direction: r.direction,
      amount: Number(r.amount),
      currency: r.currency,
      description: r.description,
      orderId: r.order_id,
      orderNumber: r.order_number,
      settlementId: r.settlement_id,
      createdAt: r.created_at.toISOString(),
    };
  }
}
