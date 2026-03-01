import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';

/**
 * Search configuration for declarative search service
 */
export interface SearchConfig {
  /** Unique name for this search within the skill */
  name: string;
  /** Type of search - determines query template and formatting */
  type: 'background' | 'decision' | 'cooperation' | 'digital' |
        'bidding' | 'subsidiary' | 'annual_report' | 'tech_stack' |
        'industry_trend' | 'competitor' | 'case_study' | 'custom';
  /** Query template with variable placeholders like {customer_name}, {industry} */
  query_template: string;
  /** Variable name to inject results as (e.g., 'search_industry_trend' for {{search_industry_trend}}) */
  inject_as: string;
  /** Industry type for specialized queries (optional) */
  industry_type?: 'education' | 'medical' | 'government' | 'enterprise' | 'finance' | 'manufacturing' | 'energy';
  /** Error handling strategy */
  on_error?: 'fail' | 'skip' | 'placeholder';
  /** Whether to enable deep search */
  deep_search?: boolean;
  /** Number of results to return */
  top_k?: number;
  /** Time filter for results */
  search_recency?: 'noLimit' | 'day' | 'week' | 'month' | 'semiyear' | 'year';
}

/**
 * Search result returned from search execution
 */
export interface SearchResult {
  /** Search name that generated this result */
  name: string;
  /** Formatted content ready for injection */
  content: string;
  /** Raw content from search API */
  raw_content: string;
  /** Reference links/citations */
  references?: any[];
  /** Whether search succeeded */
  success: boolean;
  /** Error message if search failed */
  error?: string;
}

/**
 * Context for variable replacement in search queries
 */
export interface SearchContext {
  /** Customer name */
  customer_name?: string;
  /** Industry type */
  industry?: string;
  /** Additional parameters from skill execution */
  parameters?: Record<string, any>;
  /** Current year for date-based queries */
  current_year?: number;
}

/**
 * Cache entry for search results
 */
interface CacheEntry {
  result: SearchResult;
  timestamp: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  // Industry-specific search query templates
  private readonly industryQueryTemplates: Record<string, Record<string, string>> = {
    education: {
      industry_trend: '{industry}信息化行业最新政策热点、标杆案例，请重点搜索最近6个月（180天）教育部、各省市教育厅发布的教育信息化政策、智慧校园建设规范、教育数字化转型指导意见，以及知名高校的智慧校园建设案例。',
      background: '{customer_name}的办学规模、学生人数、师资力量、办学特色等基本情况是什么？请用数字说话，包括具体的学生人数、教职工数量、校区分布等量化数据。',
      decision: '{customer_name}的校长、教务主任、信息化主任分别是谁？请重点搜索并总结他们关于教育信息化、数字化转型、智慧校园建设等方面的讲话、观点或相关政策。',
      digital: '{customer_name}在教育信息化、数字化转型、智慧校园建设方面有哪些战略规划、重点项目、建设动态？请重点搜索最近2-3年的政策和项目。',
      bidding: '{customer_name}在办公软件、协同办公、文档管理、信息化建设等方面的招标、中标、采购记录有哪些？请重点搜索最近2年的公开信息。',
    },
    medical: {
      industry_trend: '{industry}信息化行业最新政策热点、标杆案例，请重点搜索最近6个月（180天）卫健委发布的医疗信息化政策、智慧医院建设规范、互联网医疗指导意见。',
      background: '{customer_name}的医院等级、床位数、医护人员数量、年门诊量等基本情况是什么？请用数字说话。',
      decision: '{customer_name}的院长、信息中心主任分别是谁？请重点搜索他们关于智慧医院、互联网医疗、数字化转型的观点。',
      digital: '{customer_name}在智慧医院、互联网医疗、数字化转型方面有哪些战略规划、重点项目？',
    },
    government: {
      industry_trend: '{industry}数字化转型最新政策热点，请重点搜索最近6个月（180天）国务院、各部委发布的数字政府、一网通办、政务服务相关政策。',
      background: '{customer_name}的机构编制、服务人口、主要职能等基本情况是什么？',
      decision: '{customer_name}的主要领导是谁？请重点搜索他们关于数字政府、放管服改革的观点。',
      digital: '{customer_name}在数字政府、一网通办、政务服务数字化转型方面有哪些举措？',
    },
    enterprise: {
      industry_trend: '{industry}行业最新发展趋势、政策热点、标杆案例，请重点搜索最近6个月的重要信息。',
      background: '{customer_name}的企业规模、员工人数、年营收、行业地位等基本情况是什么？请用数字说话。',
      decision: '{customer_name}的CEO、CTO、CIO分别是谁？请重点搜索他们关于数字化转型的观点和讲话。',
      digital: '{customer_name}在数字化转型方面有哪些战略规划、重点项目？最近动态如何？',
    },
    finance: {
      industry_trend: '金融科技最新政策热点、发展趋势，请重点搜索最近6个月（180天）央行、银保监会发布的金融科技政策、数字化转型指导意见。',
      background: '{customer_name}的资产规模、客户数量、分支机构等基本情况是什么？请用数字说话。',
      decision: '{customer_name}的行长、首席信息官分别是谁？请重点搜索他们关于金融科技、数字化转型的观点。',
      digital: '{customer_name}在金融科技、数字化转型方面有哪些战略规划和项目？',
    },
  };

