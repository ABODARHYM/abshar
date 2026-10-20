import { JwtService } from '@nestjs/jwt';
import { NotificationsGateway } from './notifications.gateway';
import { AppConfigService } from '../../config/app-config.service';

// @nestjs/jwt v12 حزمة ESM فقط ولا يمكن تحميلها داخل Jest (CommonJS) على Node < 24.9،
// لذلك نستبدلها بمُغلِّف رفيع فوق jsonwebtoken (نفس مكتبة التحقق الفعلية) — منطق التحقق يبقى حقيقيًا.
jest.mock('@nestjs/jwt', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const jwt = require('jsonwebtoken');
  class JwtService {
    constructor(private readonly opts: { secret: string }) {}
    signAsync(payload: object): Promise<string> {
      return Promise.resolve(jwt.sign(payload, this.opts.secret, { expiresIn: 60 }));
    }
    verifyAsync<T>(token: string): Promise<T> {
      return new Promise((resolve, reject) => {
        try {
          resolve(jwt.verify(token, this.opts.secret) as T);
        } catch (e) {
          reject(e);
        }
      });
    }
  }
  return { JwtService };
});

const SECRET = 'a'.repeat(40);
const config = { all: { jwt: { accessSecret: SECRET } } } as unknown as AppConfigService;

function fakeClient(token?: string) {
  const joined: string[] = [];
  return {
    id: 'sock-1',
    data: {} as Record<string, unknown>,
    handshake: { auth: token ? { token } : {}, query: {}, headers: {} },
    disconnect: jest.fn(),
    emit: jest.fn(),
    join: jest.fn((room: string) => joined.push(room)),
    joined,
  };
}

describe('NotificationsGateway', () => {
  const signer = new JwtService({ secret: SECRET });
  let gateway: NotificationsGateway;

  beforeEach(() => {
    gateway = new NotificationsGateway(config);
  });

  it('accepts a valid access token and joins the user room', async () => {
    const token = await signer.signAsync({ sub: 'user-1', type: 'access' });
    const client = fakeClient(token);
    await gateway.handleConnection(client as never);
    expect(client.disconnect).not.toHaveBeenCalled();
    expect(client.joined).toContain('user:user-1');
  });

  it('rejects a connection without a token', async () => {
    const client = fakeClient();
    await gateway.handleConnection(client as never);
    expect(client.disconnect).toHaveBeenCalled();
  });

  it('rejects a token signed with another secret', async () => {
    const token = await new JwtService({ secret: 'z'.repeat(40) }).signAsync({ sub: 'u', type: 'access' });
    const client = fakeClient(token);
    await gateway.handleConnection(client as never);
    expect(client.disconnect).toHaveBeenCalled();
  });

  it('rejects a refresh token used as an access token', async () => {
    const token = await signer.signAsync({ sub: 'user-1', type: 'refresh' });
    const client = fakeClient(token);
    await gateway.handleConnection(client as never);
    expect(client.disconnect).toHaveBeenCalled();
  });

  it('does not let a user join another user\'s room', async () => {
    const token = await signer.signAsync({ sub: 'user-1', type: 'access' });
    const client = fakeClient(token);
    await gateway.handleConnection(client as never);
    client.join.mockClear();

    const denied = gateway.handleSubscribe(client as never, { room: 'user:user-2' });
    expect(denied.event).toBe('error');
    expect(client.join).not.toHaveBeenCalled();

    const allowed = gateway.handleSubscribe(client as never, { room: 'user:user-1' });
    expect(allowed.event).toBe('subscribed');
  });
});
