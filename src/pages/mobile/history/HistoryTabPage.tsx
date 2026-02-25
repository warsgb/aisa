import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, Loader, AlertCircle, Filter } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCurrentCustomerStore } from '../../../stores/currentCustomer.store';
import { apiService } from '../../../services/api.service';
import type { SkillInteraction } from '../../../types';

type StatusFilter = 'all' | 'completed' | 'running' | 'failed';

/**
 * History Tab Page - Mobile interaction history
 * Shows timeline of all skill executions with filtering
 */
export function HistoryTabPage() {
  const { team } = useAuth();
  const { currentCustomer } = useCurrentCustomerStore();
  const navigate = useNavigate();

  const [interactions, setInteractions] = useState<SkillInteraction[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Load interactions
  useEffect(() => {
    const loadInteractions = async () => {
      if (!team) return;
      setIsLoading(true);
      try {
        const data = await apiService.getInteractions(
          team.id,
          currentCustomer ? { customerId: currentCustomer.id } : undefined
        );
        setInteractions(data);
      } catch (error) {
        console.error('Failed to load interactions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInteractions();
  }, [team, currentCustomer]);

  // Filter interactions by status
  const filteredInteractions = interactions.filter((interaction) => {
    if (statusFilter === 'all') return true;
    return interaction.status.toLowerCase() === statusFilter;
  });

  const getStatusIcon = (status: string) => {
    const iconClass = 'w-5 h-5';
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className={`${iconClass} text-green-500`} />;
      case 'FAILED':
        return <XCircle className={`${iconClass} text-red-500`} />;
      case 'RUNNING':
        return <Loader className={`${iconClass} text-blue-500 animate-spin`} />;
      case 'CANCELLED':
        return <AlertCircle className={`${iconClass} text-gray-400`} />;
      default:
        return <Clock className={`${iconClass} text-gray-400`} />;
    }
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      COMPLETED: '已完成',
      FAILED: '失败',
      RUNNING: '运行中',
      PENDING: '等待中',
      CANCELLED: '已取消',
      PAUSED: '已暂停',
    };
    return labels[status] || status;
  };

  const formatDateTime = (dateString: string) => {
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

    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'completed', label: '已完成' },
    { key: 'running', label: '运行中' },
    { key: 'failed', label: '失败' },
  ];

  return (
    <div className="px-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">执行历史</h2>
        <button
          onClick={() => setShowFilterMenu(!showFilterMenu)}
          className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Filter className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Filter Pills */}
      {showFilterMenu && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${
                  statusFilter === filter.key
                    ? 'bg-[#1677FF] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }
              `}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {/* Current Customer Indicator */}
      {currentCustomer && (
        <div className="bg-gradient-to-r from-[#1677FF]/10 to-blue-50 rounded-xl p-3 mb-4 border border-[#1677FF]/20">
          <p className="text-xs text-gray-500 mb-1">当前筛选客户</p>
          <p className="text-sm font-semibold text-[#1677FF]">{currentCustomer.name}</p>
        </div>
      )}

      {/* Interactions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : filteredInteractions.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {statusFilter !== 'all' ? '没有符合条件的记录' : '暂无执行记录'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInteractions.map((interaction) => (
            <button
              key={interaction.id}
              onClick={() => navigate(`/interactions/${interaction.id}`)}
              className="w-full bg-white rounded-xl p-4 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 text-left"
            >
              <div className="flex items-start gap-3">
                {/* Status Icon with Gradient Background */}
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center shrink-0
                    ${
                      interaction.status === 'COMPLETED'
                        ? 'bg-gradient-to-br from-green-400 to-green-500'
                        : interaction.status === 'FAILED'
                        ? 'bg-gradient-to-br from-red-400 to-red-500'
                        : interaction.status === 'RUNNING'
                        ? 'bg-gradient-to-br from-blue-400 to-blue-500'
                        : 'bg-gradient-to-br from-purple-400 to-purple-500'
                    }
                  `}
                >
                  {getStatusIcon(interaction.status)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {interaction.title || interaction.skill?.name || '未知技能'}
                      </h3>
                      {interaction.customer && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {interaction.customer.name}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatDateTime(interaction.created_at)}
                    </span>
                  </div>

                  {/* Summary */}
                  {interaction.summary && (
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1.5">
                      {interaction.summary}
                    </p>
                  )}

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`
                        px-2 py-0.5 rounded-full text-xs font-medium
                        ${
                          interaction.status === 'COMPLETED'
                            ? 'bg-green-50 text-green-600'
                            : interaction.status === 'FAILED'
                            ? 'bg-red-50 text-red-600'
                            : interaction.status === 'RUNNING'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-purple-50 text-purple-600'
                        }
                      `}
                    >
                      {getStatusLabel(interaction.status)}
                    </span>
                    {interaction.node_id && (
                      <span className="text-xs text-gray-400">
                        LTC节点
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Load More (if more than 20 items) */}
      {interactions.length > 20 && (
        <button
          onClick={() => navigate('/interactions')}
          className="w-full mt-4 py-3 text-[#1677FF] text-sm font-medium hover:text-[#1677FF]/80 transition-colors"
        >
          查看全部记录
        </button>
      )}
    </div>
  );
}
