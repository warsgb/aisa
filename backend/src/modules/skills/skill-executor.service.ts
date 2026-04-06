import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AIService, Message } from '../../common/services/ai.service';
import { SearchService, SearchResult } from '../../common/services/search.service';
import { Skill } from '../../entities/skill.entity';
import { SkillInteraction, InteractionStatus } from '../../entities/interaction.entity';
import { InteractionMessage, MessageRole } from '../../entities/interaction-message.entity';
import { TeamMember } from '../../entities/team-member.entity';
import { Document } from '../../entities/document.entity';
import { Customer } from '../../entities/customer.entity';
import { CustomerProfile } from '../../entities/customer-profile.entity';
import { CustomerFollowup } from '../../entities/customer-followup.entity';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ExecuteSkillOptions {
  skillId: string;
  teamId: string;
  customerId?: string;
  userId: string;
  parameters?: Record<string, any>;
  message?: string;
  interactionId?: string;
  endConversation?: boolean; // New flag to signal conversation end
  referenceDocumentId?: string; // Document to reference for context (deprecated, use referenceDocumentIds)
  referenceDocumentIds?: string[]; // Multiple documents to reference
  onChunk?: (chunk: string) => void;
  onStart?: (interactionId: string) => void;
  onComplete?: (result: {
    interactionId: string;
    documentId?: string;
    content: string;
  }) => void;
  onError?: (error: Error) => void;
}

@Injectable()
export class SkillExecutorService {
  private readonly logger = new Logger(SkillExecutorService.name);
  private readonly activeExecutions = new Map<string, { cancelled: boolean }>();

  constructor(
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    @InjectRepository(SkillInteraction)
    private interactionRepository: Repository<SkillInteraction>,
    @InjectRepository(InteractionMessage)
    private messageRepository: Repository<InteractionMessage>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(CustomerProfile)
    private customerProfileRepository: Repository<CustomerProfile>,
    @InjectRepository(CustomerFollowup)
    private followupRepository: Repository<CustomerFollowup>,
    private aiService: AIService,
    private searchService: SearchService,
  ) {}

