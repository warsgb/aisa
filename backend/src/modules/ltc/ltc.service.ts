import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LtcNode } from '../../entities/ltc-node.entity';
import { NodeSkillBinding } from '../../entities/node-skill-binding.entity';
import { CustomerProfile } from '../../entities/customer-profile.entity';
import { TeamMemberPreference, IronTriangleRole } from '../../entities/team-member-preference.entity';
import { TeamMember } from '../../entities/team-member.entity';
import { Customer } from '../../entities/customer.entity';
import { Skill } from '../../entities/skill.entity';
import { SystemLtcNode } from '../../entities/system-ltc-node.entity';
import { SystemRoleSkillConfig } from '../../entities/system-role-skill-config.entity';
import { TeamRoleSkillConfig } from '../../entities/team-role-skill-config.entity';
import { CreateLtcNodeDto } from './dto/create-ltc-node.dto';
import { UpdateLtcNodeDto } from './dto/update-ltc-node.dto';
import { CreateNodeSkillBindingDto } from './dto/create-node-skill-binding.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { UpdateTeamMemberPreferenceDto } from './dto/update-team-member-preference.dto';

// Default LTC nodes - 产品需求文档确认版本
const DEFAULT_LTC_NODES = [
  { name: '线索', description: '潜在客户发现与初步接触', order: 0 },
  { name: '商机', description: '确认客户需求与购买意向', order: 1 },
  { name: '方案', description: '制定解决方案与POC演示', order: 2 },
  { name: 'POC', description: '产品验证与方案测试', order: 3 },
  { name: '商务谈判', description: '合同条款与价格谈判', order: 4 },
  { name: '成交签约', description: '正式签署合作协议', order: 5 },
  { name: '交付验收', description: '项目实施与验收', order: 6 },
  { name: '运营&增购', description: '客户运营与增购机会', order: 7 },
];

@Injectable()
export class LtcService {
  constructor(
    @InjectRepository(LtcNode)
    private ltcNodeRepository: Repository<LtcNode>,
    @InjectRepository(NodeSkillBinding)
    private nodeSkillBindingRepository: Repository<NodeSkillBinding>,
    @InjectRepository(CustomerProfile)
    private customerProfileRepository: Repository<CustomerProfile>,
    @InjectRepository(TeamMemberPreference)
    private teamMemberPreferenceRepository: Repository<TeamMemberPreference>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    @InjectRepository(SystemLtcNode)
    private systemLtcNodeRepository: Repository<SystemLtcNode>,
    @InjectRepository(SystemRoleSkillConfig)
    private systemRoleSkillConfigRepository: Repository<SystemRoleSkillConfig>,
    @InjectRepository(TeamRoleSkillConfig)
    private teamRoleSkillConfigRepository: Repository<TeamRoleSkillConfig>,
  ) {}

