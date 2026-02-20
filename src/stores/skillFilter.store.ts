import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SkillFilterType, IronTriangleRole } from '../types';

interface SkillFilterState {
  // State
  filterType: SkillFilterType;
  favoriteSkillIds: string[];
  isLoading: boolean;

  // Actions
  setFilterType: (filterType: SkillFilterType) => void;
  toggleFavoriteSkill: (skillId: string) => void;
  setFavoriteSkills: (skillIds: string[]) => void;
  isFavoriteSkill: (skillId: string) => boolean;
  setLoading: (loading: boolean) => void;
}

export const useSkillFilterStore = create<SkillFilterState>()(
  persist(
    (set, get) => ({
      // Initial state
      filterType: 'ALL',
      favoriteSkillIds: [],
      isLoading: false,

      // Actions
      setFilterType: (filterType) =>
        set({
          filterType,
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
    }),
    {
      name: 'skill-filter-storage',
      partialize: (state) => ({
        filterType: state.filterType,
        favoriteSkillIds: state.favoriteSkillIds,
      }),
    }
  )
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
