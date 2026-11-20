jest.mock('./notifications.gateway', () => ({
  NotificationsGateway: class NotificationsGateway {},
}));

import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { PushService } from './push.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationRow } from './notifications.types';

const notification = {
  id: 'notification-1',
  user_id: 'user-1',
  title: 'طلب جديد',
  body: 'لديك طلب جديد',
  type: 'ORDER_CREATED',
  category: 'order',
  priority: 'high',
  icon: null,
  action_url: null,
  metadata: {},
  is_read: false,
  read_at: null,
  delivered_at: null,
  created_at: new Date(),
} as NotificationRow;

function makeService() {
  const repo = {
    createWithPushOutbox: jest.fn().mockResolvedValue(notification),
    create: jest.fn().mockResolvedValue(notification),
    claimPushOutbox: jest.fn().mockResolvedValue([]),
    markPushOutboxSent: jest.fn().mockResolvedValue(undefined),
    markPushOutboxProgress: jest.fn().mockResolvedValue(undefined),
    markPushOutboxFailed: jest.fn().mockResolvedValue(undefined),
    getStoreOwnerId: jest.fn().mockResolvedValue('store-owner-user-1'),
  } as unknown as jest.Mocked<NotificationsRepository>;
  const push = {
    isEnabled: jest.fn().mockReturnValue(true),
    sendToUser: jest.fn().mockResolvedValue(1),
    sendToUserDetailed: jest.fn().mockResolvedValue({ subscriptionCount: 1, acceptedEndpoints: ['ep-1'], failedEndpoints: [], failureReasons: [] }),
  } as unknown as jest.Mocked<PushService>;
  const gateway = { emitToUser: jest.fn() } as unknown as jest.Mocked<NotificationsGateway>;
  return { service: new NotificationsService(repo, push, gateway), repo, push, gateway };
}

describe('NotificationsService durable push delivery', () => {
  it('persists the notification and push job together before emitting WebSocket', async () => {
    const { service, repo, push, gateway } = makeService();
    await service.send({ userId: 'user-1', title: 'طلب جديد', body: 'لديك طلب جديد', type: 'ORDER_CREATED' });
    expect(repo.createWithPushOutbox).toHaveBeenCalledTimes(1);
    expect(repo.create).not.toHaveBeenCalled();
    expect(gateway.emitToUser).toHaveBeenCalledWith('user-1', 'notification', expect.objectContaining({ id: notification.id }));
    expect(push.sendToUser).not.toHaveBeenCalled();
  });

  it('marks a queued push job sent when the provider accepts it', async () => {
    const { service, repo, push } = makeService();
    (repo.claimPushOutbox as jest.Mock).mockResolvedValue([{ id: 'job-1', user_id: 'user-1', payload: { title: 't', body: 'b' }, attempts: 1 }]);
    await (service as any).processPushOutbox();
    expect(push.sendToUserDetailed).toHaveBeenCalledWith('user-1', { title: 't', body: 'b' }, []);
    expect(repo.markPushOutboxSent).toHaveBeenCalledWith('job-1');
  });

  it('schedules a retry when no push subscription accepts the job', async () => {
    const { service, repo, push } = makeService();
    push.sendToUserDetailed.mockResolvedValue({ subscriptionCount: 1, acceptedEndpoints: [], failedEndpoints: ['ep-1'], failureReasons: ['HTTP 503'] });
    (repo.claimPushOutbox as jest.Mock).mockResolvedValue([{ id: 'job-2', user_id: 'user-1', payload: { title: 't', body: 'b' }, attempts: 3 }]);
    await (service as any).processPushOutbox();
    expect(repo.markPushOutboxFailed).toHaveBeenCalledWith('job-2', 3, expect.stringContaining('HTTP 503'));
    expect(repo.markPushOutboxSent).not.toHaveBeenCalled();
  });

  it('persists successful endpoints before retrying only failed devices', async () => {
    const { service, repo, push } = makeService();
    push.sendToUserDetailed.mockResolvedValue({
      subscriptionCount: 2,
      acceptedEndpoints: ['device-ok'],
      failedEndpoints: ['device-retry'], failureReasons: ['HTTP 503'],
    });
    (repo.claimPushOutbox as jest.Mock).mockResolvedValue([{
      id: 'job-partial', user_id: 'user-1', payload: { title: 't', body: 'b' },
      attempts: 2, delivered_endpoints: [],
    }]);
    await (service as any).processPushOutbox();
    expect(repo.markPushOutboxProgress).toHaveBeenCalledWith('job-partial', ['device-ok']);
    expect(repo.markPushOutboxFailed).toHaveBeenCalledWith(
      'job-partial', 2, expect.stringContaining('HTTP 503'),
    );
    expect(repo.markPushOutboxSent).not.toHaveBeenCalled();
  });

  it('routes driver-arrival notifications to the store owner account', async () => {
    const { service, repo } = makeService();
    await service.notifyDriverComing('store-1', 'AB123', 'المندوب');
    expect(repo.getStoreOwnerId).toHaveBeenCalledWith('store-1');
    expect(repo.createWithPushOutbox).toHaveBeenCalledWith(expect.objectContaining({ userId: 'store-owner-user-1' }), expect.any(Object));
  });
});