  private async verifyTeamAccess(teamId: string, userId: string): Promise<void> {
    const membership = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this team');
    }
  }

  // LTC Node Management
  async findAllNodes(teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    return this.ltcNodeRepository.find({
      where: { team_id: teamId },
      order: { order: 'ASC' },
    });
  }

  async createNode(teamId: string, userId: string, dto: CreateLtcNodeDto) {
    await this.verifyTeamAccess(teamId, userId);

    const maxOrder = await this.ltcNodeRepository
      .createQueryBuilder('node')
      .where('node.team_id = :teamId', { teamId })
      .select('MAX(node.order)', 'max')
      .getRawOne();

    const node = this.ltcNodeRepository.create({
      team_id: teamId,
      name: dto.name,
      description: dto.description,
      order: dto.order ?? (maxOrder?.max ? parseInt(maxOrder.max) + 1 : 0),
    });

    return this.ltcNodeRepository.save(node);
  }

  async updateNode(teamId: string, nodeId: string, userId: string, dto: UpdateLtcNodeDto) {
    await this.verifyTeamAccess(teamId, userId);

    const node = await this.ltcNodeRepository.findOne({
      where: { id: nodeId, team_id: teamId },
    });

    if (!node) {
      throw new NotFoundException('LTC node not found');
    }

    await this.ltcNodeRepository.update(nodeId, dto);
    return this.ltcNodeRepository.findOne({
      where: { id: nodeId },
      relations: ['skill_bindings', 'skill_bindings.skill'],
    });
  }

  async deleteNode(teamId: string, nodeId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    const node = await this.ltcNodeRepository.findOne({
      where: { id: nodeId, team_id: teamId },
    });

    if (!node) {
      throw new NotFoundException('LTC node not found');
    }

    await this.ltcNodeRepository.delete(nodeId);
    return { message: 'LTC node deleted successfully' };
  }

  async reorderNodes(teamId: string, userId: string, nodeIds: string[]) {
    try {
      await this.verifyTeamAccess(teamId, userId);

      const nodes = await this.ltcNodeRepository.find({
        where: { team_id: teamId, id: In(nodeIds) },
      });

      if (nodes.length !== nodeIds.length) {
        throw new NotFoundException('Some LTC nodes not found');
      }

      for (let i = 0; i < nodeIds.length; i++) {
        await this.ltcNodeRepository.update(nodeIds[i], { order: i });
      }

      return this.findAllNodes(teamId, userId);
    } catch (error) {
      console.error('Error in reorderNodes:', error);
      throw error;
    }
  }

  async resetToDefault(teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    // Delete existing nodes
    await this.ltcNodeRepository.delete({ team_id: teamId });

    // Create default nodes
    const nodes = DEFAULT_LTC_NODES.map((node) =>
      this.ltcNodeRepository.create({
        team_id: teamId,
        ...node,
      }),
    );

    await this.ltcNodeRepository.save(nodes);
    return this.findAllNodes(teamId, userId);
  }

  async resetToSystemDefaults(teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    // 1. Delete all system nodes for this team
    await this.ltcNodeRepository.delete({
      team_id: teamId,
      source: 'SYSTEM',
    });

    // 2. Delete all system role-skill configs for this team
    await this.teamRoleSkillConfigRepository.delete({
      team_id: teamId,
      source: 'SYSTEM',
    });

    // 3. Sync from system defaults
    return this.syncFromSystem(teamId, userId);
  }

  private async syncFromSystem(teamId: string, userId: string) {
    // 1. Get all system LTC nodes
    const systemNodes = await this.systemLtcNodeRepository.find({
      order: { order: 'ASC' },
    });

    // 2. Create team nodes from system templates
    const teamNodes = await Promise.all(
      systemNodes.map((systemNode) =>
        this.ltcNodeRepository.save({
          team_id: teamId,
          name: systemNode.name,
          description: systemNode.description,
          order: systemNode.order,
          source: 'SYSTEM',
          system_node_id: systemNode.id,
        }),
      ),
    );

    // 3. Create skill bindings for each node
    for (let i = 0; i < systemNodes.length; i++) {
      const systemNode = systemNodes[i];
      const teamNode = teamNodes[i];

      let order = 1;
      for (const skillId of systemNode.default_skill_ids) {
        await this.nodeSkillBindingRepository.save({
          node_id: teamNode.id,
          skill_id: skillId,
          order: order++,
        });
      }
    }

    // 4. Sync role-skill configs
    const systemConfigs = await this.systemRoleSkillConfigRepository.find();
    for (const systemConfig of systemConfigs) {
      await this.teamRoleSkillConfigRepository.save({
        team_id: teamId,
        role: systemConfig.role,
        default_skill_ids: systemConfig.default_skill_ids,
        source: 'SYSTEM',
      });
    }

    return this.findAllNodes(teamId, userId);
  }

  // Batch: Get all bindings for all nodes at once (avoids N+1 queries)
  async findAllBindings(teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    // Get all nodes for this team
    const nodes = await this.ltcNodeRepository.find({
      where: { team_id: teamId },
      select: ['id'],
    });

    if (nodes.length === 0) {
      return {};
    }

    // Get all bindings for all nodes in one query with relations
    const nodeIds = nodes.map((n) => n.id);
    const allBindings = await this.nodeSkillBindingRepository.find({
      where: { node_id: In(nodeIds) },
      relations: ['skill'],
      order: { order: 'ASC' },
    });

    // Group bindings by node_id
    const bindingsByNode: Record<string, NodeSkillBinding[]> = {};
    for (const node of nodes) {
      bindingsByNode[node.id] = allBindings.filter(
        (b) => b.node_id === node.id,
      );
    }

    return bindingsByNode;
  }

  // Node-Skill Binding Management
  async findBindings(teamId: string, nodeId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    const node = await this.ltcNodeRepository.findOne({
      where: { id: nodeId, team_id: teamId },
    });

    if (!node) {
      throw new NotFoundException('LTC node not found');
    }

    return this.nodeSkillBindingRepository.find({
      where: { node_id: nodeId },
      relations: ['skill'],
      order: { order: 'ASC' },
    });
  }

  async createBinding(
    teamId: string,
    nodeId: string,
    userId: string,
    dto: CreateNodeSkillBindingDto,
  ) {
    await this.verifyTeamAccess(teamId, userId);

    const node = await this.ltcNodeRepository.findOne({
      where: { id: nodeId, team_id: teamId },
    });

    if (!node) {
      throw new NotFoundException('LTC node not found');
    }

    const skill = await this.skillRepository.findOne({
      where: { id: dto.skill_id },
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    const maxOrder = await this.nodeSkillBindingRepository
      .createQueryBuilder('binding')
      .where('binding.node_id = :nodeId', { nodeId })
      .select('MAX(binding.order)', 'max')
      .getRawOne();

    const binding = this.nodeSkillBindingRepository.create({
      node_id: nodeId,
      skill_id: dto.skill_id,
      order: dto.order ?? (maxOrder?.max ? parseInt(maxOrder.max) + 1 : 0),
    });

    return this.nodeSkillBindingRepository.save(binding);
  }

  async deleteBinding(
    teamId: string,
    nodeId: string,
    bindingId: string,
    userId: string,
  ) {
    await this.verifyTeamAccess(teamId, userId);

    const binding = await this.nodeSkillBindingRepository.findOne({
      where: { id: bindingId, node_id: nodeId },
    });

    if (!binding) {
      throw new NotFoundException('Binding not found');
    }

    await this.nodeSkillBindingRepository.delete(bindingId);
    return { message: 'Binding deleted successfully' };
  }

  // Customer Profile Management
  async findCustomerProfile(
    teamId: string,
    customerId: string,
    userId: string,
  ) {
    await this.verifyTeamAccess(teamId, userId);

    const customer = await this.customerRepository.findOne({
      where: { id: customerId, team_id: teamId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    let profile = await this.customerProfileRepository.findOne({
      where: { customer_id: customerId },
    });

    if (!profile) {
      profile = this.customerProfileRepository.create({
        customer_id: customerId,
      });
      await this.customerProfileRepository.save(profile);
    }

    return profile;
  }

  async updateCustomerProfile(
    teamId: string,
    customerId: string,
    userId: string,
    dto: UpdateCustomerProfileDto,
  ) {
    await this.verifyTeamAccess(teamId, userId);

    const customer = await this.customerRepository.findOne({
      where: { id: customerId, team_id: teamId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    let profile = await this.customerProfileRepository.findOne({
      where: { customer_id: customerId },
    });

    if (!profile) {
      profile = this.customerProfileRepository.create({
        customer_id: customerId,
        ...dto,
      });
    } else {
      Object.assign(profile, dto);
    }

    return this.customerProfileRepository.save(profile);
  }

  // Team Member Preference Management
  async findTeamMemberPreference(
    teamId: string,
    memberId: string,
    userId: string,
  ) {
    await this.verifyTeamAccess(teamId, userId);

    const member = await this.teamMemberRepository.findOne({
      where: { id: memberId, team_id: teamId },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    let preference = await this.teamMemberPreferenceRepository.findOne({
      where: { team_member_id: memberId },
    });

    if (!preference) {
      preference = this.teamMemberPreferenceRepository.create({
        team_member_id: memberId,
      });
      await this.teamMemberPreferenceRepository.save(preference);
    }

    return preference;
  }

  async updateTeamMemberPreference(
    teamId: string,
    memberId: string,
    userId: string,
    dto: UpdateTeamMemberPreferenceDto,
  ) {
    await this.verifyTeamAccess(teamId, userId);

    const member = await this.teamMemberRepository.findOne({
      where: { id: memberId, team_id: teamId },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    let preference = await this.teamMemberPreferenceRepository.findOne({
      where: { team_member_id: memberId },
    });

    if (!preference) {
      preference = this.teamMemberPreferenceRepository.create({
        team_member_id: memberId,
        ...dto,
      });
    } else {
      Object.assign(preference, dto);
    }

    return this.teamMemberPreferenceRepository.save(preference);
  }

  // Home Page Aggregate Data
  async getHomeData(teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    // Get current team member
    const teamMember = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    // Get customers
    const customers = await this.customerRepository.find({
      where: { team_id: teamId },
      order: { updated_at: 'DESC' },
    });

    // Get LTC nodes with bindings
    const ltcNodes = await this.ltcNodeRepository.find({
      where: { team_id: teamId },
      order: { order: 'ASC' },
      relations: ['skill_bindings', 'skill_bindings.skill'],
    });

    // Get team member preference
    let preference: TeamMemberPreference | null = null;
    if (teamMember) {
      preference = await this.teamMemberPreferenceRepository.findOne({
        where: { team_member_id: teamMember.id },
      });
    }

    // Get favorite skills if preference exists
    let favoriteSkills: Skill[] = [];
    if (preference?.favorite_skill_ids?.length) {
      favoriteSkills = await this.skillRepository.find({
        where: { id: In(preference.favorite_skill_ids) },
      });
    }

    return {
      customers,
      ltc_nodes: ltcNodes,
      preference,
      favorite_skills: favoriteSkills,
    };
  }
}
