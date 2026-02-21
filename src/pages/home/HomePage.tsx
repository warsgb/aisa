import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import {
  useCurrentCustomerStore,
  useLtcConfigStore,
  useSkillFilterStore,
} from '../../stores';
import type { Customer, Skill, SkillInteraction, LtcNode } from '../../types';

import { CustomerSearchSelect } from '../../components/customer/CustomerSearchSelect';
import { LtcProcessTimeline } from '../../components/ltc/LtcProcessTimeline';
import { InteractionTimeline } from '../../components/interaction/InteractionTimeline';
import { SkillExecuteModal } from '../../components/skill/SkillExecuteModal';
import {
  Users,
  Workflow,
  Settings,
  Star,
  ChevronRight,
} from 'lucide-react';

export default function HomePage() {
  const { team } = useAuth();
  const {
    currentCustomer,
    setCurrentCustomer,
    setCustomerProfile,
  } = useCurrentCustomerStore();
  const { nodes, bindings, setNodes, setBindings } = useLtcConfigStore();
  const { filterType, setFilterType, isFavoriteSkill } = useSkillFilterStore();

  // Local state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [interactions, setInteractions] = useState<SkillInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  // Skill execute modal state
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);

  // Process bindings to group skills by node, with filter applied
  const processedBindings = nodes.reduce<Record<string, Skill[]>>((acc, node) => {
    const nodeBindings = bindings[node.id] || [];
    let skills = nodeBindings
      .map((b) => b.skill)
      .filter((s): s is Skill => !!s);

    // Apply filter: if FAVORITE, only show favorite skills
    if (filterType === 'FAVORITE') {
      skills = skills.filter((skill) => isFavoriteSkill(skill.id));
    }

    acc[node.id] = skills;
    return acc;
  }, {});

  // Load initial data (only load customers and nodes, interactions will be loaded separately)
  useEffect(() => {
    if (!team?.id) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Load customers, LTC nodes (interactions loaded separately)
        const [customersData, nodesData] = await Promise.all([
          apiService.getCustomers(team.id),
          apiService.getLtcNodes(team.id).catch(() => [] as LtcNode[]),
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
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 mb-4">请先加入或创建一个团队</p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1677FF] text-white rounded-lg hover:bg-[#4096FF] transition-colors"
          >
            <Settings className="w-4 h-4" />
            前往设置
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Top navigation bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Customer selector */}
          <div className="flex-1 max-w-md">
            <CustomerSearchSelect
              customers={customers}
              onSelect={handleCustomerSelect}
              disabled={isLoading}
            />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Skill filter toggle */}
            <button
              onClick={() => setFilterType(filterType === 'FAVORITE' ? 'ALL' : 'FAVORITE')}
              className={`
                inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                ${filterType === 'FAVORITE'
                  ? 'bg-[#1677FF] text-white shadow-md shadow-[#1677FF]/25'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1677FF] hover:text-[#1677FF]'
                }
              `}
            >
              <Star className={`w-4 h-4 ${filterType === 'FAVORITE' ? 'fill-current' : ''}`} />
              {filterType === 'FAVORITE' ? '我的常用' : '全部技能'}
            </button>

            {/* LTC Config button */}
            <Link
              to="/ltc-config"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-[#1677FF] hover:text-[#1677FF] transition-all duration-200"
            >
              <Workflow className="w-4 h-4" />
              配置流程
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="p-6 space-y-6">
        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* Customer indicator */}
        {currentCustomer && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="text-gray-400">当前客户:</span>
            <span className="font-medium text-gray-900">{currentCustomer.name}</span>
            {currentCustomer.industry && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500">{currentCustomer.industry}</span>
              </>
            )}
          </div>
        )}

        {/* LTC Process Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#1677FF] rounded-lg flex items-center justify-center">
                <Workflow className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">LTC 销售流程</h2>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{nodes.length} 个阶段</span>
              {currentCustomer && (
                <span className="text-[#1677FF] bg-[#1677FF]/10 px-3 py-1 rounded-full">
                  {currentCustomer.name}
                </span>
              )}
            </div>
          </div>

          <div className="p-6">
            {!currentCustomer ? (
              <div className="flex flex-col items-center justify-center py-16 bg-[#F5F7FA] rounded-xl">
                <div className="w-16 h-16 mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium mb-1">请选择客户开始</p>
                <p className="text-sm text-gray-400">从上方下拉菜单选择客户后，可查看和执行相关技能</p>
              </div>
            ) : (
              <LtcProcessTimeline
                nodes={nodes}
                bindings={processedBindings}
                onSkillExecute={handleSkillExecute}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>

        {/* Interaction History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">历史交互</h2>
                {currentCustomer && (
                  <p className="text-xs text-gray-400 mt-0.5">仅显示 {currentCustomer.name} 的记录</p>
                )}
              </div>
              <span className="text-sm text-gray-400">({interactions.length})</span>
            </div>
            <Link
              to="/interactions"
              className="inline-flex items-center gap-1 text-sm text-[#1677FF] hover:text-[#4096FF] transition-colors"
            >
              查看全部
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="p-6">
            <InteractionTimeline
              interactions={interactions}
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
