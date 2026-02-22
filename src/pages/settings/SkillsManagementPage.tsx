import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api.service';
import type { Skill } from '../../types';
import MDEditor from '@uiw/react-md-editor';
import { RoleSkillConfigPanel } from '../../components/skill';

interface SkillFormData {
  name: string;
  description: string;
  category: string;
  system_prompt: string;
  usage_hint: string;
  slug: string;
}

interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
}

interface SkillFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: string;
}

// 技能模板定义
const SKILL_TEMPLATES: SkillTemplate[] = [
  {
    id: 'blank',
    name: '空白模板',
    description: '从零开始创建技能',
    system_prompt: '',
  },
  {
    id: 'simple',
    name: '简单技能',
    description: '基础对话技能模板',
    system_prompt: `# 技能说明

## 触发条件
当用户需要[功能描述]时使用。

## 使用步骤
1. 理解用户需求
2. 生成回复
3. 返回结果

## 示例
用户：帮我生成一个...
助手：好的，我来帮你...`,
  },
  {
    id: 'presale',
    name: '售前技能',
    description: '售前场景专用模板',
    system_prompt: `# 技能说明

## 触发条件
当用户需要[具体售前场景]时使用，例如：客户调研、方案生成、竞品分析等。

## 角色设定
你是[角色]，专注于[领域]，拥有丰富的行业经验。

## 使用步骤
1. 收集客户信息：了解客户背景、需求痛点
2. 分析需求：深入分析客��的核心诉求
3. 生成方案：结合行业最佳实践提供专业建议

## 关键要点
- 重点关注客户痛点和业务目标
- 避免过度承诺，保持专业客观
- 提供可落地的建议

## 示例对话
用户：帮我分析一下XX公司的潜在需求
助手：好的，我来帮你分析。首先，请提供以下信息...`,
  },
];

