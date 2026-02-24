import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SkillExecutorService } from './skill-executor.service';

interface ExecuteSkillDto {
  skillId: string;
  teamId: string;
  customerId?: string;
  parameters?: Record<string, any>;
  message?: string;
  interactionId?: string;
  endConversation?: boolean;
  referenceDocumentId?: string;
}

@WebSocketGateway({
  path: '/ws',
  cors: {
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class StreamingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(StreamingGateway.name);

  constructor(
    private jwtService: JwtService,
    private skillExecutorService: SkillExecutorService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');

      console.log('🔌 [WebSocket Gateway] Incoming connection attempt...');
      console.log('📝 Token source:', client.handshake.auth.token ? 'auth.token' : 'authorization header');
      console.log('🔑 Token value:', token ? token.substring(0, 30) + '...' : 'No token');

      if (!token) {
        this.logger.warn(`⚠️ [WebSocket Gateway] Connection rejected: No token provided`);
        console.log('❌ [WebSocket Gateway] Rejecting connection: No token');
        client.disconnect();
        return;
      }

      console.log('🔐 [WebSocket Gateway] Attempting JWT verification...');

      const payload = this.jwtService.verify(token);

      console.log('✅ [WebSocket Gateway] JWT verification successful');
      console.log('👤 User ID:', payload.sub);
      console.log('📅 User Email:', payload.email || 'N/A');

      client.data.user = payload;
      this.logger.log(`🎉 [WebSocket Gateway] Client connected: ${client.id} (user: ${payload.sub})`);
      console.log('✅ [WebSocket Gateway] Connection successful!');
    } catch (error) {
      this.logger.warn(`⚠️ [WebSocket Gateway] Connection rejected with error: ${error.message}`);
      console.log('❌ [WebSocket Gateway] Connection error:', error?.message || 'Unknown error');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('skill:execute')
  async handleExecute(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ExecuteSkillDto,
  ) {
    const userId = client.data.user?.sub;
    if (!userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    console.log('🎯 [Streaming Gateway] Received skill:execute request');
    console.log('📝 [Streaming Gateway] Client ID:', client.id);
    console.log('📋 [Streaming Gateway] Data:', JSON.stringify(data, null, 2));

    try {
      // Execute skill and stream results
      await this.skillExecutorService.executeSkill({
        skillId: data.skillId,
        teamId: data.teamId,
        customerId: data.customerId,
        userId,
        parameters: data.parameters || {},
        message: data.message,
        interactionId: data.interactionId,
        endConversation: data.endConversation,
        referenceDocumentId: data.referenceDocumentId,
        onChunk: (chunk: string) => {
          console.log('📦 [Streaming Gateway] Sending chunk:', chunk.substring(0, 50) + '...');
          client.emit('response:chunk', { chunk });
        },
        onStart: (interactionId: string) => {
          console.log('🚀 [Streaming Gateway] Sending start event:', interactionId);
          client.emit('response:start', { interactionId });
        },
        onComplete: (result: any) => {
          console.log('✅ [Streaming Gateway] Sending complete event');
          client.emit('response:complete', result);
        },
        onError: (error: Error) => {
          console.log('❌ [Streaming Gateway] Sending error event:', error.message);
          client.emit('response:error', { message: error.message });
        },
      });
    } catch (error) {
      this.logger.error('Error executing skill:', error);
      client.emit('response:error', {
        message: error.message || 'Failed to execute skill',
      });
    }
  }

  @SubscribeMessage('skill:cancel')
  async handleCancel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { interactionId: string },
  ) {
    const userId = client.data.user?.sub;
    if (!userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    try {
      await this.skillExecutorService.cancelSkill(data.interactionId, userId);
      client.emit('skill:cancelled', { interactionId: data.interactionId });
    } catch (error) {
      this.logger.error('Error cancelling skill:', error);
      client.emit('error', { message: error.message || 'Failed to cancel skill' });
    }
  }
}
