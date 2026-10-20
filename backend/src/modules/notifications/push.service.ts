import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { AppConfigService } from '../../config/app-config.service';
import { NotificationsRepository } from './notifications.repository';

export interface PushPayload {
  title: string;
  body: string;
  actionUrl?: string;
  icon?: string;
}

/**
 * إرسال Web Push عبر بروتوكول VAPID (مكتبة web-push).
 * يُفعَّل تلقائيًا عند ضبط VAPID_PUBLIC_KEY و VAPID_PRIVATE_KEY؛ وإلا يبقى معطّلًا
 * والنظام يعمل بالـ WebSocket والإشعارات داخل التطبيق.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly enabled: boolean;
  private readonly publicKey: string | null;

  constructor(
    private readonly repo: NotificationsRepository,
    config: AppConfigService,
  ) {
    const push = config.all.push;
    if (push.enabled && push.publicKey && push.privateKey) {
      webpush.setVapidDetails(push.subject, push.publicKey, push.privateKey);
      this.enabled = true;
      this.publicKey = push.publicKey;
      this.logger.log('Web Push enabled');
    } else {
      this.enabled = false;
      this.publicKey = null;
      this.logger.warn('VAPID keys not configured — Web Push disabled (run: npm run vapid:generate)');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getPublicKey(): string | null {
    return this.publicKey;
  }

  /** يرجع عدد الأجهزة التي استلمت الإشعار فعليًا. يحذف الاشتراكات المنتهية (404/410). */
  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    if (!this.enabled) return 0;

    const subs = await this.repo.listPushSubscriptions(userId);
    if (subs.length === 0) return 0;

    const data = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon ?? '/icons/icon-192.png',
      data: { url: payload.actionUrl ?? '/' },
    });

    const results = await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            data,
            { TTL: 60 * 60 * 24 },
          );
          await this.repo.markPushUsed(sub.endpoint);
          return true;
        } catch (err) {
          const e = err as { statusCode?: number; message?: string };
          this.logger.warn(`Push failed (${sub.endpoint.slice(0, 60)}…): ${e.message ?? 'unknown error'}`);
          if (e.statusCode === 410 || e.statusCode === 404) {
            await this.repo.removePushSubscription(userId, sub.endpoint);
          }
          return false;
        }
      }),
    );
    return results.filter(Boolean).length;
  }
}
