import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import { AIService } from '../../common/services/ai.service';

const execAsync = promisify(exec);

@Injectable()
export class KuaichaService {
  private readonly logger = new Logger(KuaichaService.name);
  private readonly scriptPath = path.join(process.cwd(), '../skills/kuaicha-search/scripts/kuaicha_tool.mjs');
  private readonly maxCalls = 12;

  constructor(private aiService: AIService) {}

  /**
   * 获取企业的creditcode（用于后续查询）
   */
  async getCreditCode(customerName: string): Promise<string> {
    try {
      this.logger.log(`🔍 Getting creditcode for: ${customerName}`);

      // 直接调用模糊搜索工具
      const result = await this.executeToolCall({
        tool: 'call',
        params: {
          tool_id: 'cat3_8d3439e5018b',
          params: { query: customerName }
        }
      });

      if (result.status_code === 2000 || result.status_code === 0) {
        const data = result.data;
        // 数据结构是 { list: [...] }
        const list = data.list || data;
        if (Array.isArray(list) && list.length > 0) {
          const first = list[0];
          const creditcode = first.creditcode || '';
          this.logger.log(`✅ Got creditcode: ${creditcode}`);
          return creditcode;
        }
      }

      this.logger.warn(`⚠️ Could not get creditcode for ${customerName}`);
      return '';
    } catch (error: any) {
      this.logger.error(`❌ Error getting creditcode: ${error.message}`);
      return '';
    }
  }

  async search(query: string, customerId?: string): Promise<any> {
    this.logger.log(`🔍 Kuaicha AI search: ${query}`);

    try {
      // 第一步：discover 获取多个类别的工具清单
      const discoverQueries = [
        '企业模糊搜索',
        '企业对外投资',
        '企业招投标信息'
      ];

      const allTools: any[] = [];
      for (const q of discoverQueries) {
        try {
          const d = await this.executeToolCall({ tool: 'discover', params: { query: q } });
          const ts: any[] = d.tools || [];
          allTools.push(...ts);
          this.logger.log(`discover "${q}" returned ${ts.length} tools`);
        } catch (e) {
          this.logger.warn(`discover "${q}" failed: ${e.message}`);
        }
      }

      // 去重
      const uniqueTools = Array.from(new Map(allTools.map(t => [t.tool_id, t])).values());

      if (uniqueTools.length === 0) {
        return { success: false, query, error: 'no tools found' };
      }
      this.logger.log(`Total unique tools: ${uniqueTools.length}`);

      // 第二步：AI多轮调用
      const messages: { role: 'user' | 'assistant'; content: string }[] = [];
      const toolResults: any[] = [];
      let callCount = 0;

      messages.push({
        role: 'user',
        content: this.buildFirstPrompt(query, uniqueTools),
      });

      while (callCount < this.maxCalls) {
        this.logger.log(`🤖 AI对话第${callCount + 1}轮，消息数=${messages.length}`);

        // 如果是最后一轮，强制要求AI给出答案
        let systemPrompt = this.buildSystemPrompt();
        if (callCount === this.maxCalls - 1) {
          systemPrompt += '\n\n**重要：这是最后一次机会，必须给出最终答案，不要再调用工具！**';
          messages.push({
            role: 'user',
            content: `这是最后一次机会。你已经调用了${callCount}次工具，收集了足够的数据。现在必须给出综合分析报告���不要再调用工具。`
          });
        }

        const aiResponse = await this.aiService.create({
          messages,
          system: systemPrompt,
          temperature: 0.7,
          maxTokens: 8192,
        });

        this.logger.log(`📥 AI响应长度: ${aiResponse.length}, 前200字符: ${aiResponse.substring(0, 200)}`);
        messages.push({ role: 'assistant', content: aiResponse });

        // 解析工具调用
        const toolCall = this.parseToolJson(aiResponse);

        if (!toolCall) {
          // 没有工具调用 → AI给出了最终答案
          this.logger.log('✅ AI未调用工具，视为最终答案');
          return {
            success: true,
            query,
            data: { answer: aiResponse, toolResults },
            source: '数���来源于同花顺旗下快查企业数据引擎',
          };
        }

        if (toolCall.tool === 'answer') {
          this.logger.log('✅ AI返回最终答案');
          return {
            success: true,
            query,
            data: { answer: toolCall.params.answer || aiResponse, toolResults },
            source: '数据来源于同花顺旗下快查企业数据引擎',
          };
        }

        // 执行工具
        callCount++;
        this.logger.log(`⚡ 执行工具: ${toolCall.tool}(${JSON.stringify(toolCall.params).substring(0, 80)})`);
        try {
          const result = await this.executeToolCall(toolCall);
          toolResults.push({ tool: toolCall.tool, params: toolCall.params, result });
          this.logger.log(`✅ 工具执行成功: ${toolCall.tool}, status=${result.status_code}`);

          // 把结果摘要反馈给AI
          const summary = this.summarizeToolResult(toolCall.tool, result);
          this.logger.log(`📝 工具结果摘要长度: ${summary.length}`);
          messages.push({ role: 'user', content: summary });
        } catch (error: any) {
          this.logger.error(`❌ 工具执行失败: ${error.message}`);
          messages.push({ role: 'user', content: `工具执行失败: ${error.message}。请重试或直接给出答案。` });
        }
      }

      return {
        success: true,
        query,
        data: { answer: `已完成${toolResults.length}次工具调用。`, toolResults },
        source: '数据来源于同花顺旗下快查企业数据引擎',
      };
    } catch (error) {
      this.logger.error('❌ Kuaicha search failed:', error);
      return { success: false, query, error: error.message };
    }
  }

