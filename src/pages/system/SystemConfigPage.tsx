import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api.service';
import type {
  SystemLtcNode,
  SystemRoleSkillConfig,
  SyncResult,
  Skill,
  IronTriangleRole,
} from '../../types';

type ConfigTabType = 'ltc' | 'roles';

export default function SystemConfigPage() {
  const { user } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<ConfigTabType>('ltc');

  // LTC nodes state
  const [systemNodes, setSystemNodes] = useState<SystemLtcNode[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);

  // Role configs state
  const [roleConfigs, setRoleConfigs] = useState<SystemRoleSkillConfig[]>([]);
  const [pendingRoleConfigs, setPendingRoleConfigs] = useState<Record<IronTriangleRole, string[]> | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  // Edit state
  const [editingNode, setEditingNode] = useState<SystemLtcNode | null>(null);
  const [showNodeForm, setShowNodeForm] = useState(false);
  const [nodeForm, setNodeForm] = useState({
    name: '',
    description: '',
    default_skill_ids: [] as string[],
  });

  // Load data
  useEffect(() => {
    loadData();
    // Reset pending changes when switching tabs
    setPendingRoleConfigs(null);
    setHasPendingChanges(false);
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Always load skills for both tabs
      const skillsData = await apiService.getSkills(true);
      setAllSkills(skillsData);

      if (activeTab === 'ltc') {
        const nodesData = await apiService.getSystemLtcNodes();
        setSystemNodes(nodesData);
      } else {
        const configsData = await apiService.getSystemRoleSkillConfigs();
        setRoleConfigs(configsData);
      }
    } catch (error) {
      console.error('加载系统配置失败:', error);
      alert('加载系统配置失败');
    } finally {
      setIsLoading(false);
    }
  };

  // ========== LTC Node Management ==========

  const handleCreateNode = async () => {
    setIsSaving(true);
    try {
      const maxOrder = systemNodes.length > 0 ? Math.max(...systemNodes.map(n => n.order)) : -1;
      await apiService.createSystemLtcNode({
        ...nodeForm,
        order: maxOrder + 1,
      });
      setShowNodeForm(false);
      setNodeForm({ name: '', description: '', default_skill_ids: [] });
      loadData();
    } catch (error) {
      console.error('创建节点失败:', error);
      alert('创建节点失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateNode = async () => {
    if (!editingNode) return;
    setIsSaving(true);
    try {
      await apiService.updateSystemLtcNode(editingNode.id, nodeForm);
      setEditingNode(null);
      setShowNodeForm(false);
      setNodeForm({ name: '', description: '', default_skill_ids: [] });
      loadData();
    } catch (error) {
      console.error('更新节点失败:', error);
      alert('更新节点失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!confirm('确定要删除此系统节点吗？这将从所有团队中移除对应的系统节点。')) return;
    try {
      await apiService.deleteSystemLtcNode(nodeId);
      loadData();
    } catch (error) {
      console.error('删除节点失败:', error);
      alert('删除节点失败');
    }
  };

  const handleEditNode = (node: SystemLtcNode) => {
    setEditingNode(node);
    setNodeForm({
      name: node.name,
      description: node.description || '',
      default_skill_ids: node.default_skill_ids || [],
    });
    setShowNodeForm(true);
  };

  const handleMoveNode = async (nodeId: string, direction: 'up' | 'down') => {
    const nodes = [...systemNodes];
    const index = nodes.findIndex(n => n.id === nodeId);
    if (index < 0) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= nodes.length) return;

    // Swap orders
    const tempOrder = nodes[index].order;
    nodes[index].order = nodes[newIndex].order;
    nodes[newIndex].order = tempOrder;

    try {
      await apiService.reorderSystemLtcNodes(
        nodes.map(n => ({ id: n.id, order: n.order }))
      );
      loadData();
    } catch (error) {
      console.error('调整顺序失败:', error);
      alert('调整顺序失败');
    }
  };

  // ========== Role Config Management ==========

  // Update pending config (local state only, no save)
  const handlePendingRoleConfigUpdate = (role: IronTriangleRole, skillIds: string[]) => {
    setPendingRoleConfigs(prev => {
      const current = prev || { AR: [], SR: [], FR: [] };
      return {
        ...current,
        [role]: skillIds,
      };
    });
    setHasPendingChanges(true);
  };

  // Save all pending configs at once
  const handleSaveRoleConfigs = async () => {
    if (!pendingRoleConfigs || !hasPendingChanges) return;

    setIsSaving(true);
    try {
      // Save all pending configs
      await Promise.all(
        Object.entries(pendingRoleConfigs).map(([role, skillIds]) =>
          apiService.updateSystemRoleSkillConfig(role as IronTriangleRole, skillIds)
        )
      );

      // Clear pending state and reload data
      setPendingRoleConfigs(null);
      setHasPendingChanges(false);
      loadData();
    } catch (error) {
      console.error('更新角色配置失败:', error);
      alert('更新角色配置失败');
    } finally {
      setIsSaving(false);
    }
  };

  // Discard pending changes
  const handleDiscardRoleConfigs = () => {
    setPendingRoleConfigs(null);
    setHasPendingChanges(false);
  };

  // ========== Sync Operations ==========

  const handleSyncToAllTeams = async () => {
    if (!confirm(
      '确定要将系统配置同步到所有团队吗？\n\n' +
      '- 新增系统节点到团队\n' +
      '- 更新未被团队修改的系统节点\n' +
      '- 保留团队自定义节点不变\n' +
      '- 更新未被团队修改的角色配置'
    )) return;

    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await apiService.syncSystemToAllTeams();
      setSyncResult(result);
    } catch (error) {
      console.error('同步失败:', error);
      alert('同步失败');
    } finally {
      setIsSyncing(false);
    }
  };

  // Access control
  if (!user || user.role !== 'SYSTEM_ADMIN') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-700 mb-4">访问受限</h1>
          <p className="text-gray-500">只有系统管理员可以访问此页面</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">系统配置管理</h1>
        <p className="text-gray-600">管理系统默认的LTC流程节点和角色技能配置</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('ltc')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'ltc'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            LTC节点模板
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'roles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            角色技能配置
          </button>
        </nav>
      </div>

      {/* Sync Button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={handleSyncToAllTeams}
          disabled={isSyncing}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSyncing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              同步中...
            </>
          ) : (
            '同步到所有团队'
          )}
        </button>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">同步结果</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{syncResult.success}</div>
              <div className="text-sm text-green-700">成功</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">{syncResult.skipped}</div>
              <div className="text-sm text-yellow-700">跳过</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{syncResult.errors}</div>
              <div className="text-sm text-red-700">失败</div>
            </div>
          </div>
          {syncResult.details.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                查看详细 ({syncResult.details.length} 个团队)
              </summary>
              <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                {syncResult.details.map((detail, idx) => (
                  <div key={idx} className="text-sm p-3 bg-gray-50 rounded">
                    <div className="font-medium">{detail.teamName || detail.teamId}</div>
                    {detail.changes && detail.changes.changes ? (
                      <div className="text-gray-600 mt-1">
                        LTC节点: +{detail.changes.changes.ltcNodes.added} ~{detail.changes.changes.ltcNodes.updated} skip={detail.changes.changes.ltcNodes.skipped},
                        角色配置: +{detail.changes.changes.roleConfigs.updated} skip={detail.changes.changes.roleConfigs.skipped}
                      </div>
                    ) : detail.error ? (
                      <div className="text-red-600 mt-1">{detail.error}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'ltc' ? (
            <LtcNodesTab
              nodes={systemNodes}
              skills={allSkills}
              onEdit={handleEditNode}
              onDelete={handleDeleteNode}
              onMove={handleMoveNode}
              onAdd={() => {
                setEditingNode(null);
                setNodeForm({ name: '', description: '', default_skill_ids: [] });
                setShowNodeForm(true);
              }}
            />
          ) : (
            <RoleConfigsTab
              configs={roleConfigs}
              pendingConfigs={pendingRoleConfigs}
              skills={allSkills}
              onUpdate={handlePendingRoleConfigUpdate}
              onSave={handleSaveRoleConfigs}
              onDiscard={handleDiscardRoleConfigs}
              isSaving={isSaving}
              hasPendingChanges={hasPendingChanges}
            />
          )}
        </>
      )}

      {/* Node Form Modal */}
      {showNodeForm && (
        <NodeFormModal
          node={editingNode}
          form={nodeForm}
          skills={allSkills}
          onChange={setNodeForm}
          onSave={editingNode ? handleUpdateNode : handleCreateNode}
          onCancel={() => {
            setShowNodeForm(false);
            setEditingNode(null);
            setNodeForm({ name: '', description: '', default_skill_ids: [] });
          }}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

// ========== LTC Nodes Tab Component ==========

interface LtcNodesTabProps {
  nodes: SystemLtcNode[];
  skills: Skill[];
  onEdit: (node: SystemLtcNode) => void;
  onDelete: (nodeId: string) => void;
  onMove: (nodeId: string, direction: 'up' | 'down') => void;
  onAdd: () => void;
}

function LtcNodesTab({ nodes, skills, onEdit, onDelete, onMove, onAdd }: LtcNodesTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">LTC流程节点模板</h2>
        <button
          onClick={onAdd}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加节点
        </button>
      </div>

      {nodes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">暂无系统LTC节点模板</p>
        </div>
      ) : (
        <div className="space-y-3">
          {nodes.map((node, index) => (
            <div key={node.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-gray-900">{node.name}</span>
                    <span className="text-sm text-gray-500">#{node.order}</span>
                  </div>
                  {node.description && (
                    <p className="text-sm text-gray-600 mt-1">{node.description}</p>
                  )}
                  {node.default_skill_ids && node.default_skill_ids.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500">默认技能:</span>
                      {node.default_skill_ids.map(skillId => {
                        const skill = skills.find(s => s.id === skillId);
                        return skill ? (
                          <span key={skillId} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                            {skill.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onMove(node.id, 'up')}
                    disabled={index === 0}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onMove(node.id, 'down')}
                    disabled={index === nodes.length - 1}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onEdit(node)}
                    className="p-2 text-gray-400 hover:text-blue-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(node.id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== Role Configs Tab Component ==========

interface RoleConfigsTabProps {
  configs: SystemRoleSkillConfig[];
  pendingConfigs: Record<IronTriangleRole, string[]> | null;
  skills: Skill[];
  onUpdate: (role: IronTriangleRole, skillIds: string[]) => void;
  onSave: () => void;
  onDiscard: () => void;
  isSaving: boolean;
  hasPendingChanges: boolean;
}

function RoleConfigsTab({
  configs,
  pendingConfigs,
  skills,
  onUpdate,
  onSave,
  onDiscard,
  isSaving,
  hasPendingChanges,
}: RoleConfigsTabProps) {
  const roleNames: Record<IronTriangleRole, string> = {
    AR: '客户经理 (AR)',
    SR: '解决方案专家 (SR)',
    FR: '交付专家 (FR)',
  };

  const roleDescriptions: Record<IronTriangleRole, string> = {
    AR: 'Account Representative - 负责客户关系维护和业务拓展',
    SR: 'Solution Representative - 负责方案设计和售前支持',
    FR: 'Fulfillment Representative - 负责项目交付和客户成功',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">角色技能默认配置</h2>
          {hasPendingChanges && (
            <p className="text-sm text-amber-600 mt-1">⚠️ 有未保存的修改</p>
          )}
        </div>
        <div className="flex gap-2">
          {hasPendingChanges && (
            <>
              <button
                onClick={onDiscard}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                放弃修改
              </button>
              <button
                onClick={onSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? '保存中...' : '保存修改'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {(['AR', 'SR', 'FR'] as IronTriangleRole[]).map(role => {
          const config = configs.find(c => c.role === role);
          const baseSkills = config?.default_skill_ids || [];
          // Use pending config if available, otherwise use base config
          const selectedSkills = pendingConfigs?.[role] ?? baseSkills;
          const hasPendingForRole = pendingConfigs?.[role] !== undefined;

          return (
            <div key={role} className={`bg-white rounded-lg shadow p-6 ${hasPendingForRole ? 'ring-2 ring-amber-400' : ''}`}>
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">{roleNames[role]}</h3>
                  {hasPendingForRole && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                      已修改
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{roleDescriptions[role]}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  默认技能列表 ({selectedSkills.length})
                </label>
                <div className="border border-gray-300 rounded-lg p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
                  {skills.length === 0 ? (
                    <p className="text-gray-500 text-sm">暂无技能可用</p>
                  ) : (
                    <div className="space-y-2">
                      {skills.map(skill => (
                        <label key={skill.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={selectedSkills.includes(skill.id)}
                            onChange={(e) => {
                              const newIds = e.target.checked
                                ? [...selectedSkills, skill.id]
                                : selectedSkills.filter(id => id !== skill.id);
                              onUpdate(role, newIds);
                            }}
                            disabled={isSaving}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{skill.name}</div>
                            {skill.description && (
                              <div className="text-xs text-gray-500">{skill.description}</div>
                            )}
                          </div>
                          {skill.iron_triangle_role && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700">
                              {skill.iron_triangle_role}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedSkills.map(skillId => {
                  const skill = skills.find(s => s.id === skillId);
                  return skill ? (
                    <span key={skillId} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                      {skill.name}
                    </span>
                  ) : null;
                })}
                {selectedSkills.length === 0 && (
                  <span className="text-sm text-gray-400">未选择任何技能</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========== Node Form Modal Component ==========

interface NodeFormModalProps {
  node: SystemLtcNode | null;
  form: {
    name: string;
    description: string;
    default_skill_ids: string[];
  };
  skills: Skill[];
  onChange: (form: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

function NodeFormModal({ node, form, skills, onChange, onSave, onCancel, isSaving }: NodeFormModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            {node ? '编辑系统节点' : '添加系统节点'}
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              节点名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如: 线索、商机、方案..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              节点描述
            </label>
            <textarea
              value={form.description}
              onChange={(e) => onChange({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="描述该节点的作用和目标..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              默认绑定技能 ({form.default_skill_ids.length})
            </label>
            <div className="border border-gray-300 rounded-lg p-3 max-h-[200px] overflow-y-auto">
              {skills.length === 0 ? (
                <p className="text-gray-500 text-sm">暂无技能可用</p>
              ) : (
                <div className="space-y-2">
                  {skills.map(skill => (
                    <label key={skill.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={form.default_skill_ids.includes(skill.id)}
                        onChange={(e) => {
                          const newIds = e.target.checked
                            ? [...form.default_skill_ids, skill.id]
                            : form.default_skill_ids.filter(id => id !== skill.id);
                          onChange({ ...form, default_skill_ids: newIds });
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{skill.name}</div>
                        {skill.description && (
                          <div className="text-xs text-gray-500">{skill.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={onSave}
            disabled={isSaving || !form.name.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
