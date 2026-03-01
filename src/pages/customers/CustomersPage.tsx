import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api.service';
import type { Customer, CreateCustomerDto, CustomerProfile } from '../../types';
import MDEditor from '@uiw/react-md-editor';
import {
  Users,
  Plus,
  Mail,
  Phone,
  Building2,
  Edit,
  Trash2,
  Eye,
  FileText,
  X,
  Save,
  Sparkles,
  Loader2,
  Check,
} from 'lucide-react';

// 辅助函数：将JSON对象转换为Markdown格式
function jsonToMarkdown(obj: any): string {
  if (!obj || typeof obj !== 'object') {
    return '';
  }

  let markdown = '';

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === '' || value === 'null') {
      continue; // 跳过空值
    }

    markdown += `**${key}**\n\n`;

    if (typeof value === 'string') {
      markdown += `${value}\n\n`;
    } else if (typeof value === 'object') {
      for (const [subKey, subValue] of Object.entries(value)) {
        if (subValue === null || subValue === '' || subValue === 'null') {
          continue;
        }
        markdown += `- ${subKey}: ${subValue}\n`;
      }
      markdown += '\n';
    } else {
      markdown += `${value}\n\n`;
    }
  }

  return markdown;
}

export function CustomersPage() {
  const { team, user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';

  // Auto-fill progress state
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillProgress, setAutoFillProgress] = useState(0);
  const [autoFillStatus, setAutoFillStatus] = useState('');
  // Note: autoFillStartTime is handled via local variable to avoid closure issues

  const [formData, setFormData] = useState<CreateCustomerDto>({
    name: '',
    industry: '',
    company_size: '',
    description: '',
  });

  // Auto-fill option state
  const [enableAutoFill, setEnableAutoFill] = useState(true);

  useEffect(() => {
    if (!team && !isSystemAdmin) return;
    loadCustomers();
  }, [team, isSystemAdmin]);

  const loadCustomers = async () => {
    try {
      if (isSystemAdmin) {
        const data = await apiService.getSystemCustomers();
        setCustomers(data.data);
      } else if (team) {
        const data = await apiService.getCustomers(team.id);
        setCustomers(data);
      }
    } catch (error) {
      console.error('加载客户失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomerProfile = async (customerId: string) => {
    if (!team) return;
    setIsLoadingProfile(true);
    try {
      const profile = await apiService.getCustomerProfile(team.id, customerId);
      // 将JSON字符串转换为Markdown格式
      if (profile) {
        // 尝试解析JSON并转换为Markdown
        try {
          const parsed = JSON.parse(profile.background_info || '{}');
          if (typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            profile.background_info = jsonToMarkdown(parsed);
          }
        } catch {
          // 不是JSON，保持原样
        }

        try {
          const parsed = JSON.parse(profile.decision_chain || '{}');
          if (typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            profile.decision_chain = jsonToMarkdown(parsed);
          }
        } catch {
          // 不是JSON，保持原样
        }

        try {
          const parsed = JSON.parse(profile.history_notes || '{}');
          if (typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            profile.history_notes = jsonToMarkdown(parsed);
          }
        } catch {
          // 不是JSON，保持原样
        }
      }
      setCustomerProfile(profile);
    } catch {
      // Profile may not exist, create empty one
      setCustomerProfile(null);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team && !isSystemAdmin) return;

    if (isSystemAdmin) {
      alert('系统管理员无法创建客户，请使用普通用户账号');
      return;
    }

    try {
      // Create customer first
      const createdCustomer = await apiService.createCustomer(team!.id, formData);

      // If auto-fill is enabled, trigger it after customer creation
      if (enableAutoFill && createdCustomer.name) {
        setShowCreateModal(false);
        setIsAutoFilling(true);
        setAutoFillProgress(0);
        setAutoFillStatus('正在搜索客户信息...');

        // Use local variable to track start time (not state, to avoid closure issue)
        const startTime = Date.now();

        // Time-based progress updates (根据AI分析时间调整)
        const progressInterval = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000; // seconds
          // Progress: 0-60s = 0-66%, 60-120s = 66-100%, 120s+ = 100%
          let progress: number;
          if (elapsed < 60) {
            progress = (elapsed / 60) * 66;
            setAutoFillStatus('正在搜索客户信息...');
          } else if (elapsed < 120) {
            progress = 66 + ((elapsed - 60) / 60) * 34;
            setAutoFillStatus('AI 正在分析搜索结果并生成背景资料...');
          } else {
            // 120秒后继续增加进度
            progress = 100 + (elapsed - 120);
            setAutoFillStatus('AI 正在奋力处理中，请稍候...');
          }
          setAutoFillProgress(Math.min(progress, 100));
        }, 500);

        try {
          await apiService.autoFillCustomerProfile(team!.id, createdCustomer.id, 'all');
          // API 返回后才关闭模态窗口
          clearInterval(progressInterval);
          setAutoFillProgress(100);
          setAutoFillStatus('自动填充完成！');
          setIsAutoFilling(false);
          resetForm();
          loadCustomers();
        } catch (error: any) {
          clearInterval(progressInterval);
          setIsAutoFilling(false);
          const errorMsg = error?.response?.data?.message || error?.message || '自动填充失败，请稍后重试';
          alert(`客户创建成功，但自动填充失败：${errorMsg}`);
          resetForm();
          loadCustomers();
        }
      } else {
        // Normal create without auto-fill
        setShowCreateModal(false);
        resetForm();
        loadCustomers();
      }
    } catch (error) {
      console.error('创建客户失败:', error);
      alert('创建客户失败');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!team && !isSystemAdmin) || !selectedCustomer) return;

    if (isSystemAdmin) {
      alert('系统管理员无法更新客户，请使用普通用户账号');
      return;
    }

    try {
      await apiService.updateCustomer(team!.id, selectedCustomer.id, formData);
      setShowEditModal(false);
      setSelectedCustomer(null);
      resetForm();
      loadCustomers();
    } catch (error) {
      console.error('更新客户失败:', error);
      alert('更新客户失败');
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!team && !isSystemAdmin) return;

    if (isSystemAdmin) {
      alert('系统管理员无法删除客户，请使用普通用户账号');
      return;
    }

    if (!confirm(`确定要删除客户 "${customer.name}" 吗？此操作不可撤销。`)) return;

    try {
      await apiService.deleteCustomer(team!.id, customer.id);
      loadCustomers();
    } catch (error) {
      console.error('删除客户失败:', error);
      alert('删除客户失败');
    }
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      industry: customer.industry || '',
      company_size: customer.company_size || '',
      description: customer.description || '',
    });
    setShowEditModal(true);
  };

  const openViewModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    loadCustomerProfile(customer.id);
    setShowViewModal(true);
  };

  const openProfileModal = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerProfile(null); // 先清空，避免显示之前客户的数据
    await loadCustomerProfile(customer.id); // 等待加载完成后再显示 modal
    setShowProfileModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      industry: '',
      company_size: '',
      description: '',
    });
  };

  const handleAutoFill = async (customer: Customer) => {
    if (!team) return;

    if (!customer.name || customer.name.trim() === '') {
      alert('请先填写客户名称');
      return;
    }

    // 关闭其他已打开的模态窗口
    setShowViewModal(false);
    setShowEditModal(false);
    setShowCreateModal(false);
    setSelectedCustomer(null);

    try {
      setIsAutoFilling(true);
      setAutoFillProgress(0);
      setAutoFillStatus('正在搜索客户信息...');

      // Use local variable to track start time (not state, to avoid closure issue)
      const startTime = Date.now();

      // Time-based progress updates (根据AI分析时间调整)
      const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000; // seconds
        // Progress: 0-60s = 0-66%, 60-120s = 66-100%, 120s+ = 100%
        let progress: number;
        if (elapsed < 60) {
          progress = (elapsed / 60) * 66;
          setAutoFillStatus('正在搜索客户信息...');
        } else if (elapsed < 120) {
          progress = 66 + ((elapsed - 60) / 60) * 34;
          setAutoFillStatus('AI 正在分析搜索结果并生成背景资料...');
        } else {
          progress = 100 + (elapsed - 120);
          setAutoFillStatus('AI 正在奋力处理中，请稍候...');
        }
        setAutoFillProgress(Math.min(progress, 100));
      }, 500);

      const result = await apiService.autoFillCustomerProfile(team.id, customer.id, 'all');
      // API 返回后才关闭模态窗口
      clearInterval(progressInterval);
      setAutoFillProgress(100);
      setAutoFillStatus('自动填充完成！');
      setIsAutoFilling(false);
      // Reload the customer data to show updated profile
      loadCustomers();
      alert(result.message || '自动填充成功');
    } catch (error: any) {
      console.error('自动填充失败:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '自动填充失败，请稍后重试';
      alert(errorMsg);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#1677FF]/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-[#1677FF] rounded-full animate-spin"></div>
          </div>
          <p className="mt-6 text-gray-600 font-medium">加载客户数据...</p>
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
                  <Users className="w-5 h-5 text-white" />
                </span>
                客户管理
              </h1>
              <p className="text-gray-500">管理您的客户信息，维护背景资料和联系方式</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1677FF] text-white rounded-xl hover:bg-[#4096FF] transition-all duration-200 shadow-lg shadow-[#1677FF]/30 hover:shadow-xl hover:shadow-[#1677FF]/40 font-medium"
            >
              <Plus className="w-5 h-5" />
              添加客户
            </button>
          </div>
        </div>

        {/* Customer Cards Grid */}
        {customers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
              <Users className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">暂无客户</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">开始添加您的第一个客户，建立完整的客户档案</p>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1677FF] text-white rounded-xl hover:bg-[#4096FF] transition-all duration-200 shadow-lg shadow-[#1677FF]/30 font-medium"
            >
              <Sparkles className="w-5 h-5" />
              添加第一个客户
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onView={() => openViewModal(customer)}
                onEdit={() => openEditModal(customer)}
                onDelete={() => handleDelete(customer)}
                onEditProfile={() => openProfileModal(customer)}
                onAutoFill={handleAutoFill}
              />
            ))}
          </div>
        )}
        </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CustomerFormModal
          title="添加客户"
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreate}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          enableAutoFill={enableAutoFill}
          setEnableAutoFill={setEnableAutoFill}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedCustomer && (
        <CustomerFormModal
          title="编辑客户"
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleUpdate}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCustomer(null);
            resetForm();
          }}
        />
      )}

      {/* View Modal */}
      {showViewModal && selectedCustomer && (
        <CustomerViewModal
          customer={selectedCustomer}
          profile={customerProfile}
          isLoadingProfile={isLoadingProfile}
          onClose={() => {
            setShowViewModal(false);
            setSelectedCustomer(null);
            setCustomerProfile(null);
          }}
          onEdit={() => {
            setShowViewModal(false);
            openEditModal(selectedCustomer);
          }}
          onEditProfile={() => {
            setShowViewModal(false);
            openProfileModal(selectedCustomer);
          }}
        />
      )}

      {/* Profile Edit Modal */}
      {showProfileModal && selectedCustomer && (
        <CustomerProfileModal
          customer={selectedCustomer}
          profile={customerProfile}
          teamId={team?.id || ''}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedCustomer(null);
            setCustomerProfile(null);
          }}
          onSave={(profile) => {
            setCustomerProfile(profile);
            setShowProfileModal(false);
          }}
          onAutoFill={async (searchGoal) => {
            if (!team) return;
            await apiService.autoFillCustomerProfile(team.id, selectedCustomer.id, searchGoal);
            // The modal will reload the profile data
          }}
        />
      )}

      {/* Auto-fill Progress Modal */}
      {isAutoFilling && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1677FF]/20 to-[#4096FF]/20 rounded-full animate-pulse"></div>
                <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                  {autoFillProgress < 100 ? (
                    <Loader2 className="w-10 h-10 text-[#1677FF] animate-spin" />
                  ) : (
                    <Check className="w-10 h-10 text-green-500" />
                  )}
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {autoFillProgress < 100 ? 'AI 自动调研中...' : '调研完成！'}
              </h3>
              <p className="text-sm text-gray-500">{autoFillStatus}</p>
            </div>

            {/* Timer-based Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>{autoFillStatus}</span>
                <span>
                  {autoFillProgress < 66
                    ? `${Math.round(autoFillProgress / 66 * 60)}s`
                    : autoFillProgress < 100
                    ? `60s+${Math.round((autoFillProgress - 66) / 34 * 60)}s`
                    : '120s+'}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    autoFillProgress >= 100 ? 'bg-red-500 animate-pulse' :
                    autoFillProgress >= 66 ? 'bg-orange-500' : 'bg-[#1677FF]'
                  }`}
                  style={{ width: `${Math.min(autoFillProgress, 100)}%` }}
                ></div>
              </div>
              {autoFillProgress >= 100 ? (
                <p className="text-xs text-red-500 mt-1 font-medium">🚀 AI 正在奋力执行中，辛苦等待啦！</p>
              ) : autoFillProgress >= 66 ? (
                <p className="text-xs text-orange-500 mt-1">AI 正在分析搜索结果并生成背景资料，请耐心等待...</p>
              ) : null}
            </div>

            {/* Progress Steps */}
            <div className="space-y-2 text-left">
              <div className={`flex items-center gap-3 text-sm ${autoFillProgress >= 20 ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${autoFillProgress >= 20 ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {autoFillProgress >= 20 ? <Check className="w-4 h-4" /> : <span className="text-xs">1</span>}
                </div>
                <span>搜索客户背景资料</span>
              </div>
              <div className={`flex items-center gap-3 text-sm ${autoFillProgress >= 60 ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${autoFillProgress >= 60 ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {autoFillProgress >= 60 ? <Check className="w-4 h-4" /> : <span className="text-xs">2</span>}
                </div>
                <span>分析决策链信息</span>
              </div>
              <div className={`flex items-center gap-3 text-sm ${autoFillProgress >= 90 ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${autoFillProgress >= 90 ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {autoFillProgress >= 90 ? <Check className="w-4 h-4" /> : <span className="text-xs">3</span>}
                </div>
                <span>整理历史合作信息</span>
              </div>
            </div>

            {/* Run in Background Button */}
            {autoFillProgress < 100 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setIsAutoFilling(false);
                    alert('✅ 后台会继续运行，可以过几分钟查看客户资料');
                  }}
                  className="w-full px-4 py-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  后台运行
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Customer Card Component
interface CustomerCardProps {
  customer: Customer;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditProfile: () => void;
  onAutoFill: (customer: Customer) => void;
}

function CustomerCard({ customer, onView, onEdit, onDelete, onEditProfile, onAutoFill }: CustomerCardProps) {
  // 仅用于按钮的禁用状态，不显示独立的进度条模态窗口
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const handleAutoFill = async () => {
    setIsAutoFilling(true);
    try {
      await onAutoFill(customer);
    } finally {
      setIsAutoFilling(false);
    }
  };
  return (
    <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-[#1677FF]/20 overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-[#1677FF]/5 to-transparent p-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 flex-shrink-0 bg-gradient-to-br from-[#1677FF] to-[#4096FF] text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg shadow-[#1677FF]/30">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 text-lg truncate group-hover:text-[#1677FF] transition-colors">
                {customer.name}
              </h3>
              {customer.industry && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <Building2 className="w-3 h-3" />
                  {customer.industry}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-5 pt-4 space-y-3">
        {customer.company_size && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{customer.company_size}</span>
          </div>
        )}
        {customer.contact_info?.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600 truncate">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="truncate">{customer.contact_info.email}</span>
          </div>
        )}
        {customer.contact_info?.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="w-4 h-4 text-gray-400" />
            <span>{customer.contact_info.phone}</span>
          </div>
        )}
        {customer.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mt-2">{customer.description}</p>
        )}
      </div>

      {/* Third-party data button */}
      <div className="px-5 pb-4">
        <button
          onClick={handleAutoFill}
          disabled={isAutoFilling || !customer.name}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 group-hover:bg-[#1677FF]/5 group-hover:border-[#1677FF]/20 group-hover:text-[#1677FF] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAutoFilling ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              填充中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              AI 自动填充
            </>
          )}
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 p-5 pt-0 border-t border-gray-100">
        <button
          onClick={onView}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#1677FF] bg-[#1677FF]/5 rounded-xl hover:bg-[#1677FF]/10 transition-colors"
        >
          <Eye className="w-4 h-4" />
          查看
        </button>
        <button
          onClick={onEditProfile}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <FileText className="w-4 h-4" />
          背景资料
        </button>
        <button
          onClick={onEdit}
          className="p-2.5 text-gray-400 hover:text-[#1677FF] hover:bg-[#1677FF]/5 rounded-xl transition-colors"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Customer Form Modal
interface CustomerFormModalProps {
  title: string;
  formData: CreateCustomerDto;
  setFormData: (data: CreateCustomerDto) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  enableAutoFill?: boolean;
  setEnableAutoFill?: (value: boolean) => void;
}

function CustomerFormModal({ title, formData, setFormData, onSubmit, onClose, enableAutoFill = true, setEnableAutoFill }: CustomerFormModalProps) {

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-white to-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">填写客户基本信息</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                客户名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 transition-all"
                placeholder="请输入客户名称"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">行业</label>
                <input
                  type="text"
                  value={formData.industry || ''}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 transition-all"
                  placeholder="例如：科技、金融"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">公司规模</label>
                <input
                  type="text"
                  value={formData.company_size || ''}
                  onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 transition-all"
                  placeholder="例如：100-500人"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">描述</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 transition-all resize-none"
                placeholder="简要描述客户背景..."
              />
            </div>
          </div>

          {/* AI Auto-fill Option - Only show in Create mode */}
          {title === '添加客户' && (
            <div className="px-6 py-4 bg-gradient-to-r from-[#1677FF]/5 to-transparent border-t border-gray-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={enableAutoFill}
                    onChange={(e) => setEnableAutoFill?.(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:bg-[#1677FF] peer-checked:border-[#1677FF] transition-all flex items-center justify-center">
                    {enableAutoFill && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900">AI 自动调研</span>
                  <p className="text-xs text-gray-500 mt-0.5">自动搜索并填充客户背景资料</p>
                </div>
              </label>
            </div>
          )}

          <div className="px-6 py-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-[#1677FF] rounded-xl hover:bg-[#4096FF] transition-colors shadow-lg shadow-[#1677FF]/30"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Customer View Modal
interface CustomerViewModalProps {
  customer: Customer;
  profile: CustomerProfile | null;
  isLoadingProfile: boolean;
  onClose: () => void;
  onEdit: () => void;
  onEditProfile: () => void;
}

function CustomerViewModal({
  customer,
  profile,
  isLoadingProfile,
  onClose,
  onEdit,
  onEditProfile,
}: CustomerViewModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#1677FF]/10 text-[#1677FF] rounded-xl flex items-center justify-center font-bold text-xl">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{customer.name}</h2>
              {customer.industry && (
                <span className="text-sm text-gray-500">{customer.industry}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6" data-color-mode="light">
          <div className="space-y-6">
            {/* Basic Info */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">基本信息</h3>
              <div className="grid grid-cols-2 gap-4 bg-[#F5F7FA] rounded-xl p-4">
                <div>
                  <span className="text-xs text-gray-500">公司规模</span>
                  <p className="text-gray-900">{customer.company_size || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">描述</span>
                  <p className="text-gray-900">{customer.description || '-'}</p>
                </div>
                {customer.contact_info?.email && (
                  <div>
                    <span className="text-xs text-gray-500">邮箱</span>
                    <p className="text-gray-900">{customer.contact_info.email}</p>
                  </div>
                )}
                {customer.contact_info?.phone && (
                  <div>
                    <span className="text-xs text-gray-500">电话</span>
                    <p className="text-gray-900">{customer.contact_info.phone}</p>
                  </div>
                )}
                {customer.contact_info?.website && (
                  <div className="col-span-2">
                    <span className="text-xs text-gray-500">网站</span>
                    <a
                      href={customer.contact_info.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1677FF] hover:underline block"
                    >
                      {customer.contact_info.website}
                    </a>
                  </div>
                )}
                {customer.contact_info?.address && (
                  <div className="col-span-2">
                    <span className="text-xs text-gray-500">地址</span>
                    <p className="text-gray-900">{customer.contact_info.address}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Third-party Data Entry */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">第三方数据</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => alert('天眼查数据对接功能开发中...')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span>🔍</span>
                  天眼查企业信息
                </button>
              </div>
            </section>

            {/* Background Info */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">背景资料</h3>
                <button
                  onClick={onEditProfile}
                  className="text-sm text-[#1677FF] hover:text-[#4096FF]"
                >
                  编辑
                </button>
              </div>

              {isLoadingProfile ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Background Info */}
                  {profile?.background_info ? (
                    <div className="bg-[#F5F7FA] rounded-xl p-4">
                      <h4 className="text-xs font-medium text-gray-500 mb-2">客户背景</h4>
                      <MDEditor.Markdown source={profile.background_info} />
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-[#F5F7FA] rounded-xl">
                      <p className="text-sm text-gray-400 mb-2">暂无背景资料</p>
                      <button
                        onClick={onEditProfile}
                        className="text-sm text-[#1677FF] hover:text-[#4096FF]"
                      >
                        添加背景资料
                      </button>
                    </div>
                  )}

                  {/* Decision Chain */}
                  {profile?.decision_chain && (
                    <div className="bg-[#F5F7FA] rounded-xl p-4">
                      <h4 className="text-xs font-medium text-gray-500 mb-2">决策链</h4>
                      <MDEditor.Markdown source={profile.decision_chain} />
                    </div>
                  )}

                  {/* History Notes */}
                  {profile?.history_notes && (
                    <div className="bg-[#F5F7FA] rounded-xl p-4">
                      <h4 className="text-xs font-medium text-gray-500 mb-2">历史合作</h4>
                      <MDEditor.Markdown source={profile.history_notes} />
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            关闭
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-[#1677FF] text-white rounded-lg hover:bg-[#4096FF] transition-colors"
          >
            编辑
          </button>
        </div>
      </div>
    </div>
  );
}

// Customer Profile Modal
interface CustomerProfileModalProps {
  customer: Customer;
  profile: CustomerProfile | null;
  teamId: string;
  onClose: () => void;
  onSave: (profile: CustomerProfile) => void;
  onAutoFill?: (searchGoal: 'background' | 'decision_chain' | 'cooperation_history' | 'all') => Promise<void>;
}

function CustomerProfileModal({ customer, profile, teamId, onClose, onSave, onAutoFill }: CustomerProfileModalProps) {
  // 使用 useEffect 确保 profile 数据变化时也能正确更新
  const [backgroundInfo, setBackgroundInfo] = useState('');
  const [decisionChain, setDecisionChain] = useState('');
  const [historyNotes, setHistoryNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillProgress, setAutoFillProgress] = useState(0);
  const [autoFillStatus, setAutoFillStatus] = useState('');
  const [searchGoal, setSearchGoal] = useState<'background' | 'decision_chain' | 'cooperation_history' | 'all'>('all');

  // 当 profile 变化时更新 state
  useEffect(() => {
    setBackgroundInfo(profile?.background_info || '');
    setDecisionChain(profile?.decision_chain || '');
    setHistoryNotes(profile?.history_notes || '');
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await apiService.updateCustomerProfile(teamId, customer.id, {
        background_info: backgroundInfo,
        decision_chain: decisionChain,
        history_notes: historyNotes,
      });
      onSave(updated);
    } catch (error) {
      console.error('保存背景资料失败:', error);
      alert('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoFill = async () => {
    if (!customer.name || customer.name.trim() === '') {
      alert('请先填写客户名称');
      return;
    }

    setIsAutoFilling(true);
    setAutoFillProgress(0);
    setAutoFillStatus('正在搜索客户信息...');

    // Use local variable to track start time
    const startTime = Date.now();

    // Time-based progress updates
    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      let progress: number;
      if (elapsed < 60) {
        progress = (elapsed / 60) * 66;
        setAutoFillStatus('正在搜索客户信息...');
      } else if (elapsed < 120) {
        progress = 66 + ((elapsed - 60) / 60) * 34;
        setAutoFillStatus('AI 正在分析搜索结果并生成背景资料...');
      } else {
        progress = 100;
        setAutoFillStatus('AI 正在奋力处理中...');
      }
      setAutoFillProgress(Math.min(progress, 100));
    }, 500);

    try {
      if (onAutoFill) {
        await onAutoFill(searchGoal);
        // API 返回后才关闭模态窗口
        clearInterval(progressInterval);
        setAutoFillProgress(100);
        setAutoFillStatus('自动填充完成！');
        // Reload profile after auto-fill
        const updated = await apiService.getCustomerProfile(teamId, customer.id);
        // 将JSON转换为Markdown格式
        const backgroundMarkdown = jsonToMarkdown({
          background_info: updated.background_info,
          decision_chain: updated.decision_chain,
          history_notes: updated.history_notes,
        });
        setBackgroundInfo(backgroundMarkdown);
        setDecisionChain(decisionChain);
        setHistoryNotes(historyNotes);
        setIsAutoFilling(false);
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      setIsAutoFilling(false);
      console.error('自动填充失败:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '自动填充失败，请稍后重试';
      alert(errorMsg);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">编辑背景资料</h2>
            <p className="text-sm text-gray-500">{customer.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={searchGoal}
              onChange={(e) => setSearchGoal(e.target.value as any)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1677FF]"
              disabled={isAutoFilling}
            >
              <option value="all">全部填充</option>
              <option value="background">仅背景资料</option>
              <option value="decision_chain">仅决策链</option>
              <option value="cooperation_history">仅历史合作</option>
            </select>
            <button
              onClick={handleAutoFill}
              disabled={isAutoFilling || !customer.name}
              className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-[#1677FF] rounded-lg hover:bg-[#4096FF] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAutoFilling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  填充中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  AI 填充
                </>
              )}
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6" data-color-mode="light">
          <div className="space-y-6">
            {/* Background Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">客户背景</label>
              <p className="text-xs text-gray-400 mb-2">支持 Markdown 格式</p>
              <MDEditor
                value={backgroundInfo}
                onChange={(v) => setBackgroundInfo(v || '')}
                height={200}
              />
            </div>

            {/* Decision Chain */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">决策链</label>
              <p className="text-xs text-gray-400 mb-2">支持 Markdown 格式</p>
              <MDEditor
                value={decisionChain}
                onChange={(v) => setDecisionChain(v || '')}
                height={200}
              />
            </div>

            {/* History Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">历史合作</label>
              <p className="text-xs text-gray-400 mb-2">支持 Markdown 格式</p>
              <MDEditor
                value={historyNotes}
                onChange={(v) => setHistoryNotes(v || '')}
                height={200}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-[#1677FF] text-white rounded-lg hover:bg-[#4096FF] disabled:opacity-50 transition-colors"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* Auto-fill Progress Modal */}
      {isAutoFilling && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto mb-3 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1677FF]/20 to-[#4096FF]/20 rounded-full animate-pulse"></div>
                <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                  {autoFillProgress < 100 ? (
                    <Loader2 className="w-8 h-8 text-[#1677FF] animate-spin" />
                  ) : (
                    <Check className="w-8 h-8 text-green-500" />
                  )}
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {autoFillProgress < 100 ? 'AI 自动调研中...' : '调研完成！'}
              </h3>
              <p className="text-xs text-gray-500">{autoFillStatus}</p>
            </div>

            {/* Timer-based Progress Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>{autoFillStatus}</span>
                <span>
                  {autoFillProgress < 66
                    ? `${Math.round(autoFillProgress / 66 * 60)}s`
                    : autoFillProgress < 100
                    ? `60s+${Math.round((autoFillProgress - 66) / 34 * 60)}s`
                    : '120s+'}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    autoFillProgress >= 100 ? 'bg-red-500 animate-pulse' :
                    autoFillProgress >= 66 ? 'bg-orange-500' : 'bg-[#1677FF]'
                  }`}
                  style={{ width: `${Math.min(autoFillProgress, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="space-y-1.5 text-left">
              <div className={`flex items-center gap-2 text-xs ${autoFillProgress >= 20 ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${autoFillProgress >= 20 ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {autoFillProgress >= 20 ? <Check className="w-3 h-3" /> : <span className="text-xs">1</span>}
                </div>
                <span>搜索客户背景资料</span>
              </div>
              <div className={`flex items-center gap-2 text-xs ${autoFillProgress >= 60 ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${autoFillProgress >= 60 ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {autoFillProgress >= 60 ? <Check className="w-3 h-3" /> : <span className="text-xs">2</span>}
                </div>
                <span>分析决策链信息</span>
              </div>
              <div className={`flex items-center gap-2 text-xs ${autoFillProgress >= 90 ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${autoFillProgress >= 90 ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {autoFillProgress >= 90 ? <Check className="w-3 h-3" /> : <span className="text-xs">3</span>}
                </div>
                <span>整理历史合作信息</span>
              </div>
            </div>

            {/* Run in Background Button */}
            {autoFillProgress < 100 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    setIsAutoFilling(false);
                    alert('✅ 后台会继续运行，可以过几分钟查看客户资料');
                  }}
                  className="w-full px-3 py-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  后台运行
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomersPage;
