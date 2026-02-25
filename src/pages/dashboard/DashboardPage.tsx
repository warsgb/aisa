import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api.service';
import type { DashboardStats } from '../../types';
import {
  Users,
  Building2,
  MessageSquare,
  TrendingUp,
  Trophy,
  Flame,
  ArrowRight,
} from 'lucide-react';

// Helper function to format relative time
function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN');
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', label: '已完成' },
    RUNNING: { bg: 'bg-blue-100', text: 'text-blue-800', label: '运行中' },
    FAILED: { bg: 'bg-red-100', text: 'text-red-800', label: '失败' },
    PENDING: { bg: 'bg-gray-100', text: 'text-gray-800', label: '等待中' },
    CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-800', label: '已取消' },
  };

  const config = statusConfig[status] || statusConfig.PENDING;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await apiService.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('加载系统总览数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-red-500">加载系统总览数据失败</div>
      </div>
    );
  }

  const { overview, topCustomers, topTeams, recentInteractions } = stats;

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-[#1677FF]" />
          系统总览 Dashboard
        </h1>
        <p className="text-gray-500 mt-1">系统管理员专用数据面板</p>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">总用户数</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{overview.userCount}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-[#1677FF]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">总团队数</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{overview.teamCount}</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-[#1677FF]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">总客户数</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{overview.customerCount}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-[#1677FF]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">总交互数</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{overview.interactionCount}</p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-[#1677FF]" />
            </div>
          </div>
        </div>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Customers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#1677FF]" />
              热门客户 Top 10
            </h2>
          </div>
          <div className="p-4">
            {topCustomers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无数据</p>
            ) : (
              <div className="space-y-2">
                {topCustomers.map((customer, index) => (
                  <div
                    key={customer.customerId}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index < 3
                            ? 'bg-[#1677FF] text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900">{customer.customerName}</span>
                    </div>
                    <span className="text-sm text-gray-500">{customer.interactionCount} 次交互</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Teams */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#1677FF]" />
              热门团队 Top 10
            </h2>
          </div>
          <div className="p-4">
            {topTeams.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无数据</p>
            ) : (
              <div className="space-y-2">
                {topTeams.map((team, index) => (
                  <div
                    key={team.teamId}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index < 3
                            ? 'bg-[#1677FF] text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900">{team.teamName}</span>
                    </div>
                    <span className="text-sm text-gray-500">{team.interactionCount} 次交互</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Interactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#1677FF]" />
            最近交互记录
          </h2>
          <button
            onClick={() => navigate('/interactions')}
            className="text-sm text-[#1677FF] hover:underline flex items-center gap-1"
          >
            查看全部
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {recentInteractions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无交互记录</p>
          ) : (
            recentInteractions.map((interaction) => (
              <div
                key={interaction.id}
                className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-[#1677FF]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {interaction.customer?.name || '无客户'}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-600">{interaction.skill?.name || '未知技能'}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {interaction.team?.name || '未知团队'} • {formatRelativeTime(interaction.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={interaction.status} />
                  <button
                    onClick={() => navigate(`/interactions/${interaction.id}`)}
                    className="text-sm text-[#1677FF] hover:underline"
                  >
                    查看
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
