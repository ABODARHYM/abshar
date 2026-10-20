export type ReferralStatus =
  | 'pending'
  | 'completed'
  | 'rewarded'
  | 'expired'
  | 'cancelled';

export interface ReferralRow {
  id: string;
  referrer_id: string;
  referred_id: string;
  code: string;
  status: ReferralStatus;
  reward_points: number;
  completed_at: Date | null;
  rewarded_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ReferralWithUsersRow extends ReferralRow {
  referrer_name: string;
  referrer_email: string;
  referred_name: string;
  referred_email: string;
}

export interface MyCodeRow {
  referral_code: string;
}

export interface ReferralStatsRow {
  total: string;
  pending: string;
  completed: string;
  rewarded: string;
  total_points_earned: string;
}

export const REWARD_ON_SIGNUP = 100;
export const REWARD_ON_FIRST_ORDER = 200;
