import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill } from '../../entities/skill.entity';
import { SkillLoaderService } from './skill-loader.service';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    private skillLoaderService: SkillLoaderService,
  ) {}

  async findAll() {
    return this.skillRepository.find({
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const skill = await this.skillRepository.findOne({ where: { id } });
    if (!skill) {
      return null;
    }
    return skill;
  }

  async findBySlug(slug: string) {
    return this.skillRepository.findOne({ where: { slug } });
  }

  async syncSkills() {
    await this.skillLoaderService.syncSkillsToDatabase();
    return { message: 'Skills synced successfully' };
  }
}
