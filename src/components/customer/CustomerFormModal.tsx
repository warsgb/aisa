import { useState } from 'react';
import { X, Mail, Phone, Globe, MapPin, Save } from 'lucide-react';
import type { CreateCustomerDto } from '../../types';
import { apiService } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CustomerFormModal({ isOpen, onClose, onSuccess }: CustomerFormModalProps) {
  const { team } = useAuth();
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateContactInfo = (field: string, value: string) => {
    setFormData({
      ...formData,
      contact_info: {
        ...formData.contact_info,
        [field]: value,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;

    setIsSubmitting(true);
    try {
      await apiService.createCustomer(team.id, formData);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('创建客户失败:', error);
      alert('创建客户失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
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
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-xl shadow-2xl h-[85vh] sm:max-h-[85vh] flex flex-col rounded-t-2xl">
        {/* Header with Save Button */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0 gap-3">
          <button
            onClick={handleClose}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 truncate">添加新客户</h2>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1677FF] rounded-xl hover:bg-[#4096FF] disabled:opacity-50 transition-colors shrink-0"
          >
            {isSubmitting ? (
              <>提交中...</>
            ) : (
              <>
                <Save className="w-4 h-4" />
                保存
              </>
            )}
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              客户名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 text-sm"
              placeholder="请输入客户名称"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">行业</label>
              <input
                type="text"
                value={formData.industry || ''}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 text-sm"
                placeholder="例如：科技、金融"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">公司规模</label>
              <input
                type="text"
                value={formData.company_size || ''}
                onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 text-sm"
                placeholder="例如：100-500人"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">描述</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 text-sm resize-none"
              placeholder="简要描述客户背景..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              联系方式 <span className="text-xs font-normal text-gray-400">(可选)</span>
            </label>
            <div className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.contact_info?.email || ''}
                  onChange={(e) => updateContactInfo('email', e.target.value)}
                  placeholder="邮箱地址"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 text-sm"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.contact_info?.phone || ''}
                  onChange={(e) => updateContactInfo('phone', e.target.value)}
                  placeholder="联系电话"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 text-sm"
                />
              </div>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="url"
                  value={formData.contact_info?.website || ''}
                  onChange={(e) => updateContactInfo('website', e.target.value)}
                  placeholder="官方网站"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 text-sm"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.contact_info?.address || ''}
                  onChange={(e) => updateContactInfo('address', e.target.value)}
                  placeholder="公司地址"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-[#1677FF]/20 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
