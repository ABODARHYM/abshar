export type NotificationCategory =
  | 'general'
  | 'order'
  | 'delivery'
  | 'payment'
  | 'loyalty'
  | 'referral'
  | 'promo'
  | 'system'
  | 'chat';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  category: NotificationCategory | null;
  priority: NotificationPriority | null;
  icon: string | null;
  action_url: string | null;
  metadata: Record<string, any> | null;
  is_read: boolean;
  read_at: Date | null;
  delivered_at: Date | null;
  created_at: Date;
}

export interface CreateNotificationInput {
  userId: string;
  title: string;
  body: string;
  type?: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  icon?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  push?: boolean;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  is_active: boolean;
  last_used_at: Date | null;
}
