import { create } from 'zustand';
import type { LtcNode, NodeSkillBinding, Skill } from '../types';

interface LtcConfigState {
  // State
  nodes: LtcNode[];
  bindings: Record<string, NodeSkillBinding[]>; // nodeId -> bindings
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  setNodes: (nodes: LtcNode[]) => void;
  addNode: (node: LtcNode) => void;
  updateNode: (nodeId: string, updates: Partial<LtcNode>) => void;
  removeNode: (nodeId: string) => void;
  reorderNodes: (nodeIds: string[]) => void;

  setBindings: (nodeId: string, bindings: NodeSkillBinding[]) => void;
  addBinding: (nodeId: string, binding: NodeSkillBinding) => void;
  removeBinding: (nodeId: string, bindingId: string) => void;

  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;

  // Getters
  getNodeById: (nodeId: string) => LtcNode | undefined;
  getNodeSkills: (nodeId: string) => Skill[];
}

export const useLtcConfigStore = create<LtcConfigState>()((set, get) => ({
  // Initial state
  nodes: [],
  bindings: {},
  isLoading: false,
  isSaving: false,
  error: null,

  // Actions
  setNodes: (nodes) =>
    set({
      nodes: nodes.sort((a, b) => a.order - b.order),
    }),

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node].sort((a, b) => a.order - b.order),
    })),

  updateNode: (nodeId, updates) =>
    set((state) => ({
      nodes: state.nodes
        .map((node) => (node.id === nodeId ? { ...node, ...updates } : node))
        .sort((a, b) => a.order - b.order),
    })),

  removeNode: (nodeId) =>
    set((state) => {
      const newBindings = { ...state.bindings };
      delete newBindings[nodeId];
      return {
        nodes: state.nodes.filter((node) => node.id !== nodeId),
        bindings: newBindings,
      };
    }),

  reorderNodes: (nodeIds) =>
    set((state) => ({
      nodes: state.nodes
        .map((node) => {
          const newOrder = nodeIds.indexOf(node.id);
          return newOrder >= 0 ? { ...node, order: newOrder } : node;
        })
        .sort((a, b) => a.order - b.order),
    })),

  setBindings: (nodeId, bindings) =>
    set((state) => ({
      bindings: {
        ...state.bindings,
        [nodeId]: bindings,
      },
    })),

  addBinding: (nodeId, binding) =>
    set((state) => ({
      bindings: {
        ...state.bindings,
        [nodeId]: [...(state.bindings[nodeId] || []), binding],
      },
    })),

  removeBinding: (nodeId, bindingId) =>
    set((state) => ({
      bindings: {
        ...state.bindings,
        [nodeId]: (state.bindings[nodeId] || []).filter((b) => b.id !== bindingId),
      },
    })),

  setLoading: (loading) =>
    set({
      isLoading: loading,
    }),

  setSaving: (saving) =>
    set({
      isSaving: saving,
    }),

  setError: (error) =>
    set({
      error,
    }),

  // Getters
  getNodeById: (nodeId) => {
    return get().nodes.find((node) => node.id === nodeId);
  },

  getNodeSkills: (nodeId) => {
    const bindings = get().bindings[nodeId] || [];
    return bindings
      .filter((binding) => binding.skill)
      .map((binding) => binding.skill!)
      .sort((a, b) => {
        const orderA = bindings.find((item) => item.skill_id === a.id)?.order || 0;
        const orderB = bindings.find((item) => item.skill_id === b.id)?.order || 0;
        return orderA - orderB;
      });
  },
}));

// Default LTC nodes configuration（与产品需求文档对齐）
export const DEFAULT_LTC_NODES = [
  { name: '线索', description: '获取潜在客户线索' },
  { name: '商机', description: '验证线索质量和意向' },
  { name: '方案', description: '分析客户需求和设计方案' },
  { name: 'POC', description: '概念验证和产品演示' },
  { name: '商务谈判', description: '价格和合同谈判' },
  { name: '成交签约', description: '签署正式合同' },
  { name: '交付验收', description: '项目交付和客户验收' },
  { name: '运营&增购', description: '售后服务和增购机会' },
];