  // Default query templates for types without industry-specific variants
  private readonly defaultQueryTemplates: Record<string, string> = {
    cooperation: '{customer_name}和金山办公WPS365在WPS 365、文档中心、文档中台、AI、云文档等方面有哪些合作项目、中标记录或签约情况？包括战略合作、联合研发、采购等形式。',
    subsidiary: '{customer_name}的集团架构、子公司名单、分支机构分布是怎样的？请提供具体的组织结构信息。',
    annual_report: '{customer_name}最近年度的企业年报、年度战略规划、经营目标是什么？请重点搜索数字化转型相关内容。',
    tech_stack: '{customer_name}的招聘JD、技术岗位要求中提到了哪些技术栈？请搜索前端、后端、数据库、中间件等技术选型。',
    competitor: '{product_name}的最新产品动态、功能更新、市场表现是什么？请重点搜索最近3个月的信息。',
    case_study: '{scenario}的成功案例、最佳实践、标杆项目有哪些？请搜索具体的案例名称和实施效果。',
    custom: '{query}',
  };

  constructor(
    private readonly aiService: AIService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log('SearchService initialized');
  }

  /**
   * Execute multiple declarative searches with caching and parallelization
   */
  async executeDeclarativeSearches(
    searchConfigs: SearchConfig[],
    context: SearchContext,
  ): Promise<Record<string, SearchResult>> {
    const results: Record<string, SearchResult> = {};
    const currentTime = Date.now();

    // Build queries and check cache
    const searchesToExecute: Array<{ config: SearchConfig; query: string; cacheKey: string }> = [];

    for (const config of searchConfigs) {
      try {
        const query = this.buildSearchQuery(config, context);
        const cacheKey = this.generateCacheKey(config, query, context);

        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached && currentTime - cached.timestamp < this.CACHE_TTL) {
          this.logger.log(`✅ [SearchService] Cache hit for ${config.name}`);
          results[config.inject_as] = cached.result;
          continue;
        }

        searchesToExecute.push({ config, query, cacheKey });
      } catch (error) {
        this.logger.error(`❌ [SearchService] Failed to build query for ${config.name}:`, error);
        if (config.on_error === 'fail') {
          throw error;
        }
        results[config.inject_as] = {
          name: config.name,
          content: '',
          raw_content: '',
          success: false,
          error: error.message,
        };
      }
    }

    // Execute searches in parallel (all at once for simplicity, can add batching later)
    this.logger.log(`🔍 [SearchService] Executing ${searchesToExecute.length} searches...`);

    const searchPromises = searchesToExecute.map(async ({ config, query, cacheKey }) => {
      try {
        const result = await this.executeSingleSearch(config, query, context);

        // Cache the result
        this.cache.set(cacheKey, {
          result,
          timestamp: currentTime,
        });

        return { inject_as: config.inject_as, result };
      } catch (error) {
        this.logger.error(`❌ [SearchService] Search failed for ${config.name}:`, error);

        const errorResult: SearchResult = {
          name: config.name,
          content: '',
          raw_content: '',
          success: false,
          error: error.message,
        };

        // Handle based on on_error strategy
        switch (config.on_error) {
          case 'fail':
            throw error;
          case 'placeholder':
            errorResult.content = `[搜索失败: ${config.name} - ${error.message}]`;
            errorResult.success = true; // Mark as success to allow injection
            break;
          case 'skip':
          default:
            // Return empty result
            break;
        }

        return { inject_as: config.inject_as, result: errorResult };
      }
    });

    const searchResults = await Promise.all(searchPromises);