  async executeSkill(options: ExecuteSkillOptions): Promise<void> {
    const {
      skillId,
      teamId,
      customerId,
      userId,
      parameters = {},
      message,
      interactionId: actionId,
      endConversation = false,
      referenceDocumentIds,
      onChunk,
      onStart,
      onComplete,
      onError,
    } = options;

    let interaction: SkillInteraction | undefined;

    try {
      // Verify user is a team member
      const membership = await this.teamMemberRepository.findOne({
        where: { team_id: teamId, user_id: userId },
      });

      if (!membership) {
        throw new Error('User is not a member of this team');
      }

      // Load skill
      const skill = await this.skillRepository.findOne({ where: { id: skillId } });

      if (!skill) {
        throw new NotFoundException('Skill not found');
      }

      // Get or create interaction
      if (actionId) {
        // Load existing interaction
        const existingInteraction = await this.interactionRepository.findOne({
          where: { id: actionId },
          relations: ['messages'],
        });

        if (!existingInteraction) {
          throw new NotFoundException('Interaction not found');
        }

        interaction = existingInteraction;
      } else {
        // Create new interaction
        interaction = this.interactionRepository.create({
          team_id: teamId,
          customer_id: customerId,
          skill_id: skillId,
          user_id: userId,
          status: InteractionStatus.RUNNING,
          parameters: parameters || {},
          started_at: new Date(),
        });

        await this.interactionRepository.save(interaction);

        // Emit start event
        if (onStart) {
          onStart(interaction.id);
        }
      }

      // Store interaction reference locally for safe access
      const interactionId = interaction.id;

      // Create cancel token
      const cancelToken = { cancelled: false };
      this.activeExecutions.set(interactionId, cancelToken);

      // Save user message using QueryBuilder to avoid cascade
      const messages = interaction.messages || [];
      const nextTurn = messages.length + 1;

      if (message) {
        await this.messageRepository
          .createQueryBuilder()
          .insert()
          .into('interaction_messages')
          .values({
            interaction_id: interactionId,
            role: MessageRole.USER,
            content: message,
            turn: nextTurn,
          })
          .execute();
      }

      // Load customer and profile context
      let customerContext = '';
      let customer: Customer | null = null;
      let profile: CustomerProfile | null = null;
      if (customerId) {
        console.log('📋 [Skill Executor] Loading customer context for:', customerId);
        customer = await this.customerRepository.findOne({
          where: { id: customerId },
        });

        if (customer) {
          customerContext = `\n\n[客户信息]\n客户名称: ${customer.name}\n`;
          console.log('✅ [Skill Executor] Found customer:', customer.name);

          // Load customer profile
          profile = await this.customerProfileRepository.findOne({
            where: { customer_id: customerId },
          });

          if (profile) {
            console.log('✅ [Skill Executor] Found customer profile');
            if (customer.industry) {
              customerContext += `行业: ${customer.industry}\n`;
            }
            if (profile.background_info) {
              customerContext += `\n背景资料:\n${profile.background_info}\n`;
            }
            if (profile.decision_chain) {
              customerContext += `\n决策链:\n${profile.decision_chain}\n`;
            }
            if (profile.history_notes) {
              customerContext += `\n历史笔记:\n${profile.history_notes}\n`;
            }

            // 加载跟进记录
            const followups = await this.followupRepository.find({
              where: { customer_id: customerId },
              order: { created_at: 'DESC' },
            });
            if (followups.length > 0) {
              const followupsText = followups.map(f => {
                const time = new Date(f.created_at).toLocaleString('zh-CN');
                return `[${time}]\n${f.content}`;
              }).join('\n\n---\n\n');
              customerContext += `\n客户跟进记录（共 ${followups.length} 条）:\n${followupsText}\n`;
            }
          } else {
            console.log('⚠️ [Skill Executor] No customer profile found');
          }
        } else {
          console.log('⚠️ [Skill Executor] Customer not found');
        }
      } else {
        console.log('ℹ️ [Skill Executor] No customerId provided');
      }

      // Load reference documents (support multiple)
      let documentContext = '';
      const docIds = referenceDocumentIds || [];
      if (docIds.length > 0) {
        console.log(`📄 [Skill Executor] Loading ${docIds.length} reference document(s)...`);
        const documents = await this.documentRepository.find({
          where: { id: In(docIds) },
        });

        if (documents.length > 0) {
          console.log(`✅ [Skill Executor] Found ${documents.length} reference document(s)`);
          documentContext = `\n\n[参考文档]\n${documents.map((doc, index) => `${index + 1}. ${doc.title}\n内容:\n${doc.content}\n`).join('\n---\n')}\n`;
        } else {
          console.log('⚠️ [Skill Executor] No reference documents found');
        }
      }

      // Prepare AI messages
      const aiMessages: Message[] = [];

      // Process system prompt - replace {{customer_background}} placeholder if profile exists
      let processedSystemPrompt = skill.system_prompt || '';
      if (profile && processedSystemPrompt.includes('{{customer_background}}')) {
        console.log('🔄 [Skill Executor] Injecting customer background...');
        let customerBackground = '';
        if (profile.background_info) {
          customerBackground += `## 客户背景资料\n\n${profile.background_info}\n\n`;
        }
        if (profile.decision_chain) {
          customerBackground += `## 决策链信息\n\n${profile.decision_chain}\n\n`;
        }
        if (profile.history_notes) {
          customerBackground += `## 历史合作笔记\n\n${profile.history_notes}\n\n`;
        }

        // 带入跟进记录
        const followupsForPrompt = await this.followupRepository.find({
          where: { customer_id: customerId },
          order: { created_at: 'DESC' },
        });
        if (followupsForPrompt.length > 0) {
          const followupsText = followupsForPrompt.map(f => {
            const time = new Date(f.created_at).toLocaleString('zh-CN');
            return `[${time}]\n${f.content}`;
          }).join('\n\n---\n\n');
          customerBackground += `## 客户跟进记录（共 ${followupsForPrompt.length} 条）\n\n${followupsText}\n\n`;
        }
        processedSystemPrompt = processedSystemPrompt.replaceAll('{{customer_background}}', customerBackground || '[客户背景资料暂无]');
        console.log('✅ [Skill Executor] Customer background injected');
      }

      // Step 4.5: Execute declarative searches and inject results
      if (skill.search_configs && Array.isArray(skill.search_configs) && skill.search_configs.length > 0) {
        console.log('🔍 [Skill Executor] Executing declarative searches...');
        try {
          const industry = customer?.industry || parameters.industry || 'enterprise';
          const searchResults = await this.searchService.executeDeclarativeSearches(
            skill.search_configs,
            {
              customer_name: customer?.name || parameters.customer_name,
              industry,
              current_year: parameters.year || new Date().getFullYear(),
              parameters: {
                ...parameters,
                company_name: customer?.name || parameters.company_name,
              },
            }
          );

          // Inject search results into system prompt
          for (const [injectAs, result] of Object.entries(searchResults)) {
            const placeholder = `{{${injectAs}}}`;
            if (processedSystemPrompt.includes(placeholder)) {
              console.log(`🔄 [Skill Executor] Injecting search result: ${injectAs}`);
              const resultText = result.content || result.raw_content || JSON.stringify(result);
              processedSystemPrompt = processedSystemPrompt.replaceAll(placeholder, resultText);
              console.log(`✅ [Skill Executor] Search result injected: ${injectAs}`);
            }
          }
          console.log(`✅ [Skill Executor] ${Object.keys(searchResults).length} search results processed`);
        } catch (error) {
          console.error('❌ [Skill Executor] Search execution failed:', error);
          // Continue without search results
        }
      }

      // Step 4.6: Execute @script directive if present
      const scriptResult = await this.executeScriptDirective(skill, parameters, customer);
      if (scriptResult) {
        // Script executed successfully, send result via streaming
        console.log('✅ [Skill Executor] Script result injected, skipping AI call');

        // Send result through callbacks
        if (onChunk) {
          onChunk(scriptResult);
        }

        // Update interaction status to COMPLETED
        await this.interactionRepository
          .createQueryBuilder()
          .update('skill_interactions')
          .set({
            status: InteractionStatus.COMPLETED,
            completed_at: () => 'CURRENT_TIMESTAMP',
            summary: scriptResult.substring(0, 500),
          })
          .where('id = :id', { id: interactionId })
          .execute();

        // Save assistant message with script result
        await this.messageRepository
          .createQueryBuilder()
          .insert()
          .into('interaction_messages')
          .values({
            interaction_id: interactionId,
            role: MessageRole.ASSISTANT,
            content: scriptResult,
            turn: nextTurn,
          })
          .execute();

        // Notify completion
        if (onComplete) {
          onComplete({
            interactionId,
            content: scriptResult,
          });
        }

        return;
      }

      // Add system prompt
      if (processedSystemPrompt) {
        aiMessages.push({
          role: 'system',
          content: processedSystemPrompt,
        });
      }

      // Add conversation history
      for (const msg of messages) {
        if (msg.role === MessageRole.USER || msg.role === MessageRole.ASSISTANT) {
          aiMessages.push({
            role: msg.role.toLowerCase() as 'user' | 'assistant',
            content: msg.content,
          });
        }
      }

      // Add current user message
      if (message) {
        aiMessages.push({
          role: 'user',
          content: message,
        });
      }

      // Add conversation end signal if ending
      if (endConversation && message === undefined) {
        aiMessages.push({
          role: 'user',
          content: '请对我们的对话做一个总结，并给出最终结论或建议。',
        });
      }

      // Add parameters context
      if (Object.keys(parameters).length > 0) {
        const paramContext = `\n\n[Parameters]\n${JSON.stringify(parameters, null, 2)}`;
        aiMessages.push({
          role: 'user',
          content: `Use these parameters for context:${paramContext}`,
        });
      }

      // Add customer and document context
      if (customerContext || documentContext) {
        aiMessages.push({
          role: 'user',
          content: `${customerContext}${documentContext}\n\n请基于以上上下文信息回答问题。`,
        });
      }

      console.log('🎯 [Skill Executor] Executing skill:', skillId);
      console.log('💬 [Skill Executor] Message count:', aiMessages.length);
      console.log('🤖 [Skill Executor] Calling AI service...');

      // Stream response from AI
      let fullResponse = '';
      let hasReceivedChunk = false;

      // Add timeout to detect hanging AI service
      const timeout = setTimeout(() => {
        if (!hasReceivedChunk && onError) {
          console.error('❌ [Skill Executor] AI service timeout - no response received');
          console.error('❌ [Skill Executor] Possible issues: AI service down, API key invalid, or network error');
          onError(new Error('AI service timeout - no response received after 60 seconds'));
        }
      }, 60000); // 60 second timeout

      await this.aiService.stream({
        messages: aiMessages,
        system: skill.system_prompt,
        onChunk: (chunk: string) => {
          if (cancelToken.cancelled) {
            console.log('⚠️ [Skill Executor] Execution cancelled, ignoring chunk');
            return;
          }
          if (!hasReceivedChunk) {
            console.log('✅ [Skill Executor] Received first chunk from AI');
            hasReceivedChunk = true;
          }
          fullResponse += chunk;
          if (onChunk) {
            onChunk(chunk);
          }
        },
        onComplete: async (text: string) => {
          clearTimeout(timeout); // Clear timeout on completion

          if (cancelToken.cancelled) return;

          console.log('✅ [Skill Executor] AI service completed successfully');
          console.log(`✅ [Skill Executor] Response length: ${text.length} characters`);

          try {
            // Reload interaction to get latest state
            const updatedInteraction = await this.interactionRepository.findOne({
              where: { id: interactionId },
              relations: ['messages'],
            });

            if (!updatedInteraction) {
              throw new Error('Interaction not found');
            }

            // Calculate next turn number
            const currentMessages = updatedInteraction.messages || [];
            const assistantTurn = currentMessages.length + 1;

            // Save assistant message using QueryBuilder to avoid cascade
            await this.messageRepository
              .createQueryBuilder()
              .insert()
              .into('interaction_messages')
              .values({
                interaction_id: interactionId,
                role: MessageRole.ASSISTANT,
                content: text,
                turn: assistantTurn,
              })
              .execute();

            // Update interaction status using QueryBuilder to avoid cascade
            await this.interactionRepository
              .createQueryBuilder()
              .update('skill_interactions')
              .set({
                status: InteractionStatus.COMPLETED,
                completed_at: () => 'CURRENT_TIMESTAMP',
                summary: text.substring(0, 500),
              })
              .where('id = :id', { id: interactionId })
              .execute();

            // Generate document
            const document = await this.generateDocument(
              updatedInteraction,
              skill,
              text,
            );

            if (onComplete) {
              onComplete({
                interactionId: updatedInteraction.id,
                documentId: document?.id,
                content: text,
              });
            }

            this.logger.log(`✅ [Skill Executor] Completed interaction ${interactionId}`);
          } catch (error) {
            this.logger.error('Error saving AI response:', error);

            // Update interaction status to failed
            const failedInteraction = await this.interactionRepository.findOne({
              where: { id: interactionId },
            });

            if (failedInteraction) {
              await this.interactionRepository
                .createQueryBuilder()
                .update('skill_interactions')
                .set({
                  status: InteractionStatus.FAILED,
                })
                .where('id = :id', { id: interactionId })
                .execute();
            }

            if (onError) {
              onError(error as Error);
            }
          } finally {
            this.activeExecutions.delete(interactionId);
          }
        },
        onError: async (error: Error) => {
          clearTimeout(timeout); // Clear timeout on error

          this.logger.error('AI service error:', error);
          console.error('❌ [Skill Executor] AI service error:', error.message);
          console.error('❌ [Skill Executor] Error stack:', error.stack);

          // Update interaction status to failed
          const failedInteraction = await this.interactionRepository.findOne({
            where: { id: interactionId },
          });

          if (failedInteraction) {
            await this.interactionRepository
              .createQueryBuilder()
              .update('skill_interactions')
              .set({
                status: InteractionStatus.FAILED,
              })
              .where('id = :id', { id: interactionId })
              .execute();
          }

          this.activeExecutions.delete(interactionId);

          if (onError) {
            onError(error);
          }
        },
      });

      console.log('📊 [Skill Executor] Execution finished');
      console.log(`📊 Interaction ID: ${interactionId}`);
      console.log(`📊 Total response length: ${fullResponse.length} characters`);

      if (!hasReceivedChunk) {
        console.error('⚠️ [Skill Executor] WARNING: No chunks received from AI service!');
        console.error('⚠️ [Skill Executor] This indicates the AI service did not return any response');
      }
    } catch (error) {
      this.logger.error('Error executing skill:', error);

      // Update interaction status to failed if we have one
      if (interaction) {
        await this.interactionRepository
          .createQueryBuilder()
          .update('skill_interactions')
          .set({
            status: InteractionStatus.FAILED,
          })
          .where('id = :id', { id: interaction.id })
          .execute();
      }

      if (onError) {
        onError(error as Error);
      }
    }
  }

