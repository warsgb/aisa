import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkillInteraction } from '../../entities/interaction.entity';
import { InteractionMessage } from '../../entities/interaction-message.entity';
import { TeamMember } from '../../entities/team-member.entity';

@Injectable()
export class InteractionsService {
  constructor(
    @InjectRepository(SkillInteraction)
    private interactionRepository: Repository<SkillInteraction>,
    @InjectRepository(InteractionMessage)
    private messageRepository: Repository<InteractionMessage>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
  ) {}

  private async verifyTeamAccess(teamId: string, userId: string): Promise<void> {
    const membership = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this team');
    }
  }

  async findAll(teamId: string, userId: string, filters?: { customerId?: string; skillId?: string }) {
    await this.verifyTeamAccess(teamId, userId);

    const where: any = { team_id: teamId };

    if (filters?.customerId) {
      where.customer_id = filters.customerId;
    }

    if (filters?.skillId) {
      where.skill_id = filters.skillId;
    }

    const interactions = await this.interactionRepository.find({
      where,
      relations: ['skill', 'customer'],
      order: { created_at: 'DESC' },
    });

    return interactions;
  }

  async findOne(id: string, teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    const interaction = await this.interactionRepository.findOne({
      where: { id, team_id: teamId },
      relations: ['skill', 'customer', 'messages'],
    });

    if (!interaction) {
      throw new NotFoundException('Interaction not found');
    }

    return interaction;
  }

  async getMessages(id: string, teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    const interaction = await this.interactionRepository.findOne({
      where: { id, team_id: teamId },
    });

    if (!interaction) {
      throw new NotFoundException('Interaction not found');
    }

    const messages = await this.messageRepository.find({
      where: { interaction_id: id },
      order: { turn: 'ASC' },
    });

    return messages;
  }

  async updateMessage(id: string, messageId: string, teamId: string, userId: string, content: string) {
    await this.verifyTeamAccess(teamId, userId);

    const interaction = await this.interactionRepository.findOne({
      where: { id, team_id: teamId },
    });

    if (!interaction) {
      throw new NotFoundException('Interaction not found');
    }

    const message = await this.messageRepository.findOne({
      where: { id: messageId, interaction_id: id },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    message.content = content;
    message.metadata = { ...message.metadata, edited: true, edited_at: new Date().toISOString() };

    await this.messageRepository.save(message);

    return { success: true };
  }
}
