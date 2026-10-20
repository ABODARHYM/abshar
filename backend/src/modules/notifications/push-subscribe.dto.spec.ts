import { ArgumentMetadata } from '@nestjs/common';
import { buildValidationPipe } from '../../common/validation';
import { PushSubscribeDto } from './notifications.dto';

const pipe = buildValidationPipe();
const meta: ArgumentMetadata = { type: 'body', metatype: PushSubscribeDto };
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc123';

describe('PushSubscribeDto', () => {
  it('accepts the standard browser PushSubscription.toJSON() shape', async () => {
    const out = (await pipe.transform(
      { endpoint: ENDPOINT, expirationTime: null, keys: { p256dh: 'BPk', auth: 'au' } },
      meta,
    )) as PushSubscribeDto;
    expect(out.keys?.p256dh).toBe('BPk');
    expect(out.keys?.auth).toBe('au');
  });

  it('still accepts the legacy flat shape', async () => {
    const out = (await pipe.transform({ endpoint: ENDPOINT, p256dh: 'BPk', auth: 'au' }, meta)) as PushSubscribeDto;
    expect(out.p256dh).toBe('BPk');
  });

  it('rejects a subscription with no keys at all', async () => {
    await expect(pipe.transform({ endpoint: ENDPOINT }, meta)).rejects.toMatchObject({ status: 422 });
  });

  it('rejects incomplete nested keys', async () => {
    await expect(pipe.transform({ endpoint: ENDPOINT, keys: { p256dh: 'BPk' } }, meta)).rejects.toMatchObject({
      status: 422,
    });
  });

  it('rejects a non-https endpoint', async () => {
    await expect(
      pipe.transform({ endpoint: 'http://evil.example/x', keys: { p256dh: 'a', auth: 'b' } }, meta),
    ).rejects.toMatchObject({ status: 422 });
  });
});
