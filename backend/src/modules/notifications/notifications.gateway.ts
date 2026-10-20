import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { AppConfigService } from '../../config/app-config.service';

@WebSocketGateway({
  // الأصول المسموحة تُقرأ من CORS_ORIGINS نفسه المستخدم في REST (لا '*' إطلاقًا)
  cors: {
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0),
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  private userSockets = new Map<string, Set<string>>();
  private readonly jwt: JwtService;

  constructor(config: AppConfigService) {
    // نفس سرّ توقيع access token المستخدم في AuthService و JwtStrategy
    this.jwt = new JwtService({ secret: config.all.jwt.accessSecret });
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string) ||
        (client.handshake.headers.authorization?.replace('Bearer ', '') as string);

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwt.verifyAsync<{ sub: string; type: string }>(token);
      if (!payload?.sub || payload.type !== 'access') {
        client.disconnect();
        return;
      }

      const userId = payload.sub;
      (client.data as any).userId = userId;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      client.join(`user:${userId}`);
      client.emit('connected', { userId, socketId: client.id });
      this.logger.log(`WS connect: ${userId} (${client.id})`);
    } catch (e) {
      this.logger.warn(`WS auth failed: ${(e as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client.data as any).userId as string | undefined;
    if (!userId) return;
    const set = this.userSockets.get(userId);
    if (set) {
      set.delete(client.id);
      if (set.size === 0) this.userSockets.delete(userId);
    }
    this.logger.log(`WS disconnect: ${userId} (${client.id})`);
  }

  emitToUser(userId: string, event: string, payload: any): void {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  emitToRoom(room: string, event: string, payload: any): void {
    if (!this.server) return;
    this.server.to(room).emit(event, payload);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { event: 'pong', data: { ts: Date.now() } };
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { room?: string },
  ) {
    const room = body?.room;
    if (!room || typeof room !== 'string') {
      return { event: 'error', data: { message: 'room required' } };
    }
    // أمان: المستخدم مشترك تلقائيًا في غرفته (user:<id>). ممنوع الانضمام لغرفة مستخدم آخر
    // أو لأي غرفة غير مصرّح بها (كان ممكنًا التنصّت على إشعارات الآخرين).
    const userId = (client.data as { userId?: string }).userId;
    if (!userId || room !== `user:${userId}`) {
      return { event: 'error', data: { message: 'room not allowed' } };
    }
    client.join(room);
    return { event: 'subscribed', data: { room } };
  }
}
