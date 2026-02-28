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

      if (!apiKey || apiKey === 'your_zhipu_api_key_here') {
        this.logger.warn('ZHIPU_API_KEY not configured or using placeholder. Will use mock response mode.');
        this.client = null as any; // Mark as not configured
      } else {
        // 智谱AI使用OpenAI兼容接口
        this.client = new OpenAI({
          apiKey,
          baseURL,
        });
      }

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
      // Check if AI client is configured
      if (!this.client) {
        this.logger.warn('AI client not configured, using mock response');

        // Generate a mock response
        const mockResponse = this.generateMockResponse(messages, system);

        // Simulate streaming by sending chunks
        if (onStart) {
          onStart();
        }

        if (onChunk) {
          const chunkSize = 20;
          for (let i = 0; i < mockResponse.length; i += chunkSize) {
            const chunk = mockResponse.substring(i, i + chunkSize);
            onChunk(chunk);
            // Add small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }

        if (onComplete) {
          onComplete(mockResponse);
        }

        return mockResponse;
      }

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

  /**
   * 执行Web搜索（智谱AI WebSearch API）
   * @param query 搜索查询
   * @param options 搜索选项
   * @returns 搜索结果
   */
  async webSearch(
    query: string,
    options?: {
      searchEngine?: 'search_std' | 'search_pro' | 'search_pro_sogou' | 'search_pro_quark';
      count?: number;
      searchRecencyFilter?: 'noLimit' | 'day' | 'week' | 'month' | 'year';
      contentSize?: 'low' | 'medium' | 'high';
    },
  ): Promise<{ title: string; link: string; content: string }[]> {
    const {
      searchEngine = 'search_std',
      count = 10,
      searchRecencyFilter = 'noLimit',
      contentSize = 'medium',
    } = options || {};

    this.logger.log(`🔍 [WebSearch] Starting search: "${query}"`);
    this.logger.log(`   [WebSearch] Engine: ${searchEngine}, Count: ${count}, Content: ${contentSize}`);

    try {
      // Check if AI client is configured
      if (!this.client) {
        this.logger.warn('[WebSearch] AI client not configured, returning empty search results');
        return [];
      }

      // 使用智谱AI的WebSearch API
      // 通过 OpenAI 客户端的 chat.completions.create 配合 tools 参数调用 web_search
      this.logger.log(`🌐 [WebSearch] Calling Zhipu WebSearch API...`);
      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: query }],
        tools: [
          {
            type: 'web_search',
            function: {
              name: 'web_search',
              parameters: {
                search_engine: searchEngine,
                search_query: query,
                count: count,
                search_recency_filter: searchRecencyFilter,
                content_size: contentSize,
              },
            },
          } as any,
        ],
        tool_choice: 'auto',
      });

      // 解析搜索结果
      const toolCalls = response.choices[0]?.message?.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        this.logger.warn('[WebSearch] No tool calls returned from API');
        return [];
      }

      this.logger.log(`📥 [WebSearch] Received ${toolCalls.length} tool calls`);

      // 提取搜索结果
      const results: { title: string; link: string; content: string }[] = [];

      for (const toolCall of toolCalls) {
        const func = (toolCall as any).function;
        if (func && func.name === 'web_search') {
          try {
            const searchResult = JSON.parse(func.arguments);
            this.logger.log(`📊 [WebSearch] Parsed search result, found ${searchResult.results?.length || 0} items`);
            if (searchResult.results && Array.isArray(searchResult.results)) {
              results.push(...searchResult.results);
            }
          } catch (e) {
            this.logger.error('[WebSearch] Failed to parse search result:', e);
          }
        }
      }

      this.logger.log(`✅ [WebSearch] Completed: "${query}" -> ${results.length} results`);
      return results;
    } catch (error) {
      this.logger.error(`❌ [WebSearch] API error for "${query}":`, error);
      return []; // 返回空数组而不是抛出错误，确保技能可以继续执行
    }
  }

  /**
   * 执行多个搜索查询并合并结果
   * @param queries 搜索查询列表
   * @param options 搜索选项
   * @returns 合并后的搜索结果
   */
  async webSearchMultiple(
    queries: string[],
    options?: {
      searchEngine?: 'search_std' | 'search_pro' | 'search_pro_sogou' | 'search_pro_quark';
      count?: number;
      searchRecencyFilter?: 'noLimit' | 'day' | 'week' | 'month' | 'year';
      contentSize?: 'low' | 'medium' | 'high';
    },
  ): Promise<{ query: string; results: { title: string; link: string; content: string }[] }[]> {
    this.logger.log(`🔍 [WebSearch] Executing ${queries.length} search queries`);

    const allResults: { query: string; results: { title: string; link: string; content: string }[] }[] = [];

    // 顺序执行搜索，避免并发限制
    for (const query of queries) {
      const results = await this.webSearch(query, options);
      allResults.push({ query, results });

      // 添加小延迟，避免请求过于频繁
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    this.logger.log(`✅ [WebSearch] Completed all ${queries.length} searches`);
    return allResults;
  }

  private generateMockResponse(messages: Message[], system?: string): string {
    // Extract parameters from the last user message if present
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    let response = '';

    if (lastUserMessage && lastUserMessage.content.includes('目标角色')) {
      // Elevator pitch skill mock response
      response = `# 电梯演讲：30秒打动CEO

**CEO您好，给我30秒时间：**

作为建筑行业的领军企业，北京建工集团正在推进数字化转型。想象一下，如果您的团队能够：

✨ **提升3倍工作效率** - 智能文档协作，让项目资料实时同步
🚀 **缩短50%审批周期** - 流程自动化，从立项到验收全面提速
💡 **降低70%沟通成本** - 跨部门协作无缝衔接，信息零延迟

WPS 365已服务超过500家建筑国企，包括中建、中铁等龙头企业。我们的平台正在帮助您的同行实现**"降本增效、安全可控"**的数字化目标。

**下周一上午10点，我能用15分钟为您展示具体案例吗？**

---
*这就是愿景型钩子的力量 - 不是推销产品，而是描绘客户渴望的未来。*`;
    } else {
      // Generic mock response
      response = `感谢您的提问。

这是一个模拟的AI响应，用于测试系统功能。实际使用时，系统将连接到真实的AI服务（智谱AI）来提供专业的内容生成服务。

当前测试模式已启用，因为ZHIPU_API_KEY尚未配置。

要使用真实AI服务，请在backend/.env文件中设置有效的ZHIPU_API_KEY。

功能测试完成！`;
    }

    return response;
  }
}
