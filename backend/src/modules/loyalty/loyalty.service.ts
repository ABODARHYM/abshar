import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import { buildPage, Paginated } from '../../common/pagination.dto';
import { LoyaltyRepository, RewardRow } from './loyalty.repository';
import {
  AdjustPointsDto,
  CreateRewardDto,
  LoyaltyBalanceDto,
  LoyaltyTransactionDto,
  RedeemResponseDto,
  RewardDto,
} from './dto/loyalty.dto';

@Injectable()
export class LoyaltyService {
  constructor(private readonly repo: LoyaltyRepository) {}

  async getBalance(customerId: string): Promise<LoyaltyBalanceDto> {
    const [bal, currency] = await Promise.all([
      this.repo.getBalance(customerId),
      this.repo.getCurrency(),
    ]);
    const pointValue = 0.10;
    return {
      points: bal.points,
      pendingPoints: 0,
      pointValueCurrency: pointValue,
      totalValue: Math.round(bal.points * pointValue * 100) / 100,
      currency,
      lifetimeEarned: Number(bal.lifetime_earned),
      lifetimeRedeemed: Math.abs(Number(bal.lifetime_redeemed)),
    };
  }

  async listMyTransactions(customerId: string, query: { page: number; limit: number }) {
    const { rows, total } = await this.repo.listTransactions(customerId, query);
    return buildPage(rows.map((r) => this.toTx(r)), total, query);
  }

  async listRewards(): Promise<RewardDto[]> {
    const rows = await this.repo.listRewards();
    return rows.map((r) => this.toReward(r));
  }

  async redeem(customerId: string, rewardId: string): Promise<RedeemResponseDto> {
    const reward = await this.repo.findRewardById(rewardId);
    if (!reward || !reward.is_active) {
      throw new NotFoundException({ code: ErrorCode.NotFound, message: 'Reward not found' });
    }
    const bal = await this.repo.getBalance(customerId);
    if (bal.points < reward.points_cost) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: `رصيدك غير كافٍ. تحتاج ${reward.points_cost} نقطة ولديك ${bal.points}`,
      });
    }
    if (reward.stock !== null && reward.used_count >= reward.stock) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'نفدت الكمية',
      });
    }

    try {
      const result = await this.repo.redeem(customerId, reward, await this.repo.getCurrency());
      return {
        success: true,
        pointsSpent: reward.points_cost,
        remainingPoints: result.newBalance,
        reward: this.toReward(reward),
      };
    } catch (e) {
      if ((e as Error).message === 'INSUFFICIENT_POINTS') {
        throw new BadRequestException({ code: ErrorCode.ValidationFailed, message: 'رصيدك غير كافٍ' });
      }
      throw e;
    }
  }

  async adjust(actorId: string, dto: AdjustPointsDto) {
    if (dto.points === 0) {
      throw new BadRequestException({ code: ErrorCode.ValidationFailed, message: 'لا يمكن أن يكون صفراً' });
    }
    await this.repo.addPoints(null, {
      customerId: dto.customerId,
      type: 'adjust',
      points: dto.points,
      description: dto.reason,
      createdBy: actorId,
    });
    return { success: true, points: dto.points };
  }

  async createReward(actorId: string, dto: CreateRewardDto): Promise<RewardDto> {
    const row = await this.repo.createReward(actorId, dto);
    return this.toReward(row);
  }

  /**
   * يُستدعى من OrdersService عند التسليم — كسب نقاط.
   */
  async earnFromOrder(customerId: string, orderId: string, total: number, currency: string): Promise<void> {
    const points = Math.floor(total * 0.01);
    if (points <= 0) return;

    const expiryDays = 365;
    const expiresAt = new Date(Date.now() + expiryDays * 86400000);

    await this.repo.addPoints(null, {
      customerId,
      type: 'earn',
      points,
      orderId,
      description: `Earned from order (${points} pts)`,
      expiresAt,
    });
  }

  private toTx(r: any): LoyaltyTransactionDto {
    return {
      id: r.id,
      type: r.type,
      points: r.points,
      orderId: r.order_id,
      orderNumber: r.order_number,
      description: r.description,
      expiresAt: r.expires_at ? r.expires_at.toISOString() : null,
      createdAt: r.created_at.toISOString(),
    };
  }

  private toReward(r: RewardRow): RewardDto {
    return {
      id: r.id,
      nameAr: r.name_ar,
      nameEn: r.name_en,
      descriptionAr: r.description_ar,
      pointsCost: r.points_cost,
      rewardType: r.reward_type,
      rewardValue: Number(r.reward_value),
      imageUrl: r.image_url,
      stock: r.stock,
      usedCount: r.used_count,
      isActive: r.is_active,
    };
  }
}
