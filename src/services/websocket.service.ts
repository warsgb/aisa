import { io, Socket } from 'socket.io-client';
import type {
  SkillExecutionStart,
  ResponseChunk,
  ResponseComplete,
  ResponseError,
} from '../types';

type EventHandlers = {
  onStart?: (data: SkillExecutionStart) => void;
  onChunk?: (data: ResponseChunk) => void;
  onComplete?: (data: ResponseComplete) => void;
  onError?: (data: ResponseError) => void;
};

class WebSocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    // Support relative paths for same-origin deployment, fallback to localhost
    const wsUrl = import.meta.env.VITE_WS_URL || (import.meta.env.VITE_API_URL || 'http://localhost:3001');

    console.log('🔌 [WebSocket Service] Attempting to connect...', {
      url: wsUrl,
      token: token ? `Bearer ${token.substring(0, 20)}...` : 'No token',
    });

    this.socket = io(wsUrl, {
      path: '/ws',
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket'], // Use WebSocket only, disable polling fallback
    });

    this.socket.on('connect', () => {
      console.log('✅ [WebSocket Service] Connected successfully!');
      console.log('📊 Socket ID:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ [WebSocket Service] Disconnected:', reason);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  executeSkill(
    data: {
      skillId: string;
      teamId: string;
      customerId?: string;
      parameters?: Record<string, any>;
      message?: string;
      interactionId?: string;
      endConversation?: boolean;
      referenceDocumentId?: string;
    },
    handlers: EventHandlers
  ) {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    // Set up one-time event handlers for this execution
    const setupHandlers = () => {
      this.socket?.once('response:start', (data: SkillExecutionStart) => {
        handlers.onStart?.(data);
      });

      this.socket?.on('response:chunk', (data: ResponseChunk) => {
        handlers.onChunk?.(data);
      });

      this.socket?.once('response:complete', (data: ResponseComplete) => {
        handlers.onComplete?.(data);
        // Clean up chunk listener
        this.socket?.off('response:chunk');
      });

      this.socket?.once('response:error', (data: ResponseError) => {
        handlers.onError?.(data);
        // Clean up listeners
        this.socket?.off('response:chunk');
      });
    };

    setupHandlers();
    this.socket?.emit('skill:execute', data);
  }

  cancelSkill(interactionId: string) {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }
    this.socket?.emit('skill:cancel', { interactionId });
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const webSocketService = new WebSocketService();
