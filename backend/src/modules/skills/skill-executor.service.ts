import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIService, Message } from '../../common/services/ai.service';
import { SearchService, SearchResult } from '../../common/services/search.service';
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
