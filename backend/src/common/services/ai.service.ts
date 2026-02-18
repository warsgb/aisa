import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamOptions {
  messages: Message[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private client: OpenAI;
  private readonly provider: string;
  private readonly defaultModel: string;
  private readonly defaultMaxTokens: number;
  private readonly defaultTemperature: number;

  constructor(private configService: ConfigService) {
    this.provider = this.configService.get<string>('AI_PROVIDER', 'zhipu');

    if (this.provider === 'zhipu') {
      const apiKey = this.configService.get<string>('ZHIPU_API_KEY');
      const baseURL = this.configService.get<string>('ZHIPU_BASE_URL', 'https://open.bigmodel.cn/api/paas/v4/');
      this.defaultModel = this.configService.get<string>('ZHIPU_MODEL', 'glm-4-plus');
      this.defaultMaxTokens = this.configService.get<number>('ZHIPU_MAX_TOKENS', 4096);
      this.defaultTemperature = this.configService.get<number>('ZHIPU_TEMPERATURE', 0.7);

      if (!apiKey) {
        this.logger.warn('ZHIPU_API_KEY not configured');
      }

      // 智谱AI使用OpenAI兼容接口
      this.client = new OpenAI({
        apiKey,
        baseURL,
      });

      this.logger.log(`AI Service initialized (Zhipu GLM) with model: ${this.defaultModel}`);
      this.logger.log(`Base URL: ${baseURL}`);
    } else {
      // Fallback to Anthropic (if needed in future)
      const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
      const baseURL = this.configService.get<string>('ANTHROPIC_BASE_URL');
      this.defaultModel = this.configService.get<string>('ANTHROPIC_MODEL', 'claude-3-5-sonnet-20241022');

      if (!apiKey) {
        this.logger.warn('ANTHROPIC_API_KEY not configured');
      }

      const clientConfig: any = { apiKey };
      if (baseURL) {
        clientConfig.baseURL = baseURL;
      }

      // Note: This would need Anthropic SDK, for now using OpenAI-compatible format
      this.client = new OpenAI(clientConfig);
      this.logger.log(`AI Service initialized (Anthropic-compatible) with model: ${this.defaultModel}`);
    }
  }

  async stream(options: StreamOptions): Promise<string> {
    console.log('🤖 [AI Service] Stream called with options:', {
      model: options.model,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      messagesCount: options.messages?.length || 0,
    });

    const {
      messages,
      system,
      maxTokens = this.defaultMaxTokens,
      temperature = this.defaultTemperature,
      model = this.defaultModel,
      onChunk,
      onComplete,
      onError,
      onStart,
    } = options;

    try {
      // Prepare messages
      const allMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      if (this.provider === 'zhipu') {
        // 智谱AI: 将system prompt合并到第一条user消息中
        // 因为智谱AI的API不支持或不需要system角色
        const filteredMessages = messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

        // 如果有system prompt，添加到第一条user消息前
        if (system && filteredMessages.length > 0) {
          const firstMessage = filteredMessages[0];
          if (firstMessage.role === 'user') {
            // 合并system和第一条user消息
            filteredMessages[0] = {
              role: 'user',
              content: `${system}\n\n${firstMessage.content}`,
            };
          }
        } else if (system && filteredMessages.length === 0) {
          // 如果只有system没有其他消息，将system作为第一条消息
          filteredMessages.push({
            role: 'user',
            content: system,
          });
        }

        allMessages.push(...filteredMessages);
      } else {
        // 其他提供商(如Anthropic): 使用标准system角色
        if (system) {
          allMessages.push({
            role: 'system',
            content: system,
          });
        }

        const filteredMessages = messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

        allMessages.push(...filteredMessages);
      }

      this.logger.log(`📤 [AI Service] Sending ${allMessages.length} messages to ${this.provider} API`);
      this.logger.debug(`📨 Message preview:`, JSON.stringify(allMessages).substring(0, 200));
      this.logger.debug(`Messages: ${JSON.stringify(allMessages).substring(0, 200)}...`);

      if (onStart) {
        onStart();
      }

      // Call streaming API
      console.log('🌐 [AI Service] Calling Zhipu API:', {
        endpoint: this.client.baseURL,
        model,
        maxTokens,
      });

      const stream = await this.client.chat.completions.create({
        model,
        messages: allMessages,
        max_tokens: maxTokens,
        temperature,
        stream: true,
      });

      let fullText = '';
      let chunkCount = 0;

      console.log('🎬 [AI Service] Starting to receive stream...');

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        fullText += delta;
        chunkCount++;

        if (chunkCount % 10 === 0) {
          console.log(`📊 [AI Service] Received ${chunkCount} chunks`);
        }

        if (onChunk) {
          onChunk(delta);
        }
      }

      if (onComplete) {
        console.log('✅ [AI Service] Stream completed:', {
          totalChunks: chunkCount,
          totalLength: fullText.length,
        });
        onComplete(fullText);
      }

      console.log('🏁 [AI Service] Returning response to skill executor');

      return fullText;
    } catch (error) {
      this.logger.error('AI API error:', error);
      if (onError) {
        onError(error as Error);
      }
      throw error;
    }
  }

  async create(options: StreamOptions): Promise<string> {
    const {
      messages,
      system,
      maxTokens = this.defaultMaxTokens,
      temperature = this.defaultTemperature,
      model = this.defaultModel,
    } = options;

    try {
      const allMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      if (this.provider === 'zhipu') {
        // 智谱AI: 将system prompt合并到第一条user消息中
        const filteredMessages = messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

        // 如果有system prompt，添加到第一条user消息前
        if (system && filteredMessages.length > 0) {
          const firstMessage = filteredMessages[0];
          if (firstMessage.role === 'user') {
            filteredMessages[0] = {
              role: 'user',
              content: `${system}\n\n${firstMessage.content}`,
            };
          }
        } else if (system && filteredMessages.length === 0) {
          // 如果只有system没有其他消息，将system作为第一条消息
          filteredMessages.push({
            role: 'user',
            content: system,
          });
        }

        allMessages.push(...filteredMessages);
      } else {
        // 其他提供商: 使用标准system角色
        if (system) {
          allMessages.push({
            role: 'system',
            content: system,
          });
        }

        allMessages.push(
          ...messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            }))
        );
      }

      const response = await this.client.chat.completions.create({
        model,
        messages: allMessages,
        max_tokens: maxTokens,
        temperature,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error('AI API error:', error);
      throw error;
    }
  }
}