  // ─── Prompt 构建 ─────────────────────────────────────────────────────────


  private buildFirstPrompt(query: string, tools: any[]): string {
    const needBidding = query.includes('招投标') || query.includes('中标') || query.includes('采购') || query.includes('招标');
    const needInvestment = query.includes('二级公司') || query.includes('子公司') || query.includes('对外投资');

    // 获取当前时间
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDate = now.getDate();
    const currentTimeStr = `${currentYear}年${currentMonth}月${currentDate}日`;

    // 计算时间戳
    const threeYearsAgo = new Date(now);
    threeYearsAgo.setFullYear(now.getFullYear() - 3);
    const threeYearsAgoStr = `${threeYearsAgo.getFullYear()}年${threeYearsAgo.getMonth() + 1}月${threeYearsAgo.getDate()}日`;
    const startTimeStamp = Math.floor(threeYearsAgo.getTime() / 1000);
    const endTimeStamp = Math.floor(now.getTime() / 1000);

    const toolList = tools
      .filter(t => t.similarity >= 0.3)
      .slice(0, 15)
      .map(t => {
        const params = t.params.map((p: any) => `  ${p.name}: ${p.description}`).join('\n');
        return `[${t.tool_id}] ${t.name}\n  描述: ${t.description}\n  参数:\n${params}`;
      }).join('\n\n');

    let mandatory = '';
    if (needBidding) {
      mandatory += `\n\n【强制】用户询问招投标，必须使用工具 cat6_06016c872659（企业招投标信息）`;
      mandatory += `\n参数示例：{"orgid":"企业ID", "subject_identity":1, "start_time":${startTimeStamp}, "end_time":${endTimeStamp}`;
    }
    if (needInvestment) {
      mandatory += `\n\n【强制】用户询问二级公司，必须使用工具 cat3_521bc31597e3（对外投资）`;
      mandatory += `\n参数示例：{"orgid":"企业ID", "page_size":50}`;
    }

    return `User query: ${query}

**当前时间**: ${currentTimeStr}

Available tools:
${toolList}
${mandatory}

**Strategy**:
1. First use fuzzy search to get orgid/creditcode
2. For bidding: use cat6_06016c872659, NOT info search!
3. For subsidiaries: use cat3_521bc31597e3, NOT info search!
4. Info search (cat3_13946ca91196) is LAST resort only

**Time reference**:
- Current time: ${currentTimeStr}
- "过去3年" = ${threeYearsAgoStr} to ${currentTimeStr} (timestamp: ${startTimeStamp} to ${endTimeStamp})
- "最近2个月" = approximately ${Math.floor(endTimeStamp - 60 * 24 * 30)} to ${endTimeStamp}
- 财务数据必须标注具体年份：${currentYear}年, ${currentYear - 1}年, ${currentYear - 2}年

**Output format (VERY IMPORTANT)**:
你最终返回的answer必须符合以下Markdown格式：

# 企业名称
## 一、基本信息
- **主营业务**：（具体描述）
- **员工规模**：（具体数字）
- **近3年营收**：
  - ${currentYear}年：（金额，同比变化）
  - ${currentYear - 1}年：（金额）
  - ${currentYear - 2}年：（金额）
- **行业地位**：（具体描述）

## 二、二级公司/对外投资
（列表形式，子公司名称、持股比例）

## 三、招投标与供应商
- **近3年数字化/IT类招标**：
  - 项目名称、金额、中标单位
- **主要供应商**：供应商名称、合作金额

## 四、数字化动态
- **数字化领导**（3-5位）：姓名、职位、数字化相关发言
- **数字化新闻/奖项**：标题、时间、内容摘要

Call: {"tool":"call","params":{"tool_id":"...","params":{...}}}
End: {"tool":"answer","params":{"answer":"## 一、基本信息\n..."}}`;
  }

