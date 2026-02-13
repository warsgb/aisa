import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIService, Message } from '../../common/services/ai.service';
import { Skill } from '../../entities/skill.entity';
import { SkillInteraction, InteractionStatus } from '../../entities/interaction.entity';
import { InteractionMessage, MessageRole } from '../../entities/interaction-message.entity';
import { TeamMember } from '../../entities/team-member.entity';
import { Document } from '../../entities/document.entity';

interface ExecuteSkillOptions {
  skillId: string;
  teamId: string;
  customerId?: string;
  userId: string;
  parameters?: Record<string, any>;
  message?: string;
  interactionId?: string;
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

      // Add parameters context
      if (Object.keys(parameters).length > 0) {
        const paramContext = `\n\n[Parameters]\n${JSON.stringify(parameters, null, 2)}`;
        aiMessages.push({
          role: 'user',
          content: `Use these parameters for context:${paramContext}`,
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
