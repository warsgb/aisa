import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api.service';
import type { SkillInteraction, Customer, Skill } from '../../types';

export default function InteractionsPage() {
  const { team } = useAuth();
  const navigate = useNavigate();
  const [interactions, setInteractions] = useState<SkillInteraction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCustomer, setFilterCustomer] = useState<string>('');
  const [filterSkill, setFilterSkill] = useState<string>('');

  useEffect(() => {
    if (!team) return;
    loadData();
  }, [team]);

  useEffect(() => {
    if (!team) return;
    loadInteractions();
  }, [team, filterCustomer, filterSkill]);

  const loadData = async () => {
    if (!team) return;
    try {
      const [customersData, skillsData] = await Promise.all([
        apiService.getCustomers(team.id),
        apiService.getSkills(),
      ]);
      setCustomers(customersData);
      setSkills(skillsData);
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  const loadInteractions = async () => {
    if (!team) return;
    try {
      setIsLoading(true);
      const filters: { customerId?: string; skillId?: string } = {};
      if (filterCustomer) filters.customerId = filterCustomer;
      if (filterSkill) filters.skillId = filterSkill;
      const data = await apiService.getInteractions(team.id, filters);
      setInteractions(data);
    } catch (error) {
      console.error('加载交互失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-gray-100 text-gray-700',
      RUNNING: 'bg-blue-100 text-blue-700',
      PAUSED: 'bg-yellow-100 text-yellow-700',
      COMPLETED: 'bg-green-100 text-green-700',
      FAILED: 'bg-red-100 text-red-700',
      CANCELLED: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
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
        <h1 className="text-2xl font-bold text-gray-900">交互历史</h1>
        <button
          onClick={() => navigate('/skills')}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          执行新技能
        </button>
      </div>

      {/* 筛选器 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">按客户筛选</label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">全部客户</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">按技能筛选</label>
            <select
              value={filterSkill}
              onChange={(e) => setFilterSkill(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
              className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              清除筛选
            </button>
          </div>
        </div>
      </div>

      {/* 交互列表 */}
      {interactions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无交互记录</h3>
          <p className="text-gray-500 mb-6">执行技能后，交互记录将显示在这里</p>
          <button
            onClick={() => navigate('/skills')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            执行第一个技能
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {interactions.map((interaction) => (
            <div
              key={interaction.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewInteraction(interaction)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {interaction.title || interaction.skill?.name || '未知技能'}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(interaction.status)}`}>
                        {getStatusText(interaction.status)}
                      </span>
                    </div>
                    {interaction.summary && (
                      <p className="text-gray-600 text-sm line-clamp-2 mb-2">{interaction.summary}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                    {formatDate(interaction.created_at)}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {interaction.skill && (
                    <div className="flex items-center gap-1">
                      <span>🛠️</span>
                      <span>{interaction.skill.name}</span>
                    </div>
                  )}
                  {interaction.customer && (
                    <div className="flex items-center gap-1">
                      <span>👤</span>
                      <span>{interaction.customer.name}</span>
                    </div>
                  )}
                  {interaction.started_at && (
                    <div className="flex items-center gap-1">
                      <span>⏱️</span>
                      <span>
                        {interaction.completed_at
                          ? `${Math.round((new Date(interaction.completed_at).getTime() - new Date(interaction.started_at).getTime()) / 1000)}秒`
                          : '进行中'}
                      </span>
                    </div>
                  )}
                </div>

                {interaction.messages && interaction.messages.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      💬 {interaction.messages.length} 条消息
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