  async cancelSkill(interactionId: string, userId: string): Promise<void> {
    const execution = this.activeExecutions.get(interactionId);

    if (!execution) {
      throw new Error('Interaction not found or already completed');
    }

    execution.cancelled = true;

    // Update interaction status
    const interaction = await this.interactionRepository.findOne({
      where: { id: interactionId },
    });

    if (interaction) {
      await this.interactionRepository
        .createQueryBuilder()
        .update('skill_interactions')
        .set({
          status: InteractionStatus.CANCELLED,
          completed_at: () => 'CURRENT_TIMESTAMP',
        })
        .where('id = :id', { id: interactionId })
        .execute();
    }

    this.logger.log(`Cancelled interaction ${interactionId}`);
  }

  private async generateDocument(
    interaction: SkillInteraction,
    skill: Skill,
    content: string,
  ): Promise<Document | undefined> {
    try {
      // Only generate document for certain skills or when content is substantial
      if (!content || content.length < 100) {
        return undefined;
      }

      const title = `${skill.name} - ${new Date().toLocaleDateString('zh-CN')}`;

      const document = this.documentRepository.create({
        team_id: interaction.team_id,
        customer_id: interaction.customer_id,
        interaction_id: interaction.id,
        title,
        content: `# ${title}\n\n**Skill:** ${skill.name}\n**Date:** ${new Date().toISOString()}\n\n${content}`,
        format: 'markdown',
      });

      await this.documentRepository.save(document);

      this.logger.log(`Generated document ${document.id} for interaction ${interaction.id}`);

      return document;
    } catch (error) {
      this.logger.error('Error generating document:', error);
      return undefined;
    }
  }

