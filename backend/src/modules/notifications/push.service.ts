import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { AppConfigService } from '../../config/app-config.service';
import { NotificationsRepository } from './notifications.repository';

export interface PushPayload {
  title: string;
  body: string;
  actionUrl?: string;
  icon?: string;
  priority?: string;
  tag?: string;
}

export interface PushDeliveryResult {
  subscriptionCount: number;
  acceptedEndpoints: string[];
  failedEndpoints: string[];
  failureReasons: string[];
}

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

  isEnabled(): boolean { return this.enabled; }
  getPublicKey(): string | null { return this.publicKey; }

  /**
   * Sends only to endpoints not already accepted for this outbox job.
   * Successful endpoints are persisted by the outbox before a retry, preventing
   * partial-success retries from re-alerting devices that already accepted the push.
   */
  async sendToUserDetailed(
    userId: string,
    payload: PushPayload,
    alreadyAccepted: string[] = [],
  ): Promise<PushDeliveryResult> {
    if (!this.enabled) return { subscriptionCount: 0, acceptedEndpoints: [], failedEndpoints: [], failureReasons: [] };

    const subs = await this.repo.listPushSubscriptions(userId);
    const excluded = new Set(alreadyAccepted);
    const pending = subs.filter((sub) => !excluded.has(sub.endpoint));
    if (pending.length === 0) {
      return { subscriptionCount: subs.length, acceptedEndpoints: [], failedEndpoints: [], failureReasons: [] };
    }

    const data = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon ?? '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      priority: payload.priority ?? 'normal',
      tag: payload.tag,
      actionUrl: payload.actionUrl ?? '/',
      data: { url: payload.actionUrl ?? '/' },
    });

    const acceptedEndpoints: string[] = [];
    const failedEndpoints: string[] = [];
    const failureReasons: string[] = [];
    await Promise.all(pending.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data,
          { TTL: 60 * 60 * 24 },
        );
        acceptedEndpoints.push(sub.endpoint);
        // Usage telemetry must never turn a provider-accepted push into a retry.
        try {
          await this.repo.markPushUsed(sub.endpoint);
        } catch (telemetryError) {
          this.logger.warn(`Could not update push usage for endpoint: ${(telemetryError as Error).message}`);
        }
      } catch (err) {
        const e = err as { statusCode?: number; code?: string };
        const statusCode = Number.isInteger(e.statusCode) ? e.statusCode : undefined;
        const errorCode = typeof e.code === 'string' && /^[A-Z0-9_]{1,40}$/i.test(e.code)
          ? e.code
          : undefined;
        const reason = statusCode
          ? `HTTP ${statusCode}`
          : errorCode
            ? `Network ${errorCode}`
            : 'Unknown provider error';
        // Never log or persist subscription endpoints, provider URLs, or raw error bodies.
        this.logger.warn(`Push delivery failed: ${reason}`);
        if (statusCode === 410 || statusCode === 404) {
          await this.repo.removePushSubscription(userId, sub.endpoint);
        } else {
          failedEndpoints.push(sub.endpoint);
          failureReasons.push(reason);
        }
      }
    }));

    this.logger.log(`Push result for user ${userId}: ${acceptedEndpoints.length}/${pending.length} newly accepted`);
    return { subscriptionCount: subs.length, acceptedEndpoints, failedEndpoints, failureReasons: [...new Set(failureReasons)] };
  }

  async sendToUser(userId: string, payload: PushPayload, requireAll = false): Promise<number> {
    const result = await this.sendToUserDetailed(userId, payload);
    if (requireAll && result.acceptedEndpoints.length !== result.subscriptionCount) {
      throw new Error(`Push delivery incomplete for user ${userId}: ${result.acceptedEndpoints.length}/${result.subscriptionCount} accepted`);
    }
    return result.acceptedEndpoints.length;
  }

  async testToUser(userId: string): Promise<{ subscriptions: number; accepted: number }> {
    const subs = await this.repo.listPushSubscriptions(userId);
    if (subs.length === 0) return { subscriptions: 0, accepted: 0 };
    const accepted = await this.sendToUser(userId, {
      title: 'اختبار إشعارات ABSHER BI',
      body: 'إذا وصل هذا التنبيه، فإن إشعارات هذا الجهاز تعمل بنجاح.',
      actionUrl: '/',
    });
    return { subscriptions: subs.length, accepted };
  }
}
