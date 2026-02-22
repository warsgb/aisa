import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api.service';
import type { Customer, CreateCustomerDto, CustomerProfile } from '../../types';
import MDEditor from '@uiw/react-md-editor';
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  Edit,
  Trash2,
  Eye,
  FileText,
  X,
  Save,
  Sparkles,
} from 'lucide-react';

export default function CustomersPage() {
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

  const [formData, setFormData] = useState<CreateCustomerDto>({
    name: '',
    industry: '',
    company_size: '',
    description: '',
    contact_info: {
      email: '',
      phone: '',
      website: '',
      address: '',
    },
  });

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
      await apiService.createCustomer(team!.id, formData);
      setShowCreateModal(false);
      resetForm();
      loadCustomers();
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
      contact_info: customer.contact_info || {
        email: '',
        phone: '',
        website: '',
        address: '',
      },
    });
    setShowEditModal(true);
  };

  const openViewModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    loadCustomerProfile(customer.id);
    setShowViewModal(true);
  };

  const openProfileModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    loadCustomerProfile(customer.id);
    setShowProfileModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      industry: '',
      company_size: '',
      description: '',
      contact_info: {
        email: '',
        phone: '',
        website: '',
        address: '',
      },
    });
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
        />
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
}

function CustomerCard({ customer, onView, onEdit, onDelete, onEditProfile }: CustomerCardProps) {
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
          onClick={() => alert('天眼查数据对接功能开发中...')}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 group-hover:bg-[#1677FF]/5 group-hover:border-[#1677FF]/20 group-hover:text-[#1677FF]"
        >
          <Search className="w-4 h-4" />
          天眼查企业信息
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
}

function CustomerFormModal({ title, formData, setFormData, onSubmit, onClose }: CustomerFormModalProps) {
  const updateContactInfo = (field: string, value: string) => {
    setFormData({
      ...formData,
      contact_info: {
        ...formData.contact_info,
        [field]: value,
      },
    });
  };

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
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span>联系方式</span>
                <span className="text-xs font-normal text-gray-400">(可选)</span>
              </label>
              <div className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.contact_info?.email || ''}
                    onChange={(e) => updateContactInfo('email', e.target.value)}
                    placeholder="邮箱地址"
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 transition-all"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.contact_info?.phone || ''}
                    onChange={(e) => updateContactInfo('phone', e.target.value)}
                    placeholder="联系电话"
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 transition-all"
                  />
                </div>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="url"
                    value={formData.contact_info?.website || ''}
                    onChange={(e) => updateContactInfo('website', e.target.value)}
                    placeholder="官方网站"
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 transition-all"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.contact_info?.address || ''}
                    onChange={(e) => updateContactInfo('address', e.target.value)}
                    placeholder="公司地址"
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
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
            ✕
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
}

function CustomerProfileModal({ customer, profile, teamId, onClose, onSave }: CustomerProfileModalProps) {
  const [backgroundInfo, setBackgroundInfo] = useState(profile?.background_info || '');
  const [decisionChain, setDecisionChain] = useState(profile?.decision_chain || '');
  const [historyNotes, setHistoryNotes] = useState(profile?.history_notes || '');
  const [isSaving, setIsSaving] = useState(false);

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">编辑背景资料</h2>
            <p className="text-sm text-gray-500">{customer.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            ✕
          </button>
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
    </div>
  );
}