export default function SkillsManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'skills' | 'roles'>('skills');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal states
  const [viewSkill, setViewSkill] = useState<Skill | null>(null);
  const [editSkill, setEditSkill] = useState<Skill | null>(null);
  const [createSkill, setCreateSkill] = useState<Skill | null>(null);
  const [editForm, setEditForm] = useState<SkillFormData>({
    name: '',
    description: '',
    category: '',
    system_prompt: '',
    usage_hint: '',
    slug: '',
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');
  const [skillFiles, setSkillFiles] = useState<SkillFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<SkillFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [editTab, setEditTab] = useState<'basic' | 'files'>('basic');

  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    setIsLoading(true);
    try {
      // Load all skills including disabled ones
      const data = await apiService.getSkills();
      setSkills(data);
    } catch (error) {
      console.error('加载技能失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await apiService.syncSkills();
      await loadSkills();
      alert('技能同步成功');
    } catch (error) {
      console.error('同步技能失败:', error);
      alert('同步失败');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveParameterLabels = async (skill: Skill) => {
    if (skill.source !== 'file') {
      alert('只有文件来源的技能支持保存参数标签');
      return;
    }

    try {
      // Call backend API to update parameter labels in the SKILL.md file
      await apiService.updateSkillParameterLabels(skill.id, skill.parameters);

      // Reload skills to get updated data
      await loadSkills();

      alert('参数标签保存成功！技能已重新加载。');
    } catch (error) {
      console.error('保存参数标签失败:', error);
      alert('保存失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleToggle = async (skill: Skill, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiService.toggleSkill(skill.id);
      await loadSkills();
    } catch (error) {
      console.error('切换技能状态失败:', error);
      alert('操作失败');
    }
  };

  const handleDelete = async (skill: Skill, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`确定要删除技能 "${skill.name}" 吗？此操作将删除对应的文件。`)) {
      return;
    }
    try {
      await apiService.deleteSkill(skill.id);
      await loadSkills();
      alert('删除成功');
    } catch (error) {
      console.error('删除技能失败:', error);
      alert('删除失败');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Check if it's a ZIP file
      if (file.name.endsWith('.zip')) {
        const formData = new FormData();
        formData.append('file', file);

        const url = `${import.meta.env.VITE_API_URL || '/api'}/skills/import/zip`;

        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: '上传失败' }));
          throw new Error(error.message || '上传失败');
        }

        await loadSkills();
        alert('导入成功');
      } else {
        // Single MD file import (existing behavior)
        const content = await file.text();
        await apiService.importSkill({
          content,
          originalName: file.name,
        });
        await loadSkills();
        alert('导入成功');
      }
    } catch (error: any) {
      console.error('导入技能失败:', error);
      alert(error.response?.data?.message || error.message || '导入失败');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEdit = async (skill: Skill) => {
    setEditSkill(skill);
    setEditForm({
      name: skill.name,
      description: skill.description || '',
      category: skill.category || '',
      system_prompt: skill.system_prompt || '',
      usage_hint: skill.usage_hint || '',
      slug: skill.slug || '',
    });
    setEditTab('basic');
    await loadSkillFiles(skill);
  };

  // Load all files in a skill directory
  const loadSkillFiles = async (skill: Skill) => {
    if (!skill.file_path) return;

    setIsLoadingFiles(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/skills/${skill.id}/files`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const files = await response.json();
        setSkillFiles(files);
        // Select SKILL.md by default
        const skillMd = files.find((f: SkillFile) => f.name === 'SKILL.md');
        if (skillMd) {
          await loadFileContent(skillMd);
        }
      }
    } catch (error) {
      console.error('加载技能文件失败:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Load content of a specific file
  const loadFileContent = async (file: SkillFile) => {
    if (!editSkill || file.type === 'directory') return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/skills/${editSkill.id}/files/content?path=${encodeURIComponent(file.path)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFileContent(data.content || '');
        setSelectedFile(file);
      }
    } catch (error) {
      console.error('加载文件内容失败:', error);
    }
  };

  const handleSaveFileContent = async () => {
    if (!editSkill || !selectedFile) return;

    try {
      await apiService.updateSkillFile(editSkill.id, selectedFile.path, fileContent);
      alert('保存成功');
    } catch (error) {
      console.error('保存文件失败:', error);
      alert('保存失败');
    }
  };

  const handleCreate = () => {
    setCreateSkill({} as Skill);
    setEditForm({
      name: '',
      description: '',
      category: '',
      system_prompt: '',
      usage_hint: '',
      slug: '',
    });
    setSelectedTemplate('blank');
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = SKILL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setEditForm(prev => ({
        ...prev,
        system_prompt: template.system_prompt,
        name: templateId === 'blank' ? '' : prev.name,
        description: templateId === 'blank' ? '' : prev.description,
      }));
    }
  };

  const handleSaveEdit = async () => {
    if (!editSkill) return;

    try {
      await apiService.updateSkill(editSkill.id, {
        name: editForm.name,
        description: editForm.description,
        category: editForm.category,
        system_prompt: editForm.system_prompt,
        usage_hint: editForm.usage_hint,
      });
      await loadSkills();
      setEditSkill(null);
      alert('保存成功');
    } catch (error) {
      console.error('保存技能失败:', error);
      alert('保存失败');
    }
  };

  const handleSaveCreate = async () => {
    if (!editForm.slug || !editForm.name) {
      alert('请填写技能标识和名称');
      return;
    }

    try {
      await apiService.createSkill({
        slug: editForm.slug,
        name: editForm.name,
        description: editForm.description,
        category: editForm.category,
        system_prompt: editForm.system_prompt,
        usage_hint: editForm.usage_hint,
      });
      await loadSkills();
      setCreateSkill(null);
      alert('创建成功');
    } catch (error: any) {
      console.error('创建技能失败:', error);
      alert(error.response?.data?.message || '创建失败');
    }
  };

  // Get unique categories
  const categories = ['all', ...new Set(skills.map((s) => s.category).filter(Boolean))];

  // Filter skills
  const filteredSkills = skills.filter((skill) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'enabled' && skill.is_enabled !== false) ||
      (statusFilter === 'disabled' && skill.is_enabled === false);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1677FF]"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/settings" className="text-sm text-gray-500 hover:text-[#1677FF]">
              ← 返回设置
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">技能管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理系统技能，查看详情和编辑配置</p>
        </div>
        {activeTab === 'skills' && (
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.zip"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            📥 导入技能
          </button>
          {isSystemAdmin && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-[#1677FF] text-white rounded-lg hover:bg-[#4096FF] transition-colors"
            >
              ➕ 新建技能
            </button>
          )}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {isSyncing ? '🔄 同步中...' : '🔄 同步'}
          </button>
        </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 inline-flex">
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'skills'
              ? 'bg-[#1677FF] text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          技能列表
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'roles'
              ? 'bg-[#1677FF] text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          角色技能配置
        </button>
      </div>

      {/* Skills List Tab */}
      {activeTab === 'skills' && (
        <>
      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.zip"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            📥 导入技能
          </button>
          {isSystemAdmin && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-[#1677FF] text-white rounded-lg hover:bg-[#4096FF] transition-colors"
            >
              ➕ 新建技能
            </button>
          )}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {isSyncing ? '🔄 同步中...' : '🔄 同步'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索技能名称或描述..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1677FF]"
              />
            </div>
          </div>

          {/* Category filter */}
          <div className="sm:w-40">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1677FF]"
            >
              <option value="all">所有分类</option>
              {categories
                .filter((c) => c !== 'all')
                .map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="sm:w-40">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1677FF]"
            >
              <option value="all">全部状态</option>
              <option value="enabled">已启用</option>
              <option value="disabled">已禁用</option>
            </select>
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      {filteredSkills.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">🛠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无技能</h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== 'all'
              ? '没有匹配搜索条件的技能'
              : '点击"导入技能"或"同步技能"获取技能列表'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map((skill) => (
            <div
              key={skill.id}
              className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow p-5 ${
                skill.is_enabled === false
                  ? 'border-gray-200 opacity-75'
                  : 'border-gray-100'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">{skill.name}</h3>
                    {skill.is_enabled === false && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                        已禁用
                      </span>
                    )}
                  </div>
                  {skill.category && (
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-[#F5F7FA] text-gray-600 rounded-full">
                      {skill.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewSkill(skill)}
                    className="p-1.5 text-gray-400 hover:text-[#1677FF] hover:bg-[#1677FF]/10 rounded-lg transition-colors"
                    title="查看详情"
                  >
                    👁️
                  </button>
                  {isSystemAdmin && (
                    <>
                      <button
                        onClick={(e) => handleToggle(skill, e)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          skill.is_enabled !== false
                            ? 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                        title={skill.is_enabled !== false ? '禁用' : '启用'}
                      >
                        {skill.is_enabled !== false ? '⏸️' : '▶️'}
                      </button>
                      <button
                        onClick={(e) => handleDelete(skill, e)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              {skill.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{skill.description}</p>
              )}

              {/* Features */}
              <div className="flex flex-wrap gap-2 mb-3">
                {skill.source === 'file' && (
                  <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
                    📁 文件
                  </span>
                )}
                {skill.supports_streaming && (
                  <span className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded-full">
                    流式输出
                  </span>
                )}
                {skill.supports_multi_turn && (
                  <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
                    多轮对话
                  </span>
                )}
                {skill.parameters && skill.parameters.length > 0 && (
                  <span className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded-full">
                    {skill.parameters.length} 个参数
                  </span>
                )}
              </div>

              {/* Usage hint */}
              {skill.usage_hint && (
                <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2 truncate">
                  💡 {skill.usage_hint}
                </div>
              )}

              {/* File path */}
              {skill.file_path && (
                <div className="mt-2 text-xs text-gray-400 truncate" title={skill.file_path}>
                  📂 {skill.file_path}
                </div>
              )}

              {/* Slug */}
              <div className="mt-1 text-xs text-gray-400">/{skill.slug}</div>
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {/* Role Config Tab */}
      {activeTab === 'roles' && (
        <RoleSkillConfigPanel skills={skills} />
      )}

      {/* View Modal */}
      {viewSkill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{viewSkill.name}</h2>
                {viewSkill.category && (
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-[#F5F7FA] text-gray-600 rounded-full">
                    {viewSkill.category}
                  </span>
                )}
              </div>
              <button
                onClick={() => setViewSkill(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6" data-color-mode="light">
              <div className="space-y-6">
                {/* Description */}
                {viewSkill.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">描述</h3>
                    <p className="text-gray-600">{viewSkill.description}</p>
                  </div>
                )}

                {/* Usage hint */}
                {viewSkill.usage_hint && (
                  <div className="bg-[#F5F7FA] rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-1">使用提示</h3>
                    <p className="text-gray-600">{viewSkill.usage_hint}</p>
                  </div>
                )}

                {/* Parameters */}
                {viewSkill.parameters && viewSkill.parameters.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-700">参数列表</h3>
                      <span className="text-xs text-gray-400">点击标签可编辑</span>
                    </div>
                    <div className="space-y-2">
                      {viewSkill.parameters.map((param) => (
                        <div key={param.name} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={param.label}
                              onChange={(e) => {
                                const updatedParams = viewSkill.parameters.map(p =>
                                  p.name === param.name ? { ...p, label: e.target.value } : p
                                );
                                setViewSkill({ ...viewSkill, parameters: updatedParams });
                              }}
                              className="font-medium text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#1677FF] focus:outline-none px-1"
                              title="点击编辑中文标签"
                            />
                            <span className="text-xs text-gray-400">({param.name})</span>
                            {param.required && (
                              <span className="text-xs text-red-500">*</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            类型: {param.type}
                            {param.default !== undefined && ` • 默认值: ${param.default}`}
                          </div>
                          {param.description && (
                            <div className="text-xs text-gray-400 mt-1">
                              {param.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* System prompt preview */}
                {viewSkill.system_prompt && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">系统提示词预览</h3>
                    <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm font-mono max-h-60 overflow-y-auto">
                      {viewSkill.system_prompt.length > 500
                        ? viewSkill.system_prompt.substring(0, 500) + '...'
                        : viewSkill.system_prompt}
                    </div>
                  </div>
                )}

                {/* Features */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        viewSkill.is_enabled !== false ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    <span className="text-sm text-gray-600">
                      {viewSkill.is_enabled !== false ? '已启用' : '已禁用'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        viewSkill.supports_streaming ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    <span className="text-sm text-gray-600">
                      {viewSkill.supports_streaming ? '支持流式输出' : '不支持流式输出'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        viewSkill.supports_multi_turn ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    <span className="text-sm text-gray-600">
                      {viewSkill.supports_multi_turn ? '支持多轮对话' : '不支持多轮对话'}
                    </span>
                  </div>
                </div>

                {/* Source & File Path */}
                <div className="bg-[#F5F7FA] rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">来源：</span>
                    <span className="text-sm text-gray-600">
                      {viewSkill.source === 'file' ? '📁 文件' : '🗄️ 数据库'}
                    </span>
                  </div>
                  {viewSkill.file_path && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">文件路径：</span>
                      <span className="text-sm text-gray-600 font-mono">{viewSkill.file_path}</span>
                    </div>
                  )}
                  {viewSkill.last_synced_at && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">最后同步：</span>
                      <span className="text-sm text-gray-600">
                        {new Date(viewSkill.last_synced_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  )}
                </div>

                {/* ID */}
                <div className="text-xs text-gray-400 pt-4 border-t">
                  技能 ID: {viewSkill.id} | Slug: {viewSkill.slug}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
              <div className="text-xs text-gray-400">
                💡 修改参数标签后点击"保存参数"即可更新显示名称
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setViewSkill(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  关闭
                </button>
                {viewSkill.source === 'file' && (
                  <button
                    onClick={() => handleSaveParameterLabels(viewSkill)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    💾 保存参数标签
                  </button>
                )}
                {isSystemAdmin && (
                  <button
                    onClick={() => {
                      setViewSkill(null);
                      handleEdit(viewSkill);
                    }}
                    className="px-4 py-2 bg-[#1677FF] text-white rounded-lg hover:bg-[#4096FF] transition-colors"
                  >
                    编辑文件
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editSkill && isSystemAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">编辑技能</h2>
              <p className="text-sm text-gray-500">{editSkill.file_path}</p>
            </div>

            {/* Tabs */}
            <div className="px-6 border-b border-gray-100">
              <div className="flex gap-6">
                <button
                  onClick={() => setEditTab('basic')}
                  className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                    editTab === 'basic'
                      ? 'border-[#1677FF] text-[#1677FF]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  基本信息
                </button>
                {editSkill.source === 'file' && (
                  <button
                    onClick={() => setEditTab('files')}
                    className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                      editTab === 'files'
                        ? 'border-[#1677FF] text-[#1677FF]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    文件管理
                    {skillFiles.length > 0 && (
                      <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 rounded-full">
                        {skillFiles.length}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            {editTab === 'basic' && (
              <div className="flex-1 overflow-y-auto p-6" data-color-mode="light">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      技能名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1677FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      分类
                    </label>
                    <input
                      type="text"
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1677FF]"
                      placeholder="例如：售前、谈判、市场"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      描述
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1677FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      使用提示
                    </label>
                    <input
                      type="text"
                      value={editForm.usage_hint}
                      onChange={(e) => setEditForm({ ...editForm, usage_hint: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1677FF]"
                      placeholder="简短的使用说明"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      系统提示词
                    </label>
                    <MDEditor
                      value={editForm.system_prompt}
                      onChange={(v) => setEditForm({ ...editForm, system_prompt: v || '' })}
                      height={300}
                    />
                  </div>
                </div>
              </div>
            )}

            {editTab === 'files' && editSkill.source === 'file' && (
              <div className="flex-1 overflow-hidden flex" data-color-mode="light">
                {/* File list */}
                <div className="w-64 border-r border-gray-100 overflow-y-auto p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">文件列表</h3>
                  {isLoadingFiles ? (
                    <div className="text-sm text-gray-500">加载中...</div>
                  ) : skillFiles.length === 0 ? (
                    <div className="text-sm text-gray-500">无文件</div>
                  ) : (
                    <div className="space-y-1">
                      {skillFiles.map((file) => (
                        <button
                          key={file.path}
                          onClick={() => file.type === 'file' && loadFileContent(file)}
                          disabled={file.type === 'directory'}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            selectedFile?.path === file.path
                              ? 'bg-[#1677FF]/10 text-[#1677FF]'
                              : file.type === 'directory'
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{file.type === 'directory' ? '📁' : '📄'}</span>
                            <span className="truncate">{file.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* File content */}
                <div className="flex-1 overflow-y-auto p-4">
                  {selectedFile ? (
                    <div className="h-full flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-700">{selectedFile.name}</h3>
                        <button
                          onClick={handleSaveFileContent}
                          className="px-3 py-1 text-sm bg-[#1677FF] text-white rounded-lg hover:bg-[#4096FF] transition-colors"
                        >
                          保存
                        </button>
                      </div>
                      {selectedFile.name.endsWith('.md') ? (
                        <MDEditor
                          value={fileContent}
                          onChange={(v) => setFileContent(v || '')}
                          height={400}
                        />
                      ) : (
                        <textarea
                          value={fileContent}
                          onChange={(e) => setFileContent(e.target.value)}
                          className="flex-1 w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:border-[#1677FF] resize-none"
                          rows={20}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      请选择一个文件进行编辑
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setEditSkill(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              {editTab === 'basic' && (
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-[#1677FF] text-white rounded-lg hover:bg-[#4096FF] transition-colors"
                >
                  保存
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createSkill && isSystemAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">新建技能</h2>
              <p className="text-sm text-gray-500">创建一个新的技能文件</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6" data-color-mode="light">
              <div className="space-y-4">
                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择模板
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {SKILL_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateChange(template.id)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          selectedTemplate === template.id
                            ? 'border-[#1677FF] bg-[#1677FF]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{template.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    技能标识 (Slug) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.slug}
                    onChange={(e) => setEditForm({ ...editForm, slug: e.target.value.replace(/\s+/g, '-').toLowerCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1677FF]"
                    placeholder="例如：my-new-skill"
                  />
                  <p className="text-xs text-gray-500 mt-1">用于文件夹名称，只能包含字母、数字和连字符</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    技能名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1677FF]"
                    placeholder="例如：竞品分析"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    分类
                  </label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1677FF]"
                    placeholder="例如：售前、谈判、市场"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1677FF]"
                    placeholder="简要描述这个技能的用途"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    使用提示
                  </label>
                  <input
                    type="text"
                    value={editForm.usage_hint}
                    onChange={(e) => setEditForm({ ...editForm, usage_hint: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#1677FF]"
                    placeholder="简短的使用说明"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    系统提示词
                  </label>
                  <MDEditor
                    value={editForm.system_prompt}
                    onChange={(v) => setEditForm({ ...editForm, system_prompt: v || '' })}
                    height={300}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setCreateSkill(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveCreate}
                className="px-4 py-2 bg-[#1677FF] text-white rounded-lg hover:bg-[#4096FF] transition-colors"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
