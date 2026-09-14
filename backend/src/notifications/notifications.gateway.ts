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
import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
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
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private adminSockets: Set<string> = new Set(); // Set of admin socketIds
  
  // Collaboration-specific tracking
  private examSessions: Map<string, Map<string, any>> = new Map(); // examId -> Map<userId, sessionData>
  private questionLocks: Map<string, Map<string, any>> = new Map(); // examId -> Map<questionId, lockData>
  
  // Cleanup interval
  private cleanupInterval: NodeJS.Timeout;

  constructor(private jwtService: JwtService) {}

  onModuleInit() {
    // Start cleanup task every 10 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredLocks();
    }, 10000);
    this.logger.log('Collaboration cleanup task started');
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.logger.log('Collaboration cleanup task stopped');
    }
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from auth header or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token - disconnecting`);
        client.emit('connect_error', { message: 'No authentication token provided' });
        client.disconnect();
        return;
      }

      // Verify token
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_SECRET || 'your-secret-key-here',
        });
        const userId = payload.sub;
        const userRole = payload.role;
        
        // Extract user name from various possible field names in JWT
        const userName = payload.fullName || payload['fullName'] || payload.name || payload.username || 'User';

        // Store user info in socket data
        client.data.userId = userId;
        client.data.role = userRole;
        client.data.userName = userName; // Store userName from JWT

        this.logger.log(
          `Client connected: ${client.id} (User: ${userId}, Name: ${userName}, Role: ${userRole})`,
        );

        // Send connection success
        client.emit('connected', {
          message: 'Connected to notification service',
          userId,
          userName,
        });
      } catch (jwtError) {
        this.logger.error(`JWT verification failed: ${jwtError.message}`);
        client.emit('auth_error', { message: 'Invalid or expired token' });
        client.disconnect();
        return;
      }
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`, error.stack);
      client.emit('connection_failed', { message: 'Connection failed' });
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

    // Collaboration cleanup: Remove from all exam sessions
    this.examSessions.forEach((sessionMap, examId) => {
      if (sessionMap.has(userId)) {
        sessionMap.delete(userId);
        
        // Notify others in the exam
        this.server.to(`exam:${examId}`).emit('presence:leave', {
          userId,
          timestamp: new Date(),
        });

        // Clean up empty sessions
        if (sessionMap.size === 0) {
          this.examSessions.delete(examId);
        }
      }
    });

    // Release any locks held by this user
    this.questionLocks.forEach((examLocks, examId) => {
      const locksToRelease: string[] = [];
      examLocks.forEach((lockData, questionId) => {
        if (lockData.userId === userId) {
          locksToRelease.push(questionId);
        }
      });

      locksToRelease.forEach((questionId) => {
        examLocks.delete(questionId);
        this.server.to(`exam:${examId}`).emit('question:unlocked', {
          questionId,
          reason: 'disconnected',
          timestamp: new Date(),
        });
      });
    });

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

  // ============================================================================
  // COLLABORATION WEBSOCKET HANDLERS
  // ============================================================================

  /**
   * Join an exam collaboration session
   */
  @SubscribeMessage('exam:join')
  async handleExamJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; userName?: string },
  ) {
    const userId = client.data.userId;
    // Prioritize: data.userName (explicit) > client.data.userName (from JWT) > fallback
    const userName = data.userName || client.data.userName || 'User';

    // Update userName in socket data if provided explicitly
    if (data.userName) {
      client.data.userName = data.userName;
    }

    // Join exam room
    client.join(`exam:${data.examId}`);

    // Track session
    if (!this.examSessions.has(data.examId)) {
      this.examSessions.set(data.examId, new Map());
    }
    
    const examSession = this.examSessions.get(data.examId)!;
    examSession.set(userId, {
      userId,
      userName,
      socketId: client.id,
      status: 'active',
      joinedAt: new Date(),
      editingElementId: null,
      editingElementType: null,
      lastActivity: new Date(),
    });

    this.logger.log(`User ${userId} (${userName}) joined exam ${data.examId} - participants: ${examSession.size}`);

    // Broadcast to others in the room that someone joined
    client.to(`exam:${data.examId}`).emit('presence:join', {
      userId,
      userName,
      timestamp: new Date(),
    });

    // Broadcast updated presence to everyone including the joiner
    const participants = Array.from(examSession.values()).map(session => ({
      userId: session.userId,
      userName: session.userName,
      editingElementId: session.editingElementId,
      editingElementType: session.editingElementType,
      lastActivity: session.lastActivity,
    }));
    
    this.logger.log(`Broadcasting presence with ${participants.length} users:`, 
      participants.map(p => ({ userId: p.userId, userName: p.userName }))
    );
    
    this.server.to(`exam:${data.examId}`).emit('exam:presence', {
      users: participants,
      timestamp: new Date(),
    });

    // Return current participants to the joiner
    return {
      success: true,
      participants,
      message: `Joined exam session with ${participants.length} participant(s)`,
    };
  }

  /**
   * Leave an exam collaboration session
   */
  @SubscribeMessage('exam:leave')
  async handleExamLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string },
  ) {
    const userId = client.data.userId;

    client.leave(`exam:${data.examId}`);

    // Remove from session tracking
    if (this.examSessions.has(data.examId)) {
      this.examSessions.get(data.examId)!.delete(userId);
      
      // Clean up empty sessions
      if (this.examSessions.get(data.examId)!.size === 0) {
        this.examSessions.delete(data.examId);
      }
    }

    this.logger.log(`User ${userId} left exam ${data.examId}`);

    // Broadcast to others
    client.to(`exam:${data.examId}`).emit('presence:leave', {
      userId,
      timestamp: new Date(),
    });

    return { success: true, message: 'Left exam session' };
  }

  /**
   * Update user status (active/idle)
   */
  @SubscribeMessage('exam:status')
  async handleExamStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; status: 'active' | 'idle' },
  ) {
    const userId = client.data.userId;

    if (this.examSessions.has(data.examId)) {
      const session = this.examSessions.get(data.examId)!.get(userId);
      if (session) {
        session.status = data.status;
        session.lastActivity = new Date();
      }
    }

    // Broadcast status change
    client.to(`exam:${data.examId}`).emit('presence:status', {
      userId,
      status: data.status,
      timestamp: new Date(),
    });

    return { success: true };
  }

  /**
   * Lock a question for editing
   */
  @SubscribeMessage('question:lock')
  async handleQuestionLock(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; questionId: string },
  ) {
    const userId = client.data.userId;
    const userName = client.data.userName || 'Unknown User';

    // Initialize locks map for exam if needed
    if (!this.questionLocks.has(data.examId)) {
      this.questionLocks.set(data.examId, new Map());
    }

    const examLocks = this.questionLocks.get(data.examId)!;

    // Check if already locked
    if (examLocks.has(data.questionId)) {
      const existingLock = examLocks.get(data.questionId)!;
      if (existingLock.userId !== userId) {
        return {
          success: false,
          error: 'Question is already locked by another user',
          lockedBy: existingLock.userName,
        };
      }
    }

    // Create lock
    examLocks.set(data.questionId, {
      userId,
      userName,
      lockedAt: new Date(),
      expiresAt: new Date(Date.now() + 30000), // 30 seconds
    });

    this.logger.log(`User ${userId} locked question ${data.questionId} in exam ${data.examId}`);

    // Broadcast lock to all in room
    this.server.to(`exam:${data.examId}`).emit('question:locked', {
      questionId: data.questionId,
      userId,
      userName,
      timestamp: new Date(),
    });

    // Auto-unlock after 30 seconds
    setTimeout(() => {
      if (examLocks.has(data.questionId)) {
        const lock = examLocks.get(data.questionId)!;
        if (lock.userId === userId) {
          examLocks.delete(data.questionId);
          this.server.to(`exam:${data.examId}`).emit('question:unlocked', {
            questionId: data.questionId,
            reason: 'expired',
            timestamp: new Date(),
          });
          this.logger.log(`Question ${data.questionId} lock expired`);
        }
      }
    }, 30000);

    return { success: true, expiresIn: 30000 };
  }

  /**
   * Unlock a question
   */
  @SubscribeMessage('question:unlock')
  async handleQuestionUnlock(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; questionId: string },
  ) {
    const userId = client.data.userId;

    if (this.questionLocks.has(data.examId)) {
      const examLocks = this.questionLocks.get(data.examId)!;
      const lock = examLocks.get(data.questionId);

      // Only owner can unlock (or force unlock if lock expired)
      if (lock && lock.userId === userId) {
        examLocks.delete(data.questionId);

        this.logger.log(`User ${userId} unlocked question ${data.questionId}`);

        // Broadcast unlock
        this.server.to(`exam:${data.examId}`).emit('question:unlocked', {
          questionId: data.questionId,
          reason: 'manual',
          timestamp: new Date(),
        });

        return { success: true };
      }
    }

    return { success: false, error: 'No lock found or not lock owner' };
  }

  /**
   * Broadcast question update (real-time collaborative editing)
   */
  @SubscribeMessage('question:update')
  async handleQuestionUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { 
      examId: string; 
      questionId: string; 
      changes: any; 
      version?: number;
    },
  ) {
    const userId = client.data.userId;
    const userName = client.data.userName || 'Unknown User';

    // Check if question is locked by someone else
    if (this.questionLocks.has(data.examId)) {
      const examLocks = this.questionLocks.get(data.examId)!;
      const lock = examLocks.get(data.questionId);
      
      if (lock && lock.userId !== userId) {
        // Conflict! Someone else is editing
        return {
          success: false,
          error: 'conflict',
          lockedBy: lock.userName,
          message: `${lock.userName} is currently editing this question`,
        };
      }
    }

    this.logger.log(`User ${userId} updated question ${data.questionId} with changes:`, data.changes);

    // Broadcast to others (not sender) - they should update their local state
    client.to(`exam:${data.examId}`).emit('question:updated', {
      questionId: data.questionId,
      changes: data.changes,
      userId,
      userName,
      version: data.version,
      timestamp: new Date(),
    });

    return { success: true };
  }

  /**
   * Broadcast exam metadata update (title, subject, duration, etc.)
   */
  @SubscribeMessage('exam:update_metadata')
  async handleExamMetadataUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { 
      examId: string; 
      field: string; 
      value: any;
    },
  ) {
    const userId = client.data.userId;
    const userName = client.data.userName || 'Unknown User';

    this.logger.log(`User ${userId} updated exam ${data.field}: ${data.value}`);

    // Broadcast to all (including sender for confirmation)
    this.server.to(`exam:${data.examId}`).emit('exam:metadata_updated', {
      field: data.field,
      value: data.value,
      userId,
      userName,
      timestamp: new Date(),
    });

    // Broadcast activity to everyone including sender
    this.server.to(`exam:${data.examId}`).emit('exam:activity', {
      type: 'update_metadata',
      userId,
      userName,
      data: { field: data.field, value: data.value },
      timestamp: new Date(),
    });

    return { success: true };
  }

  /**
   * Broadcast question added
   */
  @SubscribeMessage('exam:add_question')
  async handleAddQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { 
      examId: string; 
      question: any;
      questionIndex?: number;
    },
  ) {
    const userId = client.data.userId;
    const userName = client.data.userName || 'Unknown User';

    this.logger.log(`User ${userId} added question to exam ${data.examId} at index ${data.questionIndex}`);

    // Broadcast to others
    client.to(`exam:${data.examId}`).emit('exam:question_added', {
      question: data.question,
      questionIndex: data.questionIndex,
      userId,
      userName,
      timestamp: new Date(),
    });

    // Broadcast activity to everyone including sender
    this.server.to(`exam:${data.examId}`).emit('exam:activity', {
      type: 'add_question',
      userId,
      userName,
      data: { question: data.question, questionIndex: data.questionIndex },
      timestamp: new Date(),
    });

    return { success: true };
  }

  /**
   * Broadcast question removed
   */
  @SubscribeMessage('exam:remove_question')
  async handleRemoveQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { 
      examId: string; 
      questionId: string;
      questionIndex?: number;
    },
  ) {
    const userId = client.data.userId;
    const userName = client.data.userName || 'Unknown User';

    this.logger.log(`User ${userId} removed question ${data.questionId} from exam ${data.examId} at index ${data.questionIndex}`);

    // Release any lock on this question
    if (this.questionLocks.has(data.examId)) {
      this.questionLocks.get(data.examId)!.delete(data.questionId);
    }

    // Broadcast to others
    client.to(`exam:${data.examId}`).emit('exam:question_removed', {
      questionId: data.questionId,
      questionIndex: data.questionIndex,
      userId,
      userName,
      timestamp: new Date(),
    });

    // Broadcast activity to everyone including sender
    this.server.to(`exam:${data.examId}`).emit('exam:activity', {
      type: 'remove_question',
      userId,
      userName,
      data: { questionId: data.questionId, questionIndex: data.questionIndex },
      timestamp: new Date(),
    });

    return { success: true };
  }

  /**
   * Broadcast question duplicated
   */
  @SubscribeMessage('exam:duplicate_question')
  async handleDuplicateQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { 
      examId: string; 
      question: any;
      questionIndex?: number;
    },
  ) {
    const userId = client.data.userId;
    const userName = client.data.userName || 'Unknown User';

    this.logger.log(`User ${userId} duplicated question in exam ${data.examId} at index ${data.questionIndex}`);

    // Broadcast to others
    client.to(`exam:${data.examId}`).emit('exam:question_added', {
      question: data.question,
      questionIndex: data.questionIndex,
      userId,
      userName,
      timestamp: new Date(),
    });

    // Broadcast activity to everyone including sender
    this.server.to(`exam:${data.examId}`).emit('exam:activity', {
      type: 'duplicate_question',
      userId,
      userName,
      data: { question: data.question, questionIndex: data.questionIndex },
      timestamp: new Date(),
    });

    return { success: true };
  }

  /**
   * Broadcast questions reordered
   */
  @SubscribeMessage('exam:reorder_questions')
  async handleReorderQuestions(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { 
      examId: string; 
      activeId: string;
      overId: string;
    },
  ) {
    const userId = client.data.userId;
    const userName = client.data.userName || 'Unknown User';

    this.logger.log(`User ${userId} reordered questions in exam ${data.examId}`);

    // Broadcast to others
    client.to(`exam:${data.examId}`).emit('exam:questions_reordered', {
      activeId: data.activeId,
      overId: data.overId,
      userId,
      userName,
      timestamp: new Date(),
    });

    // Broadcast activity to everyone including sender
    this.server.to(`exam:${data.examId}`).emit('exam:activity', {
      type: 'reorder_questions',
      userId,
      userName,
      data: { activeId: data.activeId, overId: data.overId },
      timestamp: new Date(),
    });

    return { success: true };
  }

  /**
   * Add a comment
   */
  @SubscribeMessage('comment:add')
  async handleCommentAdd(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; comment: any },
  ) {
    const userId = client.data.userId;
    const userName = client.data.userName || 'Unknown User';

    const commentData = {
      ...data.comment,
      userId,
      userName,
      timestamp: new Date(),
    };

    this.logger.log(`User ${userId} added comment to exam ${data.examId}`);

    // Broadcast new comment to all
    this.server.to(`exam:${data.examId}`).emit('comment:added', commentData);

    // If mentions, notify those users directly
    if (data.comment.mentions && Array.isArray(data.comment.mentions)) {
      data.comment.mentions.forEach((mentionedUserId: string) => {
        this.sendToUser(mentionedUserId, {
          message: `${userName} mentioned you in a comment`,
          type: 'comment_mention',
          link: `/dashboard/exams/${data.examId}`,
          timestamp: new Date(),
          data: { examId: data.examId, comment: commentData },
        });
      });
    }

    return { success: true };
  }

  /**
   * Reply to a comment
   */
  @SubscribeMessage('comment:reply')
  async handleCommentReply(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; parentId: string; reply: any },
  ) {
    const userId = client.data.userId;
    const userName = client.data.userName || 'Unknown User';

    const replyData = {
      ...data.reply,
      userId,
      userName,
      parentId: data.parentId,
      timestamp: new Date(),
    };

    // Broadcast reply
    this.server.to(`exam:${data.examId}`).emit('comment:replied', replyData);

    return { success: true };
  }

  /**
   * Resolve a comment
   */
  @SubscribeMessage('comment:resolve')
  async handleCommentResolve(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; commentId: string; resolved: boolean },
  ) {
    const userId = client.data.userId;

    // Broadcast resolution
    this.server.to(`exam:${data.examId}`).emit('comment:resolved', {
      commentId: data.commentId,
      resolved: data.resolved,
      resolvedBy: userId,
      timestamp: new Date(),
    });

    return { success: true };
  }

  /**
   * Broadcast typing indicator
   */
  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; questionId?: string },
  ) {
    const userId = client.data.userId;
    const userName = client.data.userName || 'Unknown User';

    client.to(`exam:${data.examId}`).emit('typing:started', {
      userId,
      userName,
      questionId: data.questionId,
      timestamp: new Date(),
    });

    return { success: true };
  }

  /**
   * Stop typing indicator
   */
  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; questionId?: string },
  ) {
    const userId = client.data.userId;

    client.to(`exam:${data.examId}`).emit('typing:stopped', {
      userId,
      questionId: data.questionId,
      timestamp: new Date(),
    });

    return { success: true };
  }

  /**
   * Get current exam participants
   */
  @SubscribeMessage('exam:participants')
  async handleGetParticipants(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string },
  ) {
    if (this.examSessions.has(data.examId)) {
      const participants = Array.from(this.examSessions.get(data.examId)!.values());
      return { success: true, participants };
    }
    return { success: true, participants: [] };
  }

  /**
   * Get current question locks
   */
  @SubscribeMessage('exam:locks')
  async handleGetLocks(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string },
  ) {
    if (this.questionLocks.has(data.examId)) {
      const locks = Array.from(this.questionLocks.get(data.examId)!.entries()).map(
        ([questionId, lockData]) => ({
          questionId,
          ...lockData,
        }),
      );
      return { success: true, locks };
    }
    return { success: true, locks: [] };
  }

  /**
   * Broadcast version save
   */
  @SubscribeMessage('version:save')
  async handleVersionSave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; version: any },
  ) {
    const userId = client.data.userId;
    const userName = client.data.userName || 'Unknown User';

    this.server.to(`exam:${data.examId}`).emit('version:saved', {
      version: data.version,
      userId,
      userName,
      timestamp: new Date(),
    });

    return { success: true };
  }

  /**
   * Broadcast version restore
   */
  @SubscribeMessage('version:restore')
  async handleVersionRestore(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; versionId: string },
  ) {
    const userId = client.data.userId;
    const userName = client.data.userName || 'Unknown User';

    this.server.to(`exam:${data.examId}`).emit('version:restored', {
      versionId: data.versionId,
      userId,
      userName,
      timestamp: new Date(),
    });

    return { success: true };
  }

  /**
   * Start editing a specific element (question, section, etc.)
   */
  @SubscribeMessage('exam:start_editing_element')
  async handleStartEditingElement(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; elementId: string; elementType: string },
  ) {
    const userId = client.data.userId;
    const userName = client.data.userName || 'Unknown User';
    const userColor = this.getUserColor(userId);

    // Update session data
    const sessions = this.examSessions.get(data.examId);
    if (sessions && sessions.has(userId)) {
      const session = sessions.get(userId);
      session.editingElementId = data.elementId;
      session.editingElementType = data.elementType;
      session.lastActivity = new Date();
    }

    // Broadcast to other collaborators only (not the sender)
    client.to(`exam:${data.examId}`).emit('exam:element_editing', {
      userId,
      userName,
      color: userColor,
      elementId: data.elementId,
      elementType: data.elementType,
      action: 'start',
      timestamp: new Date(),
    });

    return { success: true };
  }

  /**
   * Stop editing a specific element (user finished editing)
   */
  @SubscribeMessage('exam:stop_editing_element')
  async handleStopEditingElement(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; elementId: string },
  ) {
    const userId = client.data.userId;
    const userName = client.data.userName || 'User';

    // Update session data
    const sessions = this.examSessions.get(data.examId);
    if (sessions && sessions.has(userId)) {
      const session = sessions.get(userId);
      session.editingElementId = null;
      session.editingElementType = null;
      session.lastActivity = new Date();
    }

    // Broadcast to other collaborators only (not the sender)
    client.to(`exam:${data.examId}`).emit('exam:element_editing', {
      userId,
      userName,
      elementId: data.elementId,
      action: 'stop',
      timestamp: new Date(),
    });

    return { success: true };
  }

  /**
   * Broadcast that a question was saved (edited by user)
   */
  @SubscribeMessage('question:saved')
  async handleQuestionSaved(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { examId: string; questionId: string; questionIndex?: number },
  ) {
    const userId = client.data.userId;
    const userName = client.data.userName || 'User';

    this.logger.log(`User ${userId} (${userName}) saved question ${data.questionId} in exam ${data.examId}`);

    // Broadcast to ALL users (including sender) that question was saved
    this.server.to(`exam:${data.examId}`).emit('question:saved', {
      questionId: data.questionId,
      questionIndex: data.questionIndex,
      userId,
      userName,
      timestamp: new Date(),
    });

    // Broadcast activity
    this.server.to(`exam:${data.examId}`).emit('exam:activity', {
      type: 'save_question',
      userId,
      userName,
      data: { questionId: data.questionId, questionIndex: data.questionIndex },
      timestamp: new Date(),
    });

    return { success: true };
  }

  /**
   * Get user color for consistent presence indicators
   */
  private getUserColor(userId: string): string {
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#14B8A6', // teal
      '#F97316', // orange
    ];
    
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  // ============================================================================
  // COLLABORATION HELPER METHODS
  // ============================================================================

  /**
   * Send collaboration event to exam room
   */
  sendToExamRoom(examId: string, event: string, data: any) {
    this.server.to(`exam:${examId}`).emit(event, {
      ...data,
      timestamp: new Date(),
    });
    this.logger.log(`Event ${event} sent to exam ${examId}`);
  }

  /**
   * Get active exam sessions
   */
  getExamSessions(examId: string) {
    if (this.examSessions.has(examId)) {
      return Array.from(this.examSessions.get(examId)!.values());
    }
    return [];
  }

  /**
   * Cleanup expired locks (called periodically)
   */
  cleanupExpiredLocks() {
    const now = new Date();
    this.questionLocks.forEach((examLocks, examId) => {
      examLocks.forEach((lockData, questionId) => {
        if (lockData.expiresAt < now) {
          examLocks.delete(questionId);
          this.server.to(`exam:${examId}`).emit('question:unlocked', {
            questionId,
            reason: 'expired',
            timestamp: now,
          });
        }
      });
    });
  }

  /**
   * Broadcast exam update to all collaborators in the room
   * Called when exam metadata or questions are modified
   */
  broadcastExamUpdate(examId: string, data: any) {
    this.server.to(`exam:${examId}`).emit('exam:activity', {
      ...data,
      timestamp: new Date(),
    });
    this.logger.log(`Exam update broadcast to exam ${examId}: ${data.type}`);
  }

  /**
   * Broadcast new comment to all collaborators
   */
  broadcastComment(examId: string, comment: any) {
    this.server.to(`exam:${examId}`).emit('exam:comment', {
      ...comment,
      examId,
      timestamp: new Date(),
    });
    this.logger.log(`Comment broadcast to exam ${examId}`);
  }

  /**
   * Broadcast presence update (who's active in the exam)
   */
  broadcastPresence(examId: string) {
    const sessions = this.examSessions.get(examId);
    if (!sessions) return;

    const users = Array.from(sessions.values()).map(session => ({
      userId: session.userId,
      userName: session.userName,
      editingSection: session.editingSection,
      lastActivity: session.lastActivity,
    }));

    this.server.to(`exam:${examId}`).emit('exam:presence', {
      users,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast user editing notification
   */
  broadcastUserEditing(examId: string, userId: string, userName: string, section: string) {
    this.server.to(`exam:${examId}`).emit('exam:user_editing', {
      userId,
      userName,
      section,
      timestamp: new Date(),
    });
    
    // Update session data
    const sessions = this.examSessions.get(examId);
    if (sessions && sessions.has(userId)) {
      const session = sessions.get(userId);
      session.editingSection = section;
      session.lastActivity = new Date();
    }
  }
}

