import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

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
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private client: Anthropic;
  private readonly defaultModel: string;
  private readonly defaultMaxTokens: number;
  private readonly defaultTemperature: number;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    const baseURL = this.configService.get<string>('ANTHROPIC_BASE_URL');
    this.defaultModel = this.configService.get<string>('ANTHROPIC_MODEL', 'claude-3-5-sonnet-20241022');
    this.defaultMaxTokens = this.configService.get<number>('ANTHROPIC_MAX_TOKENS', 4096);
    this.defaultTemperature = this.configService.get<number>('ANTHROPIC_TEMPERATURE', 0.7);

    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not configured');
    }

    // Initialize Anthropic client with optional baseURL
    const clientConfig: any = { apiKey };
    if (baseURL) {
      clientConfig.baseURL = baseURL;
      this.logger.log(`Using custom API base URL: ${baseURL}`);
    }

    this.client = new Anthropic(clientConfig);

    this.logger.log(`Claude Service initialized with model: ${this.defaultModel}`);
  }

  async stream(options: StreamOptions): Promise<string> {
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
      const params: Anthropic.MessageCreateParams = {
        model,
        max_tokens: maxTokens,
        temperature,
        messages: messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        system,
        stream: true,
      };

      if (onStart) {
        onStart();
      }

      const stream = await this.client.messages.create(params);

      let fullText = '';

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            const text = event.delta.text;
            fullText += text;
            if (onChunk) {
              onChunk(text);
            }
          }
        }
      }

      if (onComplete) {
        onComplete(fullText);
      }

      return fullText;
    } catch (error) {
      this.logger.error('Claude API error:', error);
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
      const params: Anthropic.MessageCreateParams = {
        model,
        max_tokens: maxTokens,
        temperature,
        messages: messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        system,
      };

      const response = await this.client.messages.create(params);

      let fullText = '';
      for (const block of response.content) {
        if (block.type === 'text') {
          fullText += block.text;
        }
      }

      return fullText;
    } catch (error) {
      this.logger.error('Claude API error:', error);
      throw error;
    }
  }
}
