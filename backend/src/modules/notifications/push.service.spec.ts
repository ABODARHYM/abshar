import * as webpush from 'web-push';
import { PushService } from './push.service';
import { NotificationsRepository } from './notifications.repository';
import { AppConfigService } from '../../config/app-config.service';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

const mocked = webpush as jest.Mocked<typeof webpush>;

function makeRepo(subs: Array<{ endpoint: string; p256dh: string; auth: string }>) {
  return {
    listPushSubscriptions: jest.fn().mockResolvedValue(subs),
    markPushUsed: jest.fn().mockResolvedValue(undefined),
    removePushSubscription: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<NotificationsRepository>;
}

const enabledCfg = {
  all: { push: { enabled: true, publicKey: 'PUB', privateKey: 'PRIV', subject: 'mailto:a@b.c' } },
} as unknown as AppConfigService;
const disabledCfg = { all: { push: { enabled: false, subject: 'mailto:a@b.c' } } } as unknown as AppConfigService;

describe('PushService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is disabled and sends nothing without VAPID keys', async () => {
    const repo = makeRepo([{ endpoint: 'e1', p256dh: 'p', auth: 'a' }]);
    const svc = new PushService(repo, disabledCfg);
    expect(svc.isEnabled()).toBe(false);
    expect(svc.getPublicKey()).toBeNull();
    expect(await svc.sendToUser('u1', { title: 't', body: 'b' })).toBe(0);
    expect(mocked.sendNotification).not.toHaveBeenCalled();
  });

  it('registers VAPID details and delivers to every subscription', async () => {
    const repo = makeRepo([
      { endpoint: 'e1', p256dh: 'p1', auth: 'a1' },
      { endpoint: 'e2', p256dh: 'p2', auth: 'a2' },
    ]);
    (mocked.sendNotification as jest.Mock).mockResolvedValue({});
    const svc = new PushService(repo, enabledCfg);
    expect(mocked.setVapidDetails).toHaveBeenCalledWith('mailto:a@b.c', 'PUB', 'PRIV');
    expect(svc.getPublicKey()).toBe('PUB');
    expect(await svc.sendToUser('u1', { title: 't', body: 'b', actionUrl: '/orders/1' })).toBe(2);
    expect(repo.markPushUsed).toHaveBeenCalledTimes(2);
  });

  it('removes expired subscriptions (410) and counts only successful sends', async () => {
    const repo = makeRepo([
      { endpoint: 'dead', p256dh: 'p', auth: 'a' },
      { endpoint: 'ok', p256dh: 'p', auth: 'a' },
    ]);
    (mocked.sendNotification as jest.Mock)
      .mockRejectedValueOnce(Object.assign(new Error('gone'), { statusCode: 410 }))
      .mockResolvedValueOnce({});
    const svc = new PushService(repo, enabledCfg);
    expect(await svc.sendToUser('u1', { title: 't', body: 'b' })).toBe(1);
    expect(repo.removePushSubscription).toHaveBeenCalledWith('u1', 'dead');
    expect(repo.removePushSubscription).toHaveBeenCalledTimes(1);
  });
});
