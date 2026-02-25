import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useCurrentCustomerStore } from '../../../stores/currentCustomer.store';
import { useLtcConfigStore } from '../../../stores/ltcConfig.store';
import { apiService } from '../../../services/api.service';
import type { Customer, Skill, SkillInteraction } from '../../../types';
import { CustomerCarousel } from '../../../components/mobile/CustomerCarousel';
import { LtcGrid } from '../../../components/mobile/LtcGrid';
import { HotSkills } from '../../../components/mobile/HotSkills';
import { RecentRecords } from '../../../components/mobile/RecentRecords';
import { SkillExecuteModal } from '../../../components/skill/SkillExecuteModal';
import { X, ChevronDown, Users } from 'lucide-react';

/**
 * Workspace Tab Page - Main mobile workspace
 * Displays customer carousel, quick stats, LTC grid, hot skills, and recent records
 */
export function WorkspaceTabPage() {
  const { user, team } = useAuth();
  const { clearCustomer } = useCurrentCustomerStore();
  const { nodes, setNodes } = useLtcConfigStore();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [interactions, setInteractions] = useState<SkillInteraction[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [showAllSkillsModal, setShowAllSkillsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Team switcher state
  const [showTeamSwitcher, setShowTeamSwitcher] = useState(false);
  const [teams, setTeams] = useState<{id: string; name: string; role: string}[]>([]);
  const [isLoadingTeams] = useState(false);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!team) return;
      setIsLoading(true);
      try {
        const [customersData, interactionsData, skillsData, ltcNodes] = await Promise.all([
          apiService.getCustomers(team.id),
          apiService.getInteractions(team.id),
          apiService.getSkills(true),
          apiService.getLtcNodes(team.id),
        ]);

        setCustomers(customersData);
        setInteractions(interactionsData.slice(0, 10)); // Last 10 interactions
        setAllSkills(skillsData.filter((s) => s.is_enabled !== false));

        // Load LTC nodes into store
        if (ltcNodes.length > 0) {
          setNodes(ltcNodes);
        }

        // Load node-skill bindings using batch API (optimization: avoids N+1 queries)
        try {
          const allBindings = await apiService.getAllNodeBindings(team.id);
          Object.entries(allBindings).forEach(([nodeId, nodeBindings]) => {
            useLtcConfigStore.getState().setBindings(nodeId, nodeBindings);
          });
        } catch {
          // Fallback to parallel requests if batch API fails
          await Promise.all(
            ltcNodes.map(async (node) => {
              try {
                const bindings = await apiService.getNodeSkillBindings(team.id, node.id);
                useLtcConfigStore.getState().setBindings(node.id, bindings);
              } catch {
                useLtcConfigStore.getState().setBindings(node.id, []);
              }
            })
          );
        }
      } catch (error) {
        console.error('Failed to load workspace data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [team, setNodes]);

  // Load teams for switcher
  useEffect(() => {
    const loadTeams = async () => {
      if (!user) return;
      try {
        const userTeams = await apiService.getTeams();
        setTeams(userTeams);
      } catch (error) {
        console.error('Failed to load teams:', error);
      }
    };
    loadTeams();
  }, [user]);

  // Handle team switch
  const handleTeamSwitch = async (selectedTeamId: string) => {
    try {
      clearCustomer();
      localStorage.removeItem('current-customer-storage');
      const response = await apiService.switchTeam(selectedTeamId);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      setShowTeamSwitcher(false);
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Failed to switch team:', error);
    }
  };

  // Handle skill execution completion
  const handleSkillComplete = useCallback(async () => {
    if (!team) return;
    try {
      const updatedInteractions = await apiService.getInteractions(team.id);
      setInteractions(updatedInteractions.slice(0, 10));
    } catch (error) {
      console.error('Failed to refresh interactions:', error);
    }
  }, [team]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-2">
      {/* Team Switcher Button - only show if user has multiple teams */}
      {teams.length > 1 && (
        <div className="px-1">
          <button
            onClick={() => setShowTeamSwitcher(true)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <div className="text-xs text-gray-500">当前团队</div>
                <div className="text-sm font-semibold text-gray-900">{team?.name}</div>
              </div>
            </div>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      )}

      {/* Customer Carousel */}
      <CustomerCarousel customers={customers} />

      {/* LTC Grid */}
      <LtcGrid nodes={nodes} onSkillSelect={setSelectedSkill} />

      {/* Hot Skills */}
      <HotSkills
        skills={allSkills}
        interactions={interactions}
        onSkillExecute={(skill) => setSelectedSkill(skill)}
        onShowAllSkills={() => setShowAllSkillsModal(true)}
      />

      {/* Recent Records */}
      <RecentRecords interactions={interactions} />

      {/* Skill Execute Modal */}
      <SkillExecuteModal
        skill={selectedSkill}
        isOpen={!!selectedSkill}
        onClose={() => setSelectedSkill(null)}
        onComplete={handleSkillComplete}
      />

      {/* All Skills Modal */}
      {showAllSkillsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full h-[85vh] sm:h-auto sm:max-w-lg sm:rounded-xl shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">全部技能</h2>
              <button
                onClick={() => setShowAllSkillsModal(false)}
                className="p-2 -mr-2 text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Skills List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {allSkills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => {
                      setShowAllSkillsModal(false);
                      setSelectedSkill(skill);
                    }}
                    className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{skill.name}</h3>
                        {skill.description && (
                          <p className="text-sm text-gray-500 mt-1">{skill.description}</p>
                        )}
                      </div>
                      {skill.parameters && skill.parameters.length > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full ml-2">
                          {skill.parameters.length}个参数
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Switcher Modal */}
      {showTeamSwitcher && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full h-[60vh] sm:h-auto sm:max-w-md sm:rounded-xl shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">切换团队</h2>
              <button
                onClick={() => setShowTeamSwitcher(false)}
                className="p-2 -mr-2 text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Teams List */}
            <div className="flex-1 overflow-y-auto p-2">
              {isLoadingTeams ? (
                <div className="text-center py-8 text-gray-500">加载中...</div>
              ) : (
                <div className="space-y-1">
                  {teams.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleTeamSwitch(t.id)}
                      className={`
                        w-full flex items-center justify-between p-4 rounded-xl transition-colors
                        ${team?.id === t.id
                          ? 'bg-blue-50 border-2 border-[#1677FF]'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          team?.id === t.id
                            ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                            : 'bg-gradient-to-br from-gray-300 to-gray-500'
                        }`}>
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-gray-900">{t.name}</div>
                          <div className="text-xs text-gray-500">
                            {t.role === 'OWNER' ? '所有者' : t.role === 'ADMIN' ? '管理员' : '成员'}
                          </div>
                        </div>
                      </div>
                      {team?.id === t.id && (
                        <div className="w-5 h-5 bg-[#1677FF] rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
