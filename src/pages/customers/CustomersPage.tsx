import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api.service';
import type { Customer, CreateCustomerDto } from '../../types';

export default function CustomersPage() {
  const { team } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
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
    if (!team) return;
    loadCustomers();
  }, [team]);

  const loadCustomers = async () => {
    if (!team) return;
    try {
      const data = await apiService.getCustomers(team.id);
      setCustomers(data);
    } catch (error) {
      console.error('加载客户失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;

    try {
      await apiService.createCustomer(team.id, formData);
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
    if (!team || !selectedCustomer) return;

    try {
      await apiService.updateCustomer(team.id, selectedCustomer.id, formData);
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
    if (!team) return;
    if (!confirm(`确定要删除客户 "${customer.name}" 吗？此操作不可撤销。`)) return;

    try {
      await apiService.deleteCustomer(team.id, customer.id);
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
    setShowViewModal(true);
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
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">客户管理</h1>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          添加客户
        </button>
      </div>

      {customers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无客户</h3>
          <p className="text-gray-500 mb-4">点击上方按钮添加您的第一个客户</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">行业</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">规模</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">联系方式</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                    {customer.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">{customer.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.industry || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.company_size || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {customer.contact_info?.email && (
                      <div className="flex items-center gap-1">
                        <span>📧</span>
                        <span className="truncate max-w-[150px]">{customer.contact_info.email}</span>
                      </div>
                    )}
                    {customer.contact_info?.phone && (
                      <div className="flex items-center gap-1">
                        <span>📱</span>
                        <span>{customer.contact_info.phone}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openViewModal(customer)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      查看
                    </button>
                    <button
                      onClick={() => openEditModal(customer)}
                      className="text-gray-600 hover:text-gray-900 mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(customer)}
                      className="text-red-600 hover:text-red-900"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 创建客户弹窗 */}
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

      {/* 编辑客户弹窗 */}
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

      {/* 查看客户弹窗 */}
      {showViewModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">{selectedCustomer.name}</h2>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedCustomer(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">行业</label>
                    <p className="text-gray-900">{selectedCustomer.industry || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">公司规模</label>
                    <p className="text-gray-900">{selectedCustomer.company_size || '-'}</p>
                  </div>
                </div>
                {selectedCustomer.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">描述</label>
                    <p className="text-gray-900">{selectedCustomer.description}</p>
                  </div>
                )}
                {selectedCustomer.contact_info && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">联系方式</label>
                    <div className="space-y-2">
                      {selectedCustomer.contact_info.email && (
                        <div className="flex items-center gap-2 text-gray-900">
                          <span>📧</span>
                          <span>{selectedCustomer.contact_info.email}</span>
                        </div>
                      )}
                      {selectedCustomer.contact_info.phone && (
                        <div className="flex items-center gap-2 text-gray-900">
                          <span>📱</span>
                          <span>{selectedCustomer.contact_info.phone}</span>
                        </div>
                      )}
                      {selectedCustomer.contact_info.website && (
                        <div className="flex items-center gap-2 text-gray-900">
                          <span>🌐</span>
                          <a
                            href={selectedCustomer.contact_info.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            {selectedCustomer.contact_info.website}
                          </a>
                        </div>
                      )}
                      {selectedCustomer.contact_info.address && (
                        <div className="flex items-center gap-2 text-gray-900">
                          <span>📍</span>
                          <span>{selectedCustomer.contact_info.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="text-xs text-gray-400 pt-4 border-t">
                  创建于 {new Date(selectedCustomer.created_at).toLocaleString('zh-CN')}
                  {' • '}
                  更新于 {new Date(selectedCustomer.updated_at).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  openEditModal(selectedCustomer);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                编辑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 客户表单弹窗组件
function CustomerFormModal({
  title,
  formData,
  setFormData,
  onSubmit,
  onClose,
}: {
  title: string;
  formData: CreateCustomerDto;
  setFormData: (data: CreateCustomerDto) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        </div>
        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">客户名称 *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">行业</label>
                <input
                  type="text"
                  value={formData.industry || ''}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">公司规模</label>
                <input
                  type="text"
                  value={formData.company_size || ''}
                  onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">联系方式</label>
              <div className="space-y-3">
                <input
                  type="email"
                  value={formData.contact_info?.email || ''}
                  onChange={(e) => updateContactInfo('email', e.target.value)}
                  placeholder="邮箱"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <input
                  type="tel"
                  value={formData.contact_info?.phone || ''}
                  onChange={(e) => updateContactInfo('phone', e.target.value)}
                  placeholder="电话"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <input
                  type="url"
                  value={formData.contact_info?.website || ''}
                  onChange={(e) => updateContactInfo('website', e.target.value)}
                  placeholder="网站"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <input
                  type="text"
                  value={formData.contact_info?.address || ''}
                  onChange={(e) => updateContactInfo('address', e.target.value)}
                  placeholder="地址"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </form>
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
