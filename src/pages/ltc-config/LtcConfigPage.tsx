import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { apiService } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import { useLtcConfigStore } from '../../stores';
import type { LtcNode, Skill, NodeSkillBinding } from '../../types';
import {
  GripVertical,
  Edit,
  Trash2,
  Plus,
  RotateCcw,
  Sparkles,
  Workflow,
  Check,
  X,
  Save,
  Layers,
  Zap,
} from 'lucide-react';

// Sortable Node Item Component
interface SortableNodeItemProps {
  node: LtcNode;
  index: number;
  isSelected: boolean;
  onSelect: (node: LtcNode) => void;
  onEdit: (node: LtcNode) => void;
  onDelete: (node: LtcNode) => void;
}

function SortableNodeItem({ node, index, isSelected, onSelect, onEdit, onDelete }: SortableNodeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
        ${isSelected ? 'border-[#1677FF] bg-gradient-to-r from-[#1677FF]/5 to-transparent shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}
        ${isDragging ? 'opacity-50 shadow-xl scale-105' : ''}
      `}
      onClick={() => onSelect(node)}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-5 h-5" />
      </button>

      {/* Step number */}
      <span className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-50 text-gray-700 text-sm font-bold rounded-xl border border-gray-200 shadow-sm">
        {index + 1}
      </span>

      {/* Node info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold truncate ${isSelected ? 'text-[#1677FF]' : 'text-gray-900'}`}>{node.name}</span>
          {node.source === 'SYSTEM' && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3 h-3 mr-1" />
              系统
            </span>
          )}
          {node.source === 'CUSTOM' && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              <Zap className="w-3 h-3 mr-1" />
              自定义
            </span>
          )}
        </div>
        {node.description && (
          <div className="text-xs text-gray-500 truncate mt-1">{node.description}</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(node);
          }}
          className="p-2 text-gray-400 hover:text-[#1677FF] hover:bg-[#1677FF]/5 rounded-xl transition-colors"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(node);
          }}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function LtcConfigPage() {
  const { team } = useAuth();
  const { nodes, bindings, setNodes, setBindings, setSaving } = useLtcConfigStore();

  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setLocalError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<LtcNode | null>(null);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<LtcNode | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load data
  useEffect(() => {
    if (!team?.id) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [nodesData, skillsData] = await Promise.all([
          apiService.getLtcNodes(team.id),
          apiService.getSkills(),
        ]);

        const sortedNodes = nodesData.sort((a, b) => a.order - b.order);
        setNodes(sortedNodes);
        setAllSkills(skillsData);

        // Try batch API first (optimization: avoids N+1 queries), fallback to parallel requests
        let bindingsMap: Record<string, NodeSkillBinding[]> = {};
        try {
          const allBindings = await apiService.getAllNodeBindings(team.id);
          bindingsMap = allBindings;
        } catch {
          // Fallback: load bindings for each node in parallel
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
        }
        // Update bindings for each node
        Object.entries(bindingsMap).forEach(([nodeId, nodeBindings]) => {
          setBindings(nodeId, nodeBindings ?? []);
        });
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : '加载数据失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [team?.id, setNodes, setBindings]);

  // Drag end handler
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = nodes.findIndex((n) => n.id === active.id);
      const newIndex = nodes.findIndex((n) => n.id === over.id);

      const newNodes = arrayMove(nodes, oldIndex, newIndex).map((node, index) => ({
        ...node,
        order: index,
      }));

      // Save to server
      if (team?.id) {
        try {
          setSaving(true);
          // Call API and get updated nodes from server
          const updatedNodes = await apiService.reorderLtcNodes(team.id, {
            node_ids: newNodes.map((n) => n.id)
          });
          // Use server response to update state
          setNodes(updatedNodes.sort((a, b) => a.order - b.order));
        } catch (err) {
          // If API fails, still update local state for better UX
          setNodes(newNodes);
          setLocalError(err instanceof Error ? err.message : '保存顺序失败');
        } finally {
          setSaving(false);
        }
      } else {
        setNodes(newNodes);
      }
    }
  }, [team?.id, setNodes, setSaving]);

  // Add new node
  const handleAddNode = useCallback(async () => {
    if (!team?.id) return;

    const newOrder = nodes.length;
    try {
      setSaving(true);
      const newNode = await apiService.createLtcNode(team.id, {
        name: `新节点 ${newOrder + 1}`,
        description: '',
        order: newOrder,
      });
      setNodes([...nodes, newNode]);
      setSelectedNode(newNode);
      setEditingNode(newNode);
      setEditForm({ name: newNode.name, description: newNode.description || '' });
      setIsEditModalOpen(true);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : '创建节点失败');
    } finally {
      setSaving(false);
    }
  }, [team?.id, nodes, setNodes, setSaving]);

  // Edit node
  const handleEditNode = useCallback((node: LtcNode) => {
    setEditingNode(node);
    setEditForm({ name: node.name, description: node.description || '' });
    setIsEditModalOpen(true);
  }, []);

  // Save edited node
  const handleSaveNode = useCallback(async () => {
    if (!team?.id || !editingNode) return;

    try {
      setSaving(true);
      const updated = await apiService.updateLtcNode(team.id, editingNode.id, {
        name: editForm.name,
        description: editForm.description,
      });

      // If editing a system node, mark it as custom
      const finalUpdated = updated.source === 'SYSTEM' ? {
        ...updated,
        source: 'CUSTOM' as const,
      } : updated;

      const newNodes = nodes.map((n) => (n.id === finalUpdated.id ? finalUpdated : n));
      setNodes(newNodes);

      if (selectedNode?.id === finalUpdated.id) {
        setSelectedNode(finalUpdated);
      }

      setIsEditModalOpen(false);
      setEditingNode(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }, [team?.id, editingNode, editForm, nodes, setNodes, selectedNode, setSaving]);

  // Delete node
  const handleDeleteNode = useCallback(async (node: LtcNode) => {
    if (!team?.id) return;
    if (!confirm(`确定要删除节点 "${node.name}" 吗？`)) return;

    try {
      setSaving(true);
      await apiService.deleteLtcNode(team.id, node.id);
      const newNodes = nodes.filter((n) => n.id !== node.id);
      setNodes(newNodes);

      if (selectedNode?.id === node.id) {
        setSelectedNode(null);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setSaving(false);
    }
  }, [team?.id, nodes, setNodes, selectedNode, setSaving]);

  // Reset to default nodes
  const handleResetDefault = useCallback(async () => {
    if (!team?.id) return;
    if (!confirm('确定要重置为系统默认配置吗？\n\n- 将删除所有系统来源的节点\n- 保留团队自定义节点不变\n- 从系统模板重新同步默认节点')) return;

    try {
      setSaving(true);
      const updatedNodes = await apiService.resetTeamLtcNodes(team.id);
      setNodes(updatedNodes.sort((a, b) => a.order - b.order));
      setSelectedNode(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : '重置失败');
    } finally {
      setSaving(false);
    }
  }, [team?.id, setNodes, setSaving]);

  // Toggle skill binding (add/remove)
  const handleToggleSkill = useCallback(async (skill: Skill) => {
    if (!team?.id || !selectedNode) return;

    const nodeBindings = bindings[selectedNode.id] || [];
    const existingBinding = nodeBindings.find((b) => b.skill_id === skill.id);

    try {
      setSaving(true);

      if (existingBinding) {
        // Remove binding
        await apiService.deleteNodeSkillBinding(team.id, selectedNode.id, existingBinding.id);
        setBindings(
          selectedNode.id,
          nodeBindings.filter((b) => b.id !== existingBinding.id)
        );
      } else {
        // Add binding
        const newBinding = await apiService.createNodeSkillBinding(team.id, selectedNode.id, {
          skill_id: skill.id,
        });
        setBindings(selectedNode.id, [...nodeBindings, newBinding]);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setSaving(false);
    }
  }, [team?.id, selectedNode, bindings, setBindings]);

  if (!team) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <p className="text-gray-500">请先加入或创建一个团队</p>
        </div>
      </div>
    );
  }

  // Only OWNER and ADMIN can access this page
  if (team.role !== 'OWNER' && team.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
            <Layers className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">访问受限</h2>
          <p className="text-gray-500">只有团队所有者或管理员可以配置LTC流程</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <span className="w-10 h-10 bg-[#1677FF] rounded-xl flex items-center justify-center">
                  <Workflow className="w-5 h-5 text-white" />
                </span>
                LTC 流程配置
              </h1>
              <p className="text-gray-500">配置销售流程节点，拖拽排序，绑定对应技能</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleResetDefault}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200"
              >
                <RotateCcw className="w-4 h-4" />
                重置默认
              </button>
              <button
                onClick={handleAddNode}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#1677FF] rounded-xl hover:bg-[#4096FF] transition-all duration-200 shadow-lg shadow-[#1677FF]/30"
              >
                <Plus className="w-4 h-4" />
                添加节点
              </button>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setLocalError(null)}
              className="p-1 hover:bg-red-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Node list */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gradient-to-br from-[#1677FF] to-[#4096FF] rounded-xl flex items-center justify-center shadow-lg shadow-[#1677FF]/30">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">流程节点</h2>
                  <p className="text-xs text-gray-500 mt-0.5">拖拽节点调整顺序</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse border border-gray-100" />
                  ))}
                </div>
              ) : nodes.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-50 rounded-2xl flex items-center justify-center">
                    <Layers className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 mb-2">暂无节点</p>
                  <p className="text-sm text-gray-400">点击"添加节点"创建第一个节点</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {nodes.map((node, index) => (
                        <SortableNodeItem
                          key={node.id}
                          node={node}
                          index={index}
                          isSelected={selectedNode?.id === node.id}
                          onSelect={setSelectedNode}
                          onEdit={handleEditNode}
                          onDelete={handleDeleteNode}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>

          {/* Right: Skill binding */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl flex items-center justify-center border border-gray-200">
                  <Zap className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">节点技能绑定</h2>
                  <p className="text-xs text-gray-500 mt-0.5">为选中的节点配置技能</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {!selectedNode ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-50 rounded-2xl flex items-center justify-center">
                    <Layers className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium mb-1">请从左侧选择一个节点</p>
                  <p className="text-sm text-gray-400">选择节点后可配置绑定的技能</p>
                </div>
              ) : (
                <div>
                  <div className="mb-6 p-4 bg-gradient-to-r from-[#1677FF]/5 to-transparent border border-[#1677FF]/10 rounded-xl">
                    <span className="text-xs font-semibold text-[#1677FF] mb-1 block">当前节点</span>
                    <div className="font-bold text-gray-900 text-lg">{selectedNode.name}</div>
                    {selectedNode.description && (
                      <div className="text-sm text-gray-600 mt-1">{selectedNode.description}</div>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#1677FF]" />
                    选择要绑定的技能
                  </h3>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {allSkills.map((skill) => {
                      const nodeBindings = bindings[selectedNode.id] || [];
                      const isBound = nodeBindings.some((b) => b.skill_id === skill.id);

                      return (
                        <div
                          key={skill.id}
                          onClick={() => handleToggleSkill(skill)}
                          className={`
                            group flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                            ${isBound ? 'border-[#1677FF] bg-[#1677FF]/5 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                          `}
                        >
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isBound ? 'bg-[#1677FF] border-[#1677FF]' : 'border-gray-300'}`}>
                            {isBound && <Check className="w-4 h-4 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold truncate ${isBound ? 'text-[#1677FF]' : 'text-gray-900'}`}>{skill.name}</div>
                            {skill.description && (
                              <div className="text-xs text-gray-500 truncate mt-0.5">{skill.description}</div>
                            )}
                          </div>
                          {isBound && (
                            <Check className="w-5 h-5 text-[#1677FF]" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/50">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-[#1677FF]" />
                  {editingNode?.id ? '编辑节点' : '新建节点'}
                </h3>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    节点名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 transition-all"
                    placeholder="例如：需求分析"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">描述</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 transition-all resize-none"
                    rows={3}
                    placeholder="节点的详细描述..."
                  />
                </div>
              </div>

              <div className="px-6 py-5 border-t border-gray-100 flex gap-3 bg-gray-50/50">
                <button
                  onClick={handleSaveNode}
                  disabled={!editForm.name.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#1677FF] rounded-xl hover:bg-[#4096FF] disabled:opacity-50 transition-colors shadow-lg shadow-[#1677FF]/30"
                >
                  <Save className="w-4 h-4" />
                  保存
                </button>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingNode(null);
                  }}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
