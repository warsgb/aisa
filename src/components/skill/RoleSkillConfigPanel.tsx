import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api.service';
import type { Skill, TeamRoleSkillConfig, IronTriangleRole } from '../../types';
import { useSkillFilterStore, IRON_TRIANGLE_LABELS } from '../../stores';
import { Save, Loader2, Check } from 'lucide-react';

interface RoleSkillConfigPanelProps {
  skills: Skill[];
}

interface RoleConfig {
  role: IronTriangleRole;
  label: string;
  description: string;
  config: TeamRoleSkillConfig | null;
  selectedSkills: Set<string>;
  isSaving: boolean;
  hasChanges: boolean;
  isResetting: boolean;
}

const ROLES: Array<{ role: IronTriangleRole; label: string; description: string }> = [
  { role: 'AR', label: '客户经理 (AR)', description: '负责客户关系维护和商务谈判' },
  { role: 'SR', label: '解决方案经理 (SR)', description: '负责解决方案设计和技术支持' },
  { role: 'FR', label: '交付经理 (FR)', description: '负责项目交付和售后服务' },
];

export function RoleSkillConfigPanel({ skills }: RoleSkillConfigPanelProps) {
  const { team } = useAuth();
  const { teamRoleSkillConfigs, setTeamRoleSkillConfigs } = useSkillFilterStore();

  const [roleConfigs, setRoleConfigs] = useState<RoleConfig[]>(
    ROLES.map((r) => ({
      role: r.role,
      label: r.label,
      description: r.description,
      config: null,
      selectedSkills: new Set<string>(),
      isSaving: false,
      hasChanges: false,
      isResetting: false,
    }))
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResettingAll, setIsResettingAll] = useState(false);

  // Load role configurations on mount
  useEffect(() => {
    if (!team?.id) return;

    const loadConfigs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const configs = await apiService.getTeamRoleSkillConfigs(team.id);

        // Update store with loaded configs
        const configsMap: Partial<Record<IronTriangleRole, string[]>> = {};
        configs.forEach((c) => {
          configsMap[c.role] = c.default_skill_ids;
        });
        setTeamRoleSkillConfigs(configsMap);

        // Update local state
        setRoleConfigs((prev) =>
          prev.map((rc) => {
            const config = configs.find((c) => c.role === rc.role) || null;
            return {
              ...rc,
              config,
              selectedSkills: new Set(config?.default_skill_ids || []),
              hasChanges: false,
            };
          })
        );
      } catch (err) {
        console.error('Failed to load role skill configs:', err);
        setError('加载角色配置失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfigs();
  }, [team?.id, setTeamRoleSkillConfigs]);

  // Handle skill selection toggle
  const handleToggleSkill = (roleIndex: number, skillId: string) => {
    setRoleConfigs((prev) =>
      prev.map((rc, idx) => {
        if (idx !== roleIndex) return rc;

        const newSelectedSkills = new Set(rc.selectedSkills);
        if (newSelectedSkills.has(skillId)) {
          newSelectedSkills.delete(skillId);
        } else {
          newSelectedSkills.add(skillId);
        }

        return {
          ...rc,
          selectedSkills: newSelectedSkills,
          hasChanges: true,
        };
      })
    );
  };

  // Handle save configuration for a role
  const handleSaveConfig = async (roleIndex: number) => {
    if (!team?.id) return;

    const rc = roleConfigs[roleIndex];

    setRoleConfigs((prev) =>
      prev.map((rc, idx) => (idx === roleIndex ? { ...rc, isSaving: true } : rc))
    );

    try {
      const skillIds = Array.from(rc.selectedSkills);
      const updatedConfig = await apiService.updateTeamRoleSkillConfig(team.id, rc.role, skillIds);

      // Update store
      setTeamRoleSkillConfigs({
        ...teamRoleSkillConfigs,
        [rc.role]: skillIds,
      });

      setRoleConfigs((prev) =>
        prev.map((rc, idx) =>
          idx === roleIndex
            ? {
                ...rc,
                config: updatedConfig,
                isSaving: false,
                hasChanges: false,
              }
            : rc
        )
      );
    } catch (err) {
      console.error('Failed to save role skill config:', err);
      setError('保存配置失败');
      setRoleConfigs((prev) =>
        prev.map((rc, idx) => (idx === roleIndex ? { ...rc, isSaving: false } : rc))
      );
    }
  };

  // Handle reset to system defaults for a role
  const handleResetRole = async (roleIndex: number) => {
    if (!team?.id) return;
    if (!confirm('确定要重置此角色配置为系统默认吗？当前的自定义配置将被覆盖。')) return;

    const rc = roleConfigs[roleIndex];

    setRoleConfigs((prev) =>
      prev.map((rc, idx) => (idx === roleIndex ? { ...rc, isResetting: true } : rc))
    );

    try {
      // First reset all configs
      await apiService.resetTeamRoleSkillConfigs(team.id);

      // Then reload configs
      const configs = await apiService.getTeamRoleSkillConfigs(team.id);

      // Update store
      const configsMap: Partial<Record<IronTriangleRole, string[]>> = {};
      configs.forEach((c) => {
        configsMap[c.role] = c.default_skill_ids;
      });
      setTeamRoleSkillConfigs(configsMap);

      // Update local state
      setRoleConfigs((prev) =>
        prev.map((rc, idx) => {
          const config = configs.find((c) => c.role === rc.role) || null;
          return {
            ...rc,
            config,
            selectedSkills: new Set(config?.default_skill_ids || []),
            hasChanges: false,
            isResetting: false,
          };
        })
      );
    } catch (err) {
      console.error('Failed to reset role config:', err);
      setError('重置配置失败');
      setRoleConfigs((prev) =>
        prev.map((rc, idx) => (idx === roleIndex ? { ...rc, isResetting: false } : rc))
      );
    }
  };

  // Handle reset all to system defaults
  const handleResetAll = async () => {
    if (!team?.id) return;
    if (!confirm('确定要将所有角色配置重置为系统默认吗？所有自定义配置将被覆盖。')) return;

    setIsResettingAll(true);
    setError(null);

    try {
      await apiService.resetTeamRoleSkillConfigs(team.id);

      // Reload configs
      const configs = await apiService.getTeamRoleSkillConfigs(team.id);

      // Update store
      const configsMap: Partial<Record<IronTriangleRole, string[]>> = {};
      configs.forEach((c) => {
        configsMap[c.role] = c.default_skill_ids;
      });
      setTeamRoleSkillConfigs(configsMap);

      // Update local state
      setRoleConfigs((prev) =>
        prev.map((rc) => {
          const config = configs.find((c) => c.role === rc.role) || null;
          return {
            ...rc,
            config,
            selectedSkills: new Set(config?.default_skill_ids || []),
            hasChanges: false,
            isResetting: false,
          };
        })
      );
    } catch (err) {
      console.error('Failed to reset all configs:', err);
      setError('重置配置失败');
    } finally {
      setIsResettingAll(false);
    }
  };

  // Get skills for a role
  const getRoleSkills = (role: IronTriangleRole): Skill[] => {
    const skillIds = teamRoleSkillConfigs[role] || [];
    return skills.filter((s) => skillIds.includes(s.id));
  };

  // Check if a skill is selected for a role
  const isSkillSelected = (roleIndex: number, skillId: string): boolean => {
    return roleConfigs[roleIndex].selectedSkills.has(skillId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">角色技能配置</h2>
          <p className="text-sm text-gray-500">
            为每个铁三角角色（AR/SR/FR）配置默认技能列表。用户点击首页角色按钮时，将只显示该角色的默认技能。
          </p>
        </div>
        <button
          onClick={handleResetAll}
          disabled={isResettingAll}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isResettingAll ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              重置中...
            </>
          ) : (
            '重置为系统默认'
          )}
        </button>
      </div>

      {roleConfigs.map((rc, roleIndex) => (
        <div key={rc.role} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Role Header */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{rc.label}</h3>
                  {rc.config?.source === 'SYSTEM' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                      系统
                    </span>
                  )}
                  {rc.config?.source === 'CUSTOM' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                      自定义
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{rc.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {rc.selectedSkills.size} 个技能
                </span>
                {rc.hasChanges && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    未保存
                  </span>
                )}
                {rc.config && (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    已配置
                  </span>
                )}
                <button
                  onClick={() => handleResetRole(roleIndex)}
                  disabled={rc.isResetting}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                  title="重置为系统默认"
                >
                  {rc.isResetting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    '↺'
                  )}
                  重置
                </button>
                <button
                  onClick={() => handleSaveConfig(roleIndex)}
                  disabled={rc.isSaving || !rc.hasChanges}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {rc.isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      保存配置
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Skills Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {skills.map((skill) => {
                const isSelected = isSkillSelected(roleIndex, skill.id);
                return (
                  <button
                    key={skill.id}
                    onClick={() => handleToggleSkill(roleIndex, skill.id)}
                    disabled={skill.is_enabled === false}
                    className={`
                      p-4 rounded-lg border-2 text-left transition-all
                      ${isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                      ${skill.is_enabled === false ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0
                        ${isSelected
                          ? 'border-primary bg-primary'
                          : 'border-gray-300'
                        }
                      `}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{skill.name}</div>
                        {skill.description && (
                          <div className="text-sm text-gray-500 line-clamp-2 mt-1">{skill.description}</div>
                        )}
                        {skill.category && (
                          <div className="text-xs text-gray-400 mt-2">{skill.category}</div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {skills.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                暂无可用技能
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
