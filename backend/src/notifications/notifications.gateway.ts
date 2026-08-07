import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface NotificationPayload {
  message: string;
  type: string;
  link?: string;
  timestamp: Date;
  data?: any;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private adminSockets: Set<string> = new Set(); // Set of admin socketIds

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from auth header or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify token
      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub;
      const userRole = payload.role;

      // Store user info in socket data
      client.data.userId = userId;
      client.data.role = userRole;

      this.logger.log(
        `Client connected: ${client.id} (User: ${userId}, Role: ${userRole})`,
      );

      // Send connection success
      client.emit('connected', {
        message: 'Connected to notification service',
        userId,
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const role = client.data.role;

    // Remove from user sockets
    if (userId && this.userSockets.has(userId)) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }

    // Remove from admin sockets
    if (role === 'admin') {
      this.adminSockets.delete(client.id);
    }

    this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
  }

  @SubscribeMessage('register')
  handleRegister(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const role = client.data.role;

    if (!userId) {
      this.logger.warn(`Register attempt without userId: ${client.id}`);
      return;
    }

    // Add to user sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.add(client.id);
    }

    // Add to admin sockets if admin
    if (role === 'admin') {
      this.adminSockets.add(client.id);
      this.logger.log(`Admin registered: ${client.id} (User: ${userId})`);
    } else {
      this.logger.log(`User registered: ${client.id} (User: ${userId})`);
    }

    client.emit('registered', {
      message: 'Successfully registered for notifications',
      userId,
    });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: new Date() });
  }

  // Send notification to a specific user
  sendToUser(userId: string, payload: NotificationPayload) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds && socketIds.size > 0) {
      socketIds.forEach((socketId) => {
        this.server.to(socketId).emit('notification', payload);
      });
      this.logger.log(
        `Notification sent to user ${userId} (${socketIds.size} connections)`,
      );
      return true;
    }
    this.logger.warn(`User ${userId} not connected, notification not sent`);
    return false;
  }

  // Send notification to all admins
  sendToAdmins(payload: NotificationPayload) {
    if (this.adminSockets.size > 0) {
      this.adminSockets.forEach((socketId) => {
        this.server.to(socketId).emit('notification', payload);
      });
      this.logger.log(
        `Notification sent to all admins (${this.adminSockets.size} connections)`,
      );
      return true;
    }
    this.logger.warn('No admins connected, notification not sent');
    return false;
  }

  // Broadcast to all connected users
  broadcast(payload: NotificationPayload) {
    this.server.emit('notification', payload);
    const totalConnections = this.userSockets.size + this.adminSockets.size;
    this.logger.log(
      `Broadcast notification sent to all users (${totalConnections} connections)`,
    );
  }

  // Send to multiple users
  sendToUsers(userIds: string[], payload: NotificationPayload) {
    let sentCount = 0;
    userIds.forEach((userId) => {
      if (this.sendToUser(userId, payload)) {
        sentCount++;
      }
    });
    this.logger.log(
      `Notification sent to ${sentCount}/${userIds.length} users`,
    );
    return sentCount;
  }

  // Get connection stats
  getStats() {
    return {
      totalUsers: this.userSockets.size,
      totalAdmins: this.adminSockets.size,
      totalConnections:
        Array.from(this.userSockets.values()).reduce(
          (sum, sockets) => sum + sockets.size,
          0,
        ) + this.adminSockets.size,
    };
  }
}
