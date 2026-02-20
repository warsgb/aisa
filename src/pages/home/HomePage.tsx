import { useEffect, useState, useCallback } from 'react';
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

  // Load initial data
  useEffect(() => {
    if (!team?.id) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Load customers, LTC nodes, and interactions in parallel
        const [customersData, nodesData, interactionsData] = await Promise.all([
          apiService.getCustomers(team.id),
          apiService.getLtcNodes(team.id).catch(() => [] as LtcNode[]),
          apiService.getInteractions(team.id).catch(() => [] as SkillInteraction[]),
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

        // Sort interactions by created_at desc
        const sortedInteractions = interactionsData.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setInteractions(sortedInteractions);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载数据失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [team?.id, setNodes, setBindings]);

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
    // Refresh interactions list
    if (team?.id) {
      apiService.getInteractions(team.id).then((data) => {
        const sorted = data.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setInteractions(sorted);
      });
    }
  }, [team?.id]);

  if (!team) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <p className="text-gray-500 mb-4">请先加入或创建一个团队</p>
          <Link
            to="/settings"
            className="px-4 py-2 bg-[#1677FF] text-white rounded-lg hover:bg-[#4096FF]"
          >
            前往设置
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LTC 销售流程</h1>
          <p className="text-sm text-gray-500 mt-1">选择客户并执行相应阶段的技能</p>
        </div>
        <Link
          to="/ltc-config"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1677FF] rounded-lg hover:bg-[#4096FF] transition-colors"
        >
          编辑流程
        </Link>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
          <button
            onClick={() => window.location.reload()}
            className="ml-2 underline hover:no-underline"
          >
            重试
          </button>
        </div>
      )}

      {/* Top section: Customer selection + Skill filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Customer selector */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择客户
            </label>
            <CustomerSearchSelect
              customers={customers}
              onSelect={handleCustomerSelect}
              disabled={isLoading}
            />
          </div>

          {/* Skill filter - single toggle button */}
          <div className="lg:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              技能筛选
            </label>
            <button
              onClick={() => setFilterType(filterType === 'FAVORITE' ? 'ALL' : 'FAVORITE')}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-colors
                ${filterType === 'FAVORITE'
                  ? 'bg-[#1677FF] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1677FF] hover:text-[#1677FF]'
                }
              `}
            >
              {filterType === 'FAVORITE' ? '我的常用技能' : '全部技能'}
            </button>
          </div>
        </div>
      </div>

      {/* Middle section: LTC Process Timeline */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">LTC 流程</h2>
          {currentCustomer && (
            <span className="text-sm text-[#1677FF] bg-[#1677FF]/10 px-3 py-1 rounded-full">
              当前客户: {currentCustomer.name}
            </span>
          )}
        </div>

        {!currentCustomer ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#F5F7FA] rounded-xl">
            <span className="text-4xl mb-3">👤</span>
            <p className="text-gray-500 mb-2">请先选择一个客户</p>
            <p className="text-sm text-gray-400">选择客户后可查看和执行相关技能</p>
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

      {/* Bottom section: Interaction History */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">历史记录</h2>
          <Link
            to="/interactions"
            className="text-sm text-[#1677FF] hover:text-[#4096FF] transition-colors"
          >
            查看全部 →
          </Link>
        </div>

        <InteractionTimeline
          interactions={interactions}
          isLoading={isLoading}
          maxItems={5}
        />
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
