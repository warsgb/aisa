import { create } from 'zustand';
import type { SkillFilterType, IronTriangleRole } from '../types';

interface SkillFilterState {
  // State
  filterType: SkillFilterType;
  roleFilter: IronTriangleRole | 'ALL';
  favoriteSkillIds: string[];
  isLoading: boolean;

  // Team role skill configurations - team_role_skill_configs[role] = skill_ids[]
  teamRoleSkillConfigs: Partial<Record<IronTriangleRole, string[]>>;

  // Actions
  setFilterType: (filterType: SkillFilterType) => void;
  setRoleFilter: (role: IronTriangleRole | 'ALL') => void;
  toggleFavoriteSkill: (skillId: string) => void;
  setFavoriteSkills: (skillIds: string[]) => void;
  isFavoriteSkill: (skillId: string) => boolean;
  setLoading: (loading: boolean) => void;

  // Team role skill configuration actions
  setTeamRoleSkillConfigs: (configs: Partial<Record<IronTriangleRole, string[]>>) => void;
  getRoleDefaultSkills: (role: IronTriangleRole) => string[];
}

export const useSkillFilterStore = create<SkillFilterState>()(
  (set, get) => ({
      // Initial state
      filterType: 'ALL',
      roleFilter: 'ALL',
      favoriteSkillIds: [],
      isLoading: false,
      teamRoleSkillConfigs: {},

      // Actions
      setFilterType: (filterType) =>
        set({
          filterType,
        }),

      setRoleFilter: (roleFilter) =>
        set({
          roleFilter,
        }),

      toggleFavoriteSkill: (skillId) =>
        set((state) => {
          const isFavorite = state.favoriteSkillIds.includes(skillId);
          return {
            favoriteSkillIds: isFavorite
              ? state.favoriteSkillIds.filter((id) => id !== skillId)
              : [...state.favoriteSkillIds, skillId],
          };
        }),

      setFavoriteSkills: (skillIds) =>
        set({
          favoriteSkillIds: skillIds,
        }),

      isFavoriteSkill: (skillId) => {
        return get().favoriteSkillIds.includes(skillId);
      },

      setLoading: (loading) =>
        set({
          isLoading: loading,
        }),

      // Team role skill configuration actions
      setTeamRoleSkillConfigs: (configs) =>
        set({
          teamRoleSkillConfigs: configs,
        }),

      getRoleDefaultSkills: (role) => {
        return get().teamRoleSkillConfigs[role] || [];
      },
    })
);

// Iron Triangle role labels
export const IRON_TRIANGLE_LABELS: Record<IronTriangleRole, string> = {
  AR: '客户经理 (AR)',
  SR: '解决方案经理 (SR)',
  FR: '交付经理 (FR)',
};

// Iron Triangle role descriptions
export const IRON_TRIANGLE_DESCRIPTIONS: Record<IronTriangleRole, string> = {
  AR: '负责客户关系维护和商务谈判',
  SR: '负责解决方案设计和技术支持',
  FR: '负责项目交付和售后服务',
};

// Filter type labels
export const FILTER_TYPE_LABELS: Record<SkillFilterType, string> = {
  FAVORITE: '我的常用技能',
  ALL: '全部技能',
};
