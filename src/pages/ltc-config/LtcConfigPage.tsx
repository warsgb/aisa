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
        flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
        ${isSelected ? 'border-[#1677FF] bg-[#1677FF]/5' : 'border-gray-200 hover:border-gray-300'}
        ${isDragging ? 'opacity-50 shadow-lg' : ''}
      `}
      onClick={() => onSelect(node)}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        ⋮⋮
      </button>

      {/* Step number */}
      <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
        {index + 1}
      </span>

      {/* Node info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">{node.name}</div>
        {node.description && (
          <div className="text-xs text-gray-500 truncate">{node.description}</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(node);
          }}
          className="p-1.5 text-gray-400 hover:text-[#1677FF] hover:bg-[#1677FF]/10 rounded-lg transition-colors"
        >
          ✏️
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(node);
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

export default function LtcConfigPage() {
  const { team } = useAuth();
  const { nodes, bindings, setNodes, setBindings, setSaving, setError } = useLtcConfigStore();

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

        // Load bindings for each node
        const bindingsMap: Record<string, NodeSkillBinding[]> = {};
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

      setNodes(newNodes);

      // Save to server
      if (team?.id) {
        try {
          setSaving(true);
          await apiService.reorderLtcNodes(team.id, {
            nodeIds: newNodes.map((n) => n.id)
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : '保存顺序失败');
        } finally {
          setSaving(false);
        }
      }
    }
  }, [nodes, team?.id, setNodes, setSaving, setError]);

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

      const newNodes = nodes.map((n) => (n.id === updated.id ? updated : n));
      setNodes(newNodes);

      if (selectedNode?.id === updated.id) {
        setSelectedNode(updated);
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
    if (!confirm('确定要重置为默认的8个LTC节点吗？这将删除所有自定义节点。')) return;

    try {
      setSaving(true);
      const defaultNodes = await apiService.resetLtcNodes(team.id);
      setNodes(defaultNodes.sort((a, b) => a.order - b.order));
      setSelectedNode(null);

      // Reload bindings
      const bindingsMap: Record<string, NodeSkillBinding[]> = {};
      await Promise.all(
        defaultNodes.map(async (node) => {
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
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : '重置失败');
    } finally {
      setSaving(false);
    }
  }, [team?.id, setNodes, setBindings, setSaving]);

  // Toggle skill binding
  const handleToggleSkill = useCallback(async (skill: Skill, isBound: boolean) => {
    if (!team?.id || !selectedNode) return;

    const nodeBindings = bindings[selectedNode.id] || [];

    try {
      if (isBound) {
        // Remove binding
        const binding = nodeBindings.find((b) => b.skill_id === skill.id);
        if (binding) {
          await apiService.deleteNodeSkillBinding(team.id, selectedNode.id, binding.id);
          setBindings(
            selectedNode.id,
            nodeBindings.filter((b) => b.id !== binding.id)
          );
        }
      } else {
        // Add binding
        const newBinding = await apiService.createNodeSkillBinding(team.id, selectedNode.id, {
          skill_id: skill.id,
          order: nodeBindings.length,
        });
        setBindings(selectedNode.id, [...nodeBindings, newBinding]);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : '操作失败');
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

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LTC流程配置</h1>
          <p className="text-sm text-gray-500 mt-1">
            配置销售流程节点，拖拽排序，绑定对应技能
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleResetDefault}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            重置默认
          </button>
          <button
            onClick={handleAddNode}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1677FF] rounded-lg hover:bg-[#4096FF] transition-colors"
          >
            + 添加节点
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Node list */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">流程节点</h2>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : nodes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>暂无节点，点击"添加节点"创建</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
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

        {/* Right: Skill binding */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">节点技能绑定</h2>

          {!selectedNode ? (
            <div className="text-center py-12 text-gray-400">
              <span className="text-4xl mb-3 block">👈</span>
              <p>请从左侧选择一个节点</p>
            </div>
          ) : (
            <div>
              <div className="mb-4 p-3 bg-[#F5F7FA] rounded-lg">
                <span className="text-xs text-gray-500">当前节点</span>
                <div className="font-medium text-gray-900">{selectedNode.name}</div>
                {selectedNode.description && (
                  <div className="text-sm text-gray-500">{selectedNode.description}</div>
                )}
              </div>

              <h3 className="text-sm font-medium text-gray-700 mb-3">选择要绑定的技能</h3>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allSkills.map((skill) => {
                  const nodeBindings = bindings[selectedNode.id] || [];
                  const isBound = nodeBindings.some((b) => b.skill_id === skill.id);

                  return (
                    <label
                      key={skill.id}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                        ${isBound ? 'border-[#1677FF] bg-[#1677FF]/5' : 'border-gray-200 hover:border-gray-300'}
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={isBound}
                        onChange={() => handleToggleSkill(skill, isBound)}
                        className="w-4 h-4 text-[#1677FF] border-gray-300 rounded focus:ring-[#1677FF]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{skill.name}</div>
                        {skill.description && (
                          <div className="text-xs text-gray-500 truncate">{skill.description}</div>
                        )}
                      </div>
                      {isBound && <span className="text-[#1677FF]">✓</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingNode?.id ? '编辑节点' : '新建节点'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  节点名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1677FF]"
                  placeholder="例如：需求分析"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1677FF]"
                  rows={3}
                  placeholder="节点的详细描述..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveNode}
                disabled={!editForm.name.trim()}
                className="flex-1 px-4 py-2 bg-[#1677FF] text-white rounded-lg hover:bg-[#4096FF] disabled:opacity-50 transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingNode(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
