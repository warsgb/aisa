import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIService, Message } from '../../common/services/ai.service';
import { Skill } from '../../entities/skill.entity';
import { SkillInteraction, InteractionStatus } from '../../entities/interaction.entity';
import { InteractionMessage, MessageRole } from '../../entities/interaction-message.entity';
import { TeamMember } from '../../entities/team-member.entity';
import { Document } from '../../entities/document.entity';
import { Customer } from '../../entities/customer.entity';
import { CustomerProfile } from '../../entities/customer-profile.entity';

interface ExecuteSkillOptions {
  skillId: string;
  teamId: string;
  customerId?: string;
  userId: string;
  parameters?: Record<string, any>;
  message?: string;
  interactionId?: string;
  endConversation?: boolean; // New flag to signal conversation end
  referenceDocumentId?: string; // Document to reference for context
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
    private aiService: AIService,
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
      referenceDocumentId,
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
      if (customerId) {
        console.log('📋 [Skill Executor] Loading customer context for:', customerId);
        const customer = await this.customerRepository.findOne({
          where: { id: customerId },
        });

        if (customer) {
          customerContext = `\n\n[客户信息]\n客户名称: ${customer.name}\n`;
          console.log('✅ [Skill Executor] Found customer:', customer.name);

          // Load customer profile
          const profile = await this.customerProfileRepository.findOne({
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
          } else {
            console.log('⚠️ [Skill Executor] No customer profile found');
          }
        } else {
          console.log('⚠️ [Skill Executor] Customer not found');
        }
      } else {
        console.log('ℹ️ [Skill Executor] No customerId provided');
      }

      // Load reference document
      let documentContext = '';
      if (referenceDocumentId) {
        console.log('📄 [Skill Executor] Loading reference document:', referenceDocumentId);
        const document = await this.documentRepository.findOne({
          where: { id: referenceDocumentId },
        });

        if (document) {
          console.log('✅ [Skill Executor] Found reference document:', document.title);
          documentContext = `\n\n[参考文档]\n标题: ${document.title}\n内容:\n${document.content}\n`;
        } else {
          console.log('⚠️ [Skill Executor] Reference document not found');
        }
      }

      // Prepare AI messages
      const aiMessages: Message[] = [];

      // Add system prompt
      if (skill.system_prompt) {
        aiMessages.push({
          role: 'system',
          content: skill.system_prompt,
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

      // 执行WebSearch获取历史合作信息（仅针对教育行业客户研究技能）\n      // 如果客户已有历史笔记（通过AI自动填充收集），则跳过WebSearch，直接使用已有信息\n      let searchContext = '';\n      const hasExistingHistory = profile?.history_notes && profile.history_notes.trim().length > 0;\n\n      if (skill.slug === 'education-customer-research' && parameters.customer_name) {\n        // 如果已有历史笔记，直接使用，不再进行WebSearch\n        if (hasExistingHistory) {\n          console.log('✅ [Skill Executor] Using existing history_notes from customer profile, skipping WebSearch');\n          searchContext = `\n\n[已有历史合作信息 - 来自客户资料]\n${profile.history_notes}\n\n---\n请基于以上已收集的客户历史合作信息填写"历史合作情况"章节。如果信息完整，请直接整理使用。\n`;\n        } else {\n          try {\n            console.log('🔍 [Skill Executor] ====== WebSearch Started ======');\n          console.log(`   [Skill Executor] Customer: ${parameters.customer_name}`);\n          console.log(`   [Skill Executor] Department: ${parameters.department || 'N/A'}`);\n          \n          const customerName = parameters.customer_name;\n          const department = parameters.department || '';\n          \n          // 构建搜索查询\n          const searchQueries = [\n            `${customerName} WPS 合作`,\n            `${customerName} 金山办公 案例`,\n            `${customerName} WPS 365 中标`,\n            `${customerName} 金山办公 中标`,\n          ];\n          \n          console.log(`   [Skill Executor] Total queries: ${searchQueries.length}`);\n          \n          // 如果指定了部门，添加部门相关搜索\n          if (department) {\n            searchQueries.push(`${customerName} ${department} WPS`);\n          }\n          \n          console.log(`   [Skill Executor] Query list: ${searchQueries.join(' | ')}`);\n          \n          const searchResults = await this.aiService.webSearchMultiple(searchQueries, {\n            searchEngine: 'search_std',\n            count: 5,\n            contentSize: 'medium',\n          });\n          \n          // 统计结果\n          const totalResults = searchResults.reduce((sum, r) => sum + r.results.length, 0);\n          const queriesWithResults = searchResults.filter(r => r.results.length > 0).length;\n          console.log(`   [Skill Executor] Results: ${totalResults} items from ${queriesWithResults}/${searchQueries.length} queries`);\n          \n          // 格式化搜索结果\n          if (totalResults > 0) {\n            searchContext = '\\n\\n[网络搜索结果 - 历史合作信息]\\n\\n';\n            \n            for (const { query, results } of searchResults) {\n              if (results.length > 0) {\n                searchContext += `搜索关键词: "${query}"\\n`;\n                for (const result of results.slice(0, 3)) { // 每个查询取前3条\n                  searchContext += `- [${result.title}](${result.link}): ${result.content.substring(0, 150)}...\\n`;\n                }\n                searchContext += '\\n';\n              }\n            }\n            \n            searchContext += '---\\n请基于以上搜索结果，在"历史合作情况"章节准确填写合作信息。如果搜索结果中没有找到相关合作信息，请明确标注"未查询到公开的WPS合作信息"。\\n';\n            \n            console.log(`✅ [Skill Executor] ====== WebSearch Completed: ${totalResults} results ======`);\n          } else {\n            searchContext = '\\n\\n[网络搜索结果]\\n未查询到公开的WPS合作信息。请在"历史合作情况"章节标注"未查询到公开的WPS合作信息"，并提供市场切入点分析。\\n';\n            console.log('⚠️ [Skill Executor] ====== WebSearch Completed: No results ======');\n          }\n        } catch (error) {\n          console.error('❌ [Skill Executor] ====== WebSearch Failed ======');\n          console.error('   Error:', error);\n          searchContext = '\\n\\n[网络搜索结果]\\n搜索服务暂时不可用。请基于大模型知识填写"历史合作情况"章节，并标注"搜索服务暂不可用，信息基于模型知识"。\\n';\n        }\n      }\n\n      // Add customer and document context\n      if (customerContext || documentContext || searchContext) {\n        aiMessages.push({\n          role: 'user',\n          content: `${customerContext}${documentContext}${searchContext}\\n\\n请基于以上上下文信息回答问题。`,\n        });\n      }\n\n      console.log('🎯 [Skill Executor] Executing skill:', skillId);
      console.log('💬 [Skill Executor] Message count:', aiMessages.length);

      // Stream response from AI
      let fullResponse = '';

      await this.aiService.stream({
        messages: aiMessages,
        system: skill.system_prompt,
        onChunk: (chunk: string) => {
          if (cancelToken.cancelled) return;
          fullResponse += chunk;
          if (onChunk) {
            onChunk(chunk);
          }
        },
        onComplete: async (text: string) => {
          if (cancelToken.cancelled) return;

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
          this.logger.error('AI service error:', error);

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
}
