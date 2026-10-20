import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ReferralRepository } from './referral.repository';
import { LoyaltyRepository } from '../loyalty/loyalty.repository';
import { DatabaseService } from '../../database/database.service';
import { ErrorCode } from '../../common/error-codes';
import { PaginationQueryDto, buildPage } from '../../common/pagination.dto';
import {
  REWARD_ON_SIGNUP,
  REWARD_ON_FIRST_ORDER,
  ReferralWithUsersRow,
} from './referral.types';

@Injectable()
export class ReferralService {
  constructor(
    private readonly repo: ReferralRepository,
    private readonly loyaltyRepo: LoyaltyRepository,
    private readonly db: DatabaseService,
  ) {}

  // ═══ My Code ═══
  async getMyCode(userId: string) {
    const code = await this.repo.ensureMyCode(userId);
    return {
      referralCode: code,
      shareUrl: `https://absher-bi.com/invite/${code}`,
      rewardOnSignup: REWARD_ON_SIGNUP,
      rewardOnFirstOrder: REWARD_ON_FIRST_ORDER,
    };
  }

  // ═══ Validate ═══
  async validate(userId: string, code: string) {
    const codeUpper = code.toUpperCase();

    const owner = await this.repo.findByCode(codeUpper);
    if (!owner) return { valid: false, reason: 'CODE_NOT_FOUND' };
    if (owner.user_id === userId) return { valid: false, reason: 'SELF_REFERRAL' };

    const existing = await this.repo.findExistingReferral(userId);
    if (existing) return { valid: false, reason: 'ALREADY_REFERRED' };

    const hasOrdered = await this.repo.hasUserOrdered(userId);
    if (hasOrdered) return { valid: false, reason: 'ALREADY_ORDERED' };

    return { valid: true };
  }

  // ═══ Apply ═══
  async apply(userId: string, code: string) {
    const codeUpper = code.toUpperCase();

    const owner = await this.repo.findByCode(codeUpper);
    if (!owner) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'كود الإحالة غير موجود',
      });
    }

    if (owner.user_id === userId) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'لا يمكنك استخدام كود الإحالة الخاص بك',
      });
    }

    const existing = await this.repo.findExistingReferral(userId);
    if (existing) {
      throw new ConflictException({
        code: ErrorCode.ValidationFailed,
        message: 'لقد استخدمت كود إحالة مسبقاً',
      });
    }

    const hasOrdered = await this.repo.hasUserOrdered(userId);
    if (hasOrdered) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'لا يمكن تطبيق كود الإحالة بعد إجراء أول طلب',
      });
    }

    const referral = await this.db.transaction(async (client) => {
      const ref = await this.repo.createReferral(client, {
        referrerId: owner.user_id,
        referredId: userId,
        code: codeUpper,
        rewardPoints: REWARD_ON_SIGNUP,
      });

      // مكافأة الطرفين عند التسجيل
      await this.loyaltyRepo.addPoints(client, {
        customerId: owner.user_id,
        type: 'earn',
        points: REWARD_ON_SIGNUP,
        description: `مكافأة إحالة — صديقك سجّل بكودك (${codeUpper})`,
      });

      await this.loyaltyRepo.addPoints(client, {
        customerId: userId,
        type: 'earn',
        points: REWARD_ON_SIGNUP,
        description: `مكافأة ترحيبية — سجّلت بكود إحالة (${codeUpper})`,
      });

      // علّم الإحالة كمكتملة ومصروفة
      await this.repo.markCompleted(client, ref.id);
      await this.repo.markRewarded(client, ref.id);

      return ref;
    });

    return {
      success: true,
      referralId: referral.id,
      rewardPoints: REWARD_ON_SIGNUP,
      message: `تم تطبيق الكود! حصلت على ${REWARD_ON_SIGNUP} نقطة`,
    };
  }

  // ═══ My Stats ═══
  async getMyStats(userId: string) {
    const s = await this.repo.getMyStats(userId);
    return {
      total: parseInt(s.total, 10),
      pending: parseInt(s.pending, 10),
      completed: parseInt(s.completed, 10),
      rewarded: parseInt(s.rewarded, 10),
      totalPointsEarned: parseInt(s.total_points_earned, 10),
    };
  }

  // ═══ My Invites ═══
  async listMyInvites(userId: string, q: PaginationQueryDto) {
    const { rows, total } = await this.repo.listMyInvites(userId, q);
    return buildPage(rows.map((r) => this.toDto(r)), total, q);
  }

  // ═══ Admin ═══
  async listAll(q: PaginationQueryDto, status?: string) {
    const { rows, total } = await this.repo.listAll(q, status);
    return buildPage(rows.map((r) => this.toDto(r)), total, q);
  }

  async adminCancel(referralId: string) {
    const ref = await this.repo.findById(referralId);
    if (!ref) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'الإحالة غير موجودة',
      });
    }
    if (ref.status === 'cancelled') {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'الإحالة ملغاة مسبقاً',
      });
    }
    await this.repo.cancel(null, referralId);
    return { success: true };
  }

  private toDto(r: ReferralWithUsersRow) {
    return {
      id: r.id,
      code: r.code,
      status: r.status,
      rewardPoints: r.reward_points,
      referrerId: r.referrer_id,
      referrerName: r.referrer_name,
      referredId: r.referred_id,
      referredName: r.referred_name,
      completedAt: r.completed_at,
      rewardedAt: r.rewarded_at,
      createdAt: r.created_at,
    };
  }
}