  /**
   * Execute @script directive if present in system prompt
   * @returns Script output if script was executed, null otherwise
   */
  private async executeScriptDirective(
    skill: Skill,
    parameters: Record<string, any>,
    customer: Customer | null,
  ): Promise<string | null> {
    const systemPrompt = skill.system_prompt || '';

    // 解析 @script 指令
    // 支持两种格式:
    // 1. @script:path/to/script.js arg1 arg2 key="{{value}}"
    // 2. @script:path/to/script.js method="method" param="{{value}}"
    const scriptRegex = /@script:(\S+)(?:\s+(.+?))?$/gm;
    const match = scriptRegex.exec(systemPrompt);

    if (!match) {
      return null; // 没有 @script 指令
    }

    const [, scriptPath, argsStr] = match;

    console.log(`🔧 [Skill Executor] Found @script directive: ${scriptPath}`);
    console.log(`   Args: ${argsStr}`);
    console.log(`   Customer: ${customer?.name || 'None'}`);

    try {
      // 构建脚本完整路径
      const skillsDir = path.join(process.cwd(), '..', 'skills');
      const skillFilePath = skill.file_path || '';
      const skillDir = path.join(skillsDir, skillFilePath.replace(/\/SKILL\.md$/, ''));
      const fullScriptPath = path.join(skillDir, scriptPath);

      if (!fs.existsSync(fullScriptPath)) {
        console.error(`❌ [Skill Executor] Script not found: ${fullScriptPath}`);
        return `错误：脚本文件不存在: ${scriptPath}`;
      }

      console.log(`✅ [Skill Executor] Script found: ${fullScriptPath}`);

      // 构建替换上下文（包含客户信息）
      const context = {
        ...parameters,
        customer_name: customer?.name || '',
        customer_industry: customer?.industry || '',
      };

      // 解析参数
      const commandArgs: string[] = [];
      const namedParams: Record<string, string> = {};

      if (argsStr) {
        // 解析参数和占位符
        // 支持: method="method" query="{{value}}" 或直接 arg1 arg2
        const argRegex = /(\w+)=["']([^"']+)["']|["']([^"']+)["']|(\S+)/g;
        let argMatch;
        while ((argMatch = argRegex.exec(argsStr)) !== null) {
          if (argMatch[1]) {
            // 命名参数: key="value"
            const [, key, value] = argMatch;
            const resolvedValue = this.replaceParameterPlaceholders(value, context);
            namedParams[key] = resolvedValue;
          } else if (argMatch[3]) {
            // 位置参数（带引号）: "value"
            const resolvedValue = this.replaceParameterPlaceholders(argMatch[3], context);
            commandArgs.push(resolvedValue);
          } else if (argMatch[4]) {
            // 位置参数（不带引号）: arg
            const resolvedValue = this.replaceParameterPlaceholders(argMatch[4], context);
            commandArgs.push(resolvedValue);
          }
        }
      }

      console.log(`📋 [Skill Executor] Command args:`, commandArgs);
      console.log(`📋 [Skill Executor] Named params:`, namedParams);

      // 构建命令行
      let cmd = `node "${fullScriptPath}"`;

      // 添加位置参数
      if (commandArgs.length > 0) {
        cmd += ' ' + commandArgs.map(arg => `"${arg}"`).join(' ');
      }

      // 添加命名参数（作为 --params）
      if (Object.keys(namedParams).length > 0) {
        const paramsJson = JSON.stringify(namedParams);
        cmd += ` --params '${paramsJson}'`;
      }

      // 执行脚本
      console.log(`⚡ [Skill Executor] Executing: ${cmd}`);
      const { stdout, stderr } = await execAsync(cmd);

      if (stderr) {
        console.error(`⚠️ [Skill Executor] Script stderr: ${stderr}`);
      }

      console.log(`✅ [Skill Executor] Script executed successfully`);
      console.log(`📤 [Skill Executor] Output length: ${stdout.length} chars`);

      return stdout;

    } catch (error) {
      console.error(`❌ [Skill Executor] Script execution failed:`, error);
      return `脚本执行失败: ${error.message}`;
    }
  }

  /**
   * Replace parameter placeholders in string
   * Format: {{parameter}}
   */
  private replaceParameterPlaceholders(
    str: string,
    parameters: Record<string, any>,
  ): string {
    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = parameters[key];
      return value !== undefined ? String(value) : match;
    });
  }
}
