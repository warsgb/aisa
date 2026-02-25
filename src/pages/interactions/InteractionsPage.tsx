import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api.service';
import type { SkillInteraction, Customer, Skill } from '../../types';
import {
  Filter,
  X,
  Clock,
  User,
  Wrench,
  MessageSquare,
  Calendar,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function InteractionsPage() {
  const { team, user } = useAuth();
  const navigate = useNavigate();
  const [interactions, setInteractions] = useState<SkillInteraction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCustomer, setFilterCustomer] = useState<string>('');
  const [filterSkill, setFilterSkill] = useState<string>('');
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';

  useEffect(() => {
    if (!team && !isSystemAdmin) return;
    loadData();
  }, [team, isSystemAdmin]);

  useEffect(() => {
    if (!team && !isSystemAdmin) return;
    loadInteractions();
  }, [team, isSystemAdmin, filterCustomer, filterSkill]);

  const loadData = async () => {
    try {
      if (isSystemAdmin) {
        const [customersData, skillsData] = await Promise.all([
          apiService.getSystemCustomers(),
          apiService.getSystemSkills(),
        ]);
        setCustomers(customersData.data);
        // 只显示已启用的技能
        setSkills(skillsData.data.filter(skill => skill.is_enabled !== false));
      } else if (team) {
        const [customersData, skillsData] = await Promise.all([
          apiService.getCustomers(team.id),
          apiService.getSkills(),
        ]);
        setCustomers(customersData);
        // 只显示已启用的技能
        setSkills(skillsData.filter(skill => skill.is_enabled !== false));
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  const loadInteractions = async () => {
    try {
      setIsLoading(true);
      if (isSystemAdmin) {
        const data = await apiService.getSystemInteractions();
        setInteractions(data.data);
      } else if (team) {
        const filters: { customerId?: string; skillId?: string } = {};
        if (filterCustomer) filters.customerId = filterCustomer;
        if (filterSkill) filters.skillId = filterSkill;
        const data = await apiService.getInteractions(team.id, filters);
        setInteractions(data);
      }
    } catch (error) {
      console.error('加载交互失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bg: string; border: string; icon: string }> = {
      PENDING: {
        color: 'text-gray-600',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        icon: '⏳',
      },
      RUNNING: {
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: '🔄',
      },
      PAUSED: {
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        icon: '⏸️',
      },
      COMPLETED: {
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: '✅',
      },
      FAILED: {
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: '❌',
      },
      CANCELLED: {
        color: 'text-gray-500',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        icon: '🚫',
      },
    };
    return configs[status] || configs.PENDING;
  };

  const getStatusColor = (status: string) => {
    const config = getStatusConfig(status);
    return `${config.bg} ${config.color} ${config.border}`;
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      PENDING: '等待中',
      RUNNING: '运行中',
      PAUSED: '已暂停',
      COMPLETED: '已完成',
      FAILED: '失败',
      CANCELLED: '已取消',
    };
    return texts[status] || status;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const handleViewInteraction = (interaction: SkillInteraction) => {
    navigate(`/interactions/${interaction.id}`, { state: { interaction } });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#1677FF]/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-[#1677FF] rounded-full animate-spin"></div>
          </div>
          <p className="mt-6 text-gray-600 font-medium">加载交互记录...</p>
        </div>
      </div>
    );
  }

  const hasActiveFilters = filterCustomer || filterSkill;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面头部 */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <span className="w-10 h-10 bg-[#1677FF] rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </span>
                交互历史
              </h1>
              <p className="text-gray-500">查看和管理所有技能执行记录</p>
            </div>
            <button
              onClick={() => navigate('/skills')}
              className="inline-flex items-center gap-2 bg-[#1677FF] text-white px-6 py-3 rounded-xl hover:bg-[#4096FF] transition-all duration-200 shadow-lg shadow-[#1677FF]/30 hover:shadow-xl hover:shadow-[#1677FF]/40 font-medium"
            >
              <Sparkles className="w-5 h-5" />
              执行新技能
            </button>
          </div>
        </div>

        {/* 筛选器 - 新设计 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900">筛选条件</h2>
            {hasActiveFilters && (
              <span className="ml-2 px-2 py-0.5 bg-[#1677FF]/10 text-[#1677FF] text-xs font-medium rounded-full">
                已筛选
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                按客户筛选
              </label>
              <select
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF] transition-all appearance-none bg-white"
              >
                <option value="">全部客户</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-gray-400" />
                按技能筛选
              </label>
              <select
                value={filterSkill}
                onChange={(e) => setFilterSkill(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF] transition-all appearance-none bg-white"
              >
                <option value="">全部技能</option>
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterCustomer('');
                  setFilterSkill('');
                }}
                disabled={!hasActiveFilters}
                className="w-full px-4 py-3 text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-medium"
              >
                <X className="w-4 h-4" />
                清除筛选
              </button>
            </div>
          </div>
        </div>

      {/* 交互列表 */}
      {interactions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#1677FF]/10 to-[#1677FF]/5 rounded-2xl flex items-center justify-center">
            <MessageSquare className="w-10 h-10 text-[#1677FF]/40" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">暂无交互记录</h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">执行技能后，交互记录将显示在这里，帮助您追踪与客户的每一次沟通</p>
          <button
            onClick={() => navigate('/skills')}
            className="inline-flex items-center gap-2 bg-[#1677FF] text-white px-8 py-3 rounded-xl hover:bg-[#4096FF] transition-all duration-200 shadow-lg shadow-[#1677FF]/30 hover:shadow-xl hover:shadow-[#1677FF]/40 font-medium"
          >
            <Sparkles className="w-5 h-5" />
            执行第一个技能
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {interactions.map((interaction) => {
            const statusConfig = getStatusConfig(interaction.status);

            return (
              <div
                key={interaction.id}
                className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-100 hover:border-[#1677FF]/20 overflow-hidden"
                onClick={() => handleViewInteraction(interaction)}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${statusConfig.bg} border ${statusConfig.border} flex items-center justify-center text-xl`}>
                      {statusConfig.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#1677FF] transition-colors">
                          {interaction.title || interaction.skill?.name || '未知技能'}
                        </h3>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(interaction.status)}`}>
                          <span>{statusConfig.icon}</span>
                          {getStatusText(interaction.status)}
                        </span>
                      </div>

                      {interaction.summary && (
                        <p className="text-gray-600 text-sm line-clamp-2 mb-3">{interaction.summary}</p>
                      )}

                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
                        {interaction.skill && (
                          <div className="flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-gray-400" />
                            <span>{interaction.skill.name}</span>
                          </div>
                        )}
                        {interaction.customer && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>{interaction.customer.name}</span>
                          </div>
                        )}
                        {interaction.started_at && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>
                              {interaction.completed_at
                                ? `${Math.round((new Date(interaction.completed_at).getTime() - new Date(interaction.started_at).getTime()) / 1000)}秒`
                                : '进行中'}
                            </span>
                          </div>
                        )}
                        {interaction.messages && interaction.messages.length > 0 && (
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-gray-400" />
                            <span>{interaction.messages.length} 条消息</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Time & Arrow */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(interaction.created_at)}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="w-5 h-5 text-[#1677FF]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
