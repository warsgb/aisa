import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import {
  useCurrentCustomerStore,
  useLtcConfigStore,
  useSkillFilterStore,
} from '../../stores';
import type { Customer, Skill, SkillInteraction, LtcNode, IronTriangleRole, TeamRoleSkillConfig } from '../../types';

import { CustomerSearchSelect, RoleFilterTab } from '../../components/customer';
import { LtcProcessTimeline } from '../../components/ltc/LtcProcessTimeline';
import { InteractionTimeline } from '../../components/interaction/InteractionTimeline';
import { SkillExecuteModal } from '../../components/skill/SkillExecuteModal';
import {
  Users,
  Workflow,
  Settings,
  Star,
  ChevronRight,
  Sparkles,
  Timer,
  Target,
} from 'lucide-react';

export function DesktopHomePage() {
  const { team } = useAuth();
  const {
    currentCustomer,
    setCurrentCustomer,
    setCustomerProfile,
  } = useCurrentCustomerStore();
  const { nodes, bindings, setNodes, setBindings } = useLtcConfigStore();
  const { filterType, roleFilter, isFavoriteSkill, setFilterType, setRoleFilter } = useSkillFilterStore();

  // Local state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [interactions, setInteractions] = useState<SkillInteraction[]>([]);
  const [roleSkillConfigs, setRoleSkillConfigs] = useState<Partial<Record<IronTriangleRole, string[]>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  // Skill execute modal state
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);

  // Process bindings to group skills by node, with filter applied
  const processedBindings = useMemo(() => {
    return nodes.reduce<Record<string, Skill[]>>((acc, node) => {
      const nodeBindings = bindings[node.id] || [];
      let skills = nodeBindings
        .map((b) => b.skill)
        .filter((s): s is Skill => !!s);

      // Apply role filter: if a specific role is selected, only show that role's default skills
      if (roleFilter !== 'ALL') {
        const roleSkillIds = roleSkillConfigs[roleFilter as IronTriangleRole] || [];
        skills = skills.filter((skill) => roleSkillIds.includes(skill.id));
      }
      // Apply favorite filter: if FAVORITE, only show favorite skills
      else if (filterType === 'FAVORITE') {
        skills = skills.filter((skill) => isFavoriteSkill(skill.id));
      }

      acc[node.id] = skills;
      return acc;
    }, {});
  }, [nodes, bindings, filterType, isFavoriteSkill, roleFilter]);

  // Calculate skill usage counts
  const skillUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    interactions.forEach((interaction) => {
      if (interaction.skill_id) {
        counts[interaction.skill_id] = (counts[interaction.skill_id] || 0) + 1;
      }
    });
    return counts;
  }, [interactions]);

  // Calculate executed skills for current customer (green button state)
  const executedSkillIds = useMemo(() => {
    const executed = new Set<string>();
    interactions.forEach((interaction) => {
      // Only count interactions for the current customer and completed status
      if (interaction.skill_id && interaction.status === 'COMPLETED') {
        executed.add(interaction.skill_id);
      }
    });
    return executed;
  }, [interactions]);

  // Create LTC nodes map for timeline
  const ltcNodesMap = useMemo(() => {
    return nodes.reduce((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {} as Record<string, LtcNode>);
  }, [nodes]);

  // Load initial data (only load customers and nodes, interactions will be loaded separately)
  useEffect(() => {
    if (!team?.id) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Load customers, LTC nodes, and role skill configs (interactions loaded separately)
        const [customersData, nodesData, roleConfigsData] = await Promise.all([
          apiService.getCustomers(team.id),
          apiService.getLtcNodes(team.id).catch(() => [] as LtcNode[]),
          apiService.getTeamRoleSkillConfigs(team.id).catch(() => [] as any[]),
        ]);

        setCustomers(customersData);

        // Sort nodes by order
        const sortedNodes = nodesData.sort((a, b) => a.order - b.order);
        setNodes(sortedNodes);

        // Load bindings for each node
        const bindingsMap: Record<string, any[]> = {};
        await Promise.all(
          sortedNodes.map(async (node) => {
            try {
              const nodeBindings = await apiService.getNodeSkillBindings(team.id, node.id);
              bindingsMap[node.id] = nodeBindings;
            } catch {
              bindingsMap[node.id] = [];
            }
          })
        );
        // Update bindings for each node individually
        Object.entries(bindingsMap).forEach(([nodeId, nodeBindings]) => {
          setBindings(nodeId, nodeBindings ?? []);
        });

        // Store role skill configs for filtering
        const configsMap: Partial<Record<IronTriangleRole, string[]>> = {};
        roleConfigsData.forEach((c: TeamRoleSkillConfig) => {
          if (c.role && c.default_skill_ids) {
            configsMap[c.role] = c.default_skill_ids;
          }
        });
        setRoleSkillConfigs(configsMap);

        hasInitialized.current = true;
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载数据失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [team?.id, setNodes, setBindings]);

  // Filter interactions when customer changes or after initial load completes
  useEffect(() => {
    if (!team?.id) return;

    // Wait for hasInitialized to be set and persist to be hydrated
    const timer = setTimeout(() => {
      const loadFilteredInteractions = async () => {
        try {
          const interactionsData = await apiService.getInteractions(
            team.id,
            currentCustomer ? { customerId: currentCustomer.id } : undefined
          );
          const sortedInteractions = interactionsData.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setInteractions(sortedInteractions);
        } catch (err) {
          console.error('Failed to load filtered interactions:', err);
        }
      };

      loadFilteredInteractions();
    }, 100); // Small delay to ensure persist is hydrated

    return () => clearTimeout(timer);
  }, [team?.id, currentCustomer]);

  // Handle customer selection
  const handleCustomerSelect = useCallback(async (customer: Customer | null) => {
    console.log('[HomePage] handleCustomerSelect called with:', customer);
    setCurrentCustomer(customer);

    if (customer && team?.id) {
      try {
        const profile = await apiService.getCustomerProfile(team.id, customer.id);
        setCustomerProfile(profile);
      } catch {
        // Profile may not exist yet
        setCustomerProfile(null);
      }
    } else {
      setCustomerProfile(null);
    }

    // Reload interactions filtered by selected customer
    if (team?.id) {
      try {
        const interactionsData = await apiService.getInteractions(
          team.id,
          customer ? { customerId: customer.id } : undefined
        );
        const sortedInteractions = interactionsData.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setInteractions(sortedInteractions);
      } catch (err) {
        console.error('Failed to load interactions:', err);
      }
    }
  }, [team?.id, setCurrentCustomer, setCustomerProfile]);

  // Handle skill execute
  const handleSkillExecute = useCallback((skill: Skill, nodeId?: string) => {
    setSelectedSkill(skill);
    setSelectedNodeId(nodeId);
    setIsExecuteModalOpen(true);
  }, []);

  // Handle execute modal close
  const handleExecuteModalClose = useCallback(() => {
    setIsExecuteModalOpen(false);
    setSelectedSkill(null);
    setSelectedNodeId(undefined);
  }, []);

  // Handle execute complete
  const handleExecuteComplete = useCallback((_interactionId: string) => {
    // Refresh interactions list, filtered by current customer
    if (team?.id) {
      apiService.getInteractions(
        team.id,
        currentCustomer ? { customerId: currentCustomer.id } : undefined
      ).then((data) => {
        const sorted = data.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setInteractions(sorted);
      });
    }
  }, [team?.id, currentCustomer]);

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#1677FF]/10 to-[#1677FF]/5 rounded-2xl flex items-center justify-center border border-[#1677FF]/10">
            <Users className="w-10 h-10 text-[#1677FF]/40" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">欢迎使用 Win-AI</h2>
          <p className="text-gray-500 mb-8">请先加入或创建一个团队，开始您的智能销售旅程</p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1677FF] text-white rounded-xl hover:bg-[#4096FF] transition-all duration-200 shadow-lg shadow-[#1677FF]/30 font-medium"
          >
            <Settings className="w-5 h-5" />
            前往设置
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Top navigation bar */}
      <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* First row: Customer selector */}
            <div className="flex items-center gap-2">
              <CustomerSearchSelect
                customers={customers}
                onSelect={handleCustomerSelect}
                disabled={isLoading}
                value={currentCustomer}
              />
            </div>

            {/* Second row: Role filter + Skill filter + Config button */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <RoleFilterTab
                  activeRole={roleFilter}
                  onRoleChange={setRoleFilter}
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setFilterType(filterType === 'FAVORITE' ? 'ALL' : 'FAVORITE')}
                  className={`
                    relative inline-flex items-center justify-center w-11 h-11 text-sm font-medium rounded-xl transition-all duration-200
                    ${filterType === 'FAVORITE'
                      ? 'bg-[#1677FF] text-white shadow-lg shadow-[#1677FF]/30'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1677FF]/30 hover:text-[#1677FF] hover:shadow-md'
                    }
                  `}
                  title={filterType === 'FAVORITE' ? '显示全部技能' : '显示我的常用技能'}
                >
                  <Star className={`w-5 h-5 ${filterType === 'FAVORITE' ? 'fill-current' : ''}`} />
                  {filterType === 'FAVORITE' && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </button>

                {/* LTC Config button - icon only on mobile */}
                <Link
                  to="/ltc-config"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-[#1677FF]/30 hover:text-[#1677FF] hover:shadow-md transition-all duration-200"
                >
                  <Workflow className="w-4 h-4 sm:hidden" />
                  <span className="hidden sm:inline">配置流程</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1800px] mx-auto p-6 space-y-6">
        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs bg-red-100 hover:bg-red-200 rounded-xl transition-colors font-medium"
            >
              重试
            </button>
          </div>
        )}


        {/* LTC Process Timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-white to-gray-50/50">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-gradient-to-br from-[#1677FF] to-[#4096FF] rounded-xl flex items-center justify-center shadow-lg shadow-[#1677FF]/30">
                <Workflow className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">LTC 销售流程</h2>
                <p className="text-xs text-gray-400 mt-0.5">Lead to Cash 全流程管理</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl">
                <Sparkles className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">{nodes.length} 个阶段</span>
              </div>
              {currentCustomer && (
                <div className="flex items-center gap-2 px-4 py-1.5 bg-[#1677FF]/10 rounded-xl border border-[#1677FF]/20">
                  <Target className="w-4 h-4 text-[#1677FF]" />
                  <span className="text-sm font-semibold text-[#1677FF]">{currentCustomer.name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {!currentCustomer ? (
              <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl border-2 border-dashed border-gray-200">
                <div className="w-20 h-20 mb-6 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center border border-gray-200">
                  <Users className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">请选择客户开始</h3>
                <p className="text-sm text-gray-500 text-center max-w-md">从上方下拉菜单选择客户后，可查看专属销售流程并执行相关技能</p>
              </div>
            ) : (
              <LtcProcessTimeline
                nodes={nodes}
                bindings={processedBindings}
                skillUsageCounts={skillUsageCounts}
                executedSkillIds={executedSkillIds}
                onSkillExecute={handleSkillExecute}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>

        {/* Interaction History */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-white to-gray-50/50">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl flex items-center justify-center border border-gray-200">
                <Timer className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">历史交互</h2>
                {currentCustomer && (
                  <p className="text-xs text-gray-400 mt-0.5">仅显示 {currentCustomer.name} 的记录</p>
                )}
              </div>
              <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg">
                {interactions.length}
              </span>
            </div>
            <Link
              to="/interactions"
              className="group inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#1677FF] bg-[#1677FF]/5 rounded-xl hover:bg-[#1677FF]/10 transition-all duration-200"
            >
              查看全部
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="p-6">
            <InteractionTimeline
              interactions={interactions}
              ltcNodesMap={ltcNodesMap}
              isLoading={isLoading}
              maxItems={5}
            />
          </div>
        </div>
      </div>

      {/* Skill Execute Modal */}
      <SkillExecuteModal
        skill={selectedSkill}
        nodeId={selectedNodeId}
        isOpen={isExecuteModalOpen}
        onClose={handleExecuteModalClose}
        onComplete={handleExecuteComplete}
      />
    </div>
  );
}

// Default export for backward compatibility
export default function HomePage() {
  return <DesktopHomePage />;
}