  private buildSystemPrompt(): string {
    // 动态计算时间
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDate = now.getDate();
    const currentTimeStr = `${currentYear}年${currentMonth}月${currentDate}日`;

    const threeYearsAgo = new Date(now);
    threeYearsAgo.setFullYear(now.getFullYear() - 3);
    const threeYearsAgoStr = `${threeYearsAgo.getFullYear()}年${threeYearsAgo.getMonth() + 1}月${threeYearsAgo.getDate()}日`;
    const startTimeStamp = Math.floor(threeYearsAgo.getTime() / 1000);
    const endTimeStamp = Math.floor(now.getTime() / 1000);

    return `You are an enterprise data query assistant.

**Core rules**:
1. Output ONLY JSON, no markdown
2. Output exactly ONE JSON object per response
3. ALWAYS include specific years in financial data (e.g., ${currentYear}年, ${currentYear - 1}年, ${currentYear - 2}年, NOT vague terms)

**Tool selection**:
- Bidding/Procurement: MUST use cat6_06016c872659, NOT info search!
- Subsidiaries: MUST use cat3_521bc31597e3, NOT info search!
- Info search (cat3_13946ca91196) is LAST resort only

**Parameters**:
- Bidding: orgid, subject_identity=1, start_time=${startTimeStamp}, end_time=${endTimeStamp}
- Investment: orgid, page_size=50
- Financial data: ALWAYS specify exact years like ${currentYear}年, ${currentYear - 1}年

**Time reference**:
- Current time: ${currentTimeStr}
- "过去3年" = ${threeYearsAgoStr} to ${currentTimeStr} (timestamp: ${startTimeStamp} to ${endTimeStamp})
- "最近2个月" = approximately ${Math.floor(endTimeStamp - 60 * 24 * 30)} to ${endTimeStamp}

Call: {"tool":"call","params":{"tool_id":"...","params":{...}}}
End: {"tool":"answer","params":{"answer":"..."}}`;
  }
  private async executeToolCall(toolCall: { tool: string; params: any }): Promise<any> {
    const useProxy = process.env.USE_KUAICHA_PROXY === 'true';
    const proxyUrl = process.env.KUAICHA_PROXY_URL;

    if (useProxy && proxyUrl) {
      // 通过代理服务调用
      if (toolCall.tool === 'discover') {
        const query = toolCall.params.query || '';
        const res = await fetch(`${proxyUrl}/discover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        return await res.json();
      }
      if (toolCall.tool === 'call') {
        const toolId = toolCall.params.tool_id || '';
        const callParams = toolCall.params.params || {};
        const res = await fetch(`${proxyUrl}/call`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool_id: toolId, params: callParams }),
        });
        return await res.json();
      }
      throw new Error(`未知工具: ${toolCall.tool}`);
    }

    // 原有脚本调用
    if (toolCall.tool === 'discover') {
      const query = toolCall.params.query || '';
      const cmd = `node "${this.scriptPath}" discover "${query}"`;
      const { stdout } = await execAsync(cmd);
      return JSON.parse(stdout);
    }
    if (toolCall.tool === 'call') {
      const toolId = toolCall.params.tool_id || '';
      const callParams = toolCall.params.params || {};
      const cmd = `node "${this.scriptPath}" call ${toolId} --params '${JSON.stringify(callParams)}'`;
      const { stdout } = await execAsync(cmd);
      return JSON.parse(stdout);
    }
    throw new Error(`未知工具: ${toolCall.tool}`);
  }

  private summarizeToolResult(tool: string, result: any): string {
    if (result.status_code !== 2000 && result.status_code !== 0) {
      return `错误: ${result.status_msg || result.message || '未知错误'}。请尝试其他工具。`;
    }
    const data = result.data;
    if (!data) return '工具返回空数据。请尝试其他工具。';

    // 模糊搜索结果
    if (Array.isArray(data)) {
      if (data.length === 0) return '工具返���空列表。请尝试其他工具。';
      const total = (data as any).total || data.length;
      const first = data[0];
      const corp_name = first.corp_name || first.company_name || '未知企业';
      const orgid = first.orgid || '无';
      const creditcode = first.creditcode || '无';
      const staff_num = first.staff_num || first.social_staff_num || '未知';
      const capital = first.reg_capital || first.capital || '未知';

      return `模糊搜索找到${total}个结果。第一个企业的完整数据：
${JSON.stringify(first, null, 2)}

重要提示：请从上面的JSON数据中提取 orgid 和 creditcode，后续查询必须使用这些ID，不要使用企业名称！`;
    }

    // 企业详情 - 保留所有关键字段
    if (typeof data === 'object') {
      const important = ['corp_name', 'company_name', 'creditcode', 'orgid',
        'employee_count', 'insured_num', 'reg_capital', 'legal_person',
        'business_scope', 'industry', 'national_industry', 'established_date',
        'operating_status', 'total_revenue', 'revenue', 'main_business',
        'staff_num', 'social_staff_num', 'actual_capital', 'corp_type',
        'scale_level', 'industry_classify_name'];
      const filtered: any = {};
      for (const k of important) {
        if (data[k] !== undefined && data[k] !== null && data[k] !== '') {
          let val = data[k];
          // 保留完整数据，不截断
          filtered[k] = val;
        }
      }
      if (Object.keys(filtered).length > 0) {
        return `企业详细信息：\n${JSON.stringify(filtered, null, 2)}\n\n请继续查询其他维度（财务数据、客户供应商、产业链位置等）。`;
      }
    }

    // 资讯搜索结果
    if (data.list && Array.isArray(data.list)) {
      const count = data.list.length;
      if (count === 0) return '资讯搜索返回空结果。请尝试其他工具。';

      // 如果返回的数据很多（超过5条），提示AI已经足够
      if (count >= 5) {
        const previews = data.list.slice(0, 5).map((item: any) => {
          const title = item.title || item.news_title || '无标题';
          const date = item.pub_date || item.date || '';
          const content = item.content || '';
          const contentPreview = content.length > 100 ? content.substring(0, 100) + '...' : content;
          return `- ${title} (${date})\n  ${contentPreview}`;
        }).join('\n\n');
        return `资讯搜索返回${count}条结果（显示前5条）：\n${previews}\n\n注意：已经有足够的数据了，请综合这些信息给出最终分析报告，不要再继续搜索。`;
      }

      const previews = data.list.slice(0, 3).map((item: any) => {
        const title = item.title || item.news_title || '无标题';
        const date = item.pub_date || item.date || '';
        const content = item.content || '';
        const contentPreview = content.length > 100 ? content.substring(0, 100) + '...' : content;
        return `- ${title} (${date})\n  ${contentPreview}`;
      }).join('\n\n');
      return `资讯搜索返回${count}条结果：\n${previews}\n\n请继续查询或给出综合分析。`;
    }

    // 其他数据
    return `数据：${JSON.stringify(data).substring(0, 500)}\n\n请继续查询或给出综合分析。`;
  }

  // ─── 工具调用解析 ───────────────────────────────────────────────────────

  /**
   * 直接调用资讯查询工具（用于决策链搜索）
   * 使用 cat3_13946ca91196 工具查询企业资讯、新闻、领导发言等
   */
  async queryNews(creditcode: string, queryKeyword: string): Promise<any> {
    try {
      this.logger.log(`📰 Kuaicha news query: ${queryKeyword}`);

      // 使用企业信息搜索工具（包含资讯通道）
      const toolId = 'cat3_13946ca91196';

      const result = await this.executeToolCall({
        tool: 'call',
        params: {
          tool_id: toolId,
          params: {
            questions: [
              {
                question: queryKeyword,
                channels: 'news,web,notice',
                blocks: '3',
                extra: '0',
                authType: '1'
              }
            ],
            processNum: '3'
          }
        }
      });

      if (result.status_code === 2000 || result.status_code === 0) {
        this.logger.log(`✅ News query successful: ${JSON.stringify(result.data).substring(0, 200)}...`);
        return { success: true, data: result.data };
      }

      this.logger.warn(`⚠️ News query failed: ${result.status_msg}`);
      return { success: false, error: result.status_msg };
    } catch (error: any) {
      this.logger.error(`❌ News query error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private parseToolJson(response: string): { tool: string; params: any } | null {
    // 清理响应：移除markdown代码块标记
    let cleanResponse = response.trim();
    cleanResponse = cleanResponse.replace(/^```json\s*/, '');
    cleanResponse = cleanResponse.replace(/^```\s*/, '');
    cleanResponse = cleanResponse.replace(/\s*```$/, '');

    // 尝试直接解析响应为JSON
    try {
      const obj = JSON.parse(cleanResponse);
      const tool = obj.tool || obj.action || '';

      // AI返回格式：{ "tool":"call", "params": { "tool_id":"xxx", "params":{...} } }
      // 或者：    { "tool":"answer", "params": { "answer":"..." } }
      if (tool === 'call') {
        const nested = obj.params || {};
        const toolId = nested.tool_id || nested.toolId || '';
        const callParams = nested.params || {};
        if (toolId) {
          return { tool: 'call', params: { tool_id: toolId, params: callParams } };
        }
      }
      if (tool === 'answer') {
        const nested = obj.params || {};
        return { tool: 'answer', params: nested };
      }
      this.logger.warn(`⚠️ parseToolJson: tool="${tool}", 有${Object.keys(obj).length}个字段`);
    } catch (e) {
      // 如果JSON解析失败，检查是否是answer被截断
      if (cleanResponse.includes('"tool":"answer"') || cleanResponse.includes('"answer":')) {
        this.logger.warn(`⚠️ parseToolJson: 检测到被截断的answer，尝试提取`);
        // 尝试提取answer字段
        const answerMatch = cleanResponse.match(/"answer"\s*:\s*"((?:[^"\\]|\\.)*)/);
        if (answerMatch) {
          return { tool: 'answer', params: { answer: answerMatch[1] } };
        }
        // 如果找不到完整的answer，返回部分内容
        if (cleanResponse.startsWith('{"tool":"answer"')) {
          // 提取#标题到结尾的内容
          const contentMatch = cleanResponse.match(/\n#\s+.+/s);
          if (contentMatch) {
            return { tool: 'answer', params: { answer: contentMatch[0] } };
          }
        }
      }
      this.logger.warn(`⚠️ parseToolJson JSON解析失败: ${e.message}`);
    }
    return null;
  }
}