    // Collect results
    for (const { inject_as, result } of searchResults) {
      results[inject_as] = result;
    }

    this.logger.log(`✅ [SearchService] Completed ${Object.keys(results).length} searches`);
    return results;
  }

  /**
   * Build search query by replacing variables in template
   */
  private buildSearchQuery(config: SearchConfig, context: SearchContext): string {
    let query = config.query_template;

    // If query_template is not explicitly provided, use default templates
    if (!query) {
      // Check if there's a type-specific template
      const industryKey = config.industry_type || context.industry || 'enterprise';
      const typeTemplates = this.industryQueryTemplates[industryKey] || this.defaultQueryTemplates;

      if (typeTemplates[config.type]) {
        query = typeTemplates[config.type];
      } else if (this.defaultQueryTemplates[config.type]) {
        query = this.defaultQueryTemplates[config.type];
      } else {
        throw new Error(`No query template found for search type: ${config.type}`);
      }
    }

    // Replace variables
    const replacements: Record<string, string> = {
      customer_name: context.customer_name || '',
      industry: context.industry || '',
      current_year: String(context.current_year || new Date().getFullYear()),
      product_name: context.parameters?.product_name || '',
      scenario: context.parameters?.scenario || '',
      query: context.parameters?.query || '',
    };

    // Replace {variable} placeholders
    for (const [key, value] of Object.entries(replacements)) {
      query = query.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    // Also replace any parameter values
    if (context.parameters) {
      for (const [key, value] of Object.entries(context.parameters)) {
        if (typeof value === 'string') {
          query = query.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
      }
    }

    if (!query.trim()) {
      throw new Error(`Query is empty after variable replacement for ${config.name}`);
    }

    return query;
  }

  /**
   * Execute a single search using Baidu Web Search API
   */
  private async executeSingleSearch(
    config: SearchConfig,
    query: string,
    context: SearchContext,
  ): Promise<SearchResult> {
    this.logger.log(`🔍 [SearchService] Executing search: ${config.name} -> "${query.substring(0, 100)}..."`);

    // Call Baidu Web Search API
    const response = await this.aiService.baiduWebSearch(query, {
      topK: config.top_k || 20,
      enableDeepSearch: config.deep_search || false,
    });

    if (!response.content) {
      throw new Error(`Search returned empty content for ${config.name}`);
    }

    // Format the result for injection
    const formatted = this.formatSearchResultForInjection(config, response);

    this.logger.log(`✅ [SearchService] Search completed: ${config.name} -> ${formatted.content.length} chars`);

    return {
      name: config.name,
      content: formatted.content,
      raw_content: response.content,
      references: response.references,
      success: true,
    };
  }

  /**
   * Format search result for injection into skill content
   */
  private formatSearchResultForInjection(
    config: SearchConfig,
    response: { content: string; references?: any[] },
  ): { content: string } {
    // Format based on search type
    const typeLabels: Record<string, string> = {
      background: '背景资料',
      decision: '决策链',
      cooperation: '历史合作',
      digital: '数字化转型',
      bidding: '招投标',
      subsidiary: '子公司信息',
      annual_report: '年报战略',
      tech_stack: '技术栈',
      'industry_trend': '行业热点',
      competitor: '竞品信息',
      'case_study': '案例参考',
      custom: '搜索结果',
    };

    const label = typeLabels[config.type] || '搜索结果';

    let content = `### ${label}\n\n`;
    content += response.content;

    if (response.references && response.references.length > 0) {
      content += `\n\n**数据来源**：百度智能搜索`;
    }

    return { content };
  }

  /**
   * Generate cache key for search result
   */
  private generateCacheKey(config: SearchConfig, query: string, context: SearchContext): string {
    // Create a hash based on config name, query, and relevant context
    const parts = [
      config.name,
      query,
      context.customer_name || '',
      context.industry || '',
    ];

    // Add sorted parameter keys for consistent hashing
    if (context.parameters) {
      const paramKeys = Object.keys(context.parameters).sort();
      for (const key of paramKeys) {
        parts.push(`${key}:${String(context.parameters[key])}`);
      }
    }

    return parts.join('|');
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const currentTime = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (currentTime - entry.timestamp >= this.CACHE_TTL) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.log(`🧹 [SearchService] Cleared ${cleared} expired cache entries`);
    }
  }

  /**
   * Clear all cache entries
   */
  clearAllCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.log(`🧹 [SearchService] Cleared all cache entries (${size})`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
