import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api.service';
import type { Customer, Skill, SkillInteraction, Document } from '../../types';

export default function DashboardPage() {
  const { team, user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [interactions, setInteractions] = useState<SkillInteraction[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // System admin can access dashboard without a team
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';

  useEffect(() => {
    // System admin doesn't need a team to view dashboard
    if (!team && !isSystemAdmin) {
      navigate('/login');
      return;
    }

    const loadData = async () => {
      try {
        // System admin sees system stats instead of team data
        if (isSystemAdmin) {
          const [customersData, skillsData, interactionsData, documentsData] = await Promise.all([
            apiService.getSystemCustomers(),
            apiService.getSystemSkills(),
            apiService.getSystemInteractions(),
            apiService.getSystemDocuments(),
          ]);
          setCustomers(customersData.data);
          setSkills(skillsData.data);
          setInteractions(interactionsData.data);
          setDocuments(documentsData.data);
        } else if (team) {
          const [customersData, skillsData, interactionsData, documentsData] = await Promise.all([
            apiService.getCustomers(team.id),
            apiService.getSkills(),
            apiService.getInteractions(team.id),
            apiService.getDocuments(team.id),
          ]);
          setCustomers(customersData);
          setSkills(skillsData);
          setInteractions(interactionsData);
          setDocuments(documentsData);
        }
      } catch (error) {
        console.error('加载仪表盘数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [team, navigate, isSystemAdmin]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">客户</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{customers.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">技能</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{skills.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🛠️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">交互</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{interactions.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">💬</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">文档</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{documents.length}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📄</span>
            </div>
          </div>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/customers')}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">客户管理</h3>
          <p className="text-sm text-gray-600">查看和管理您的客户列表</p>
        </button>

        <button
          onClick={() => navigate('/skills')}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">执行技能</h3>
          <p className="text-sm text-gray-600">运行 AI 驱动的售前技能</p>
        </button>

        <button
          onClick={() => navigate('/documents')}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">文档管理</h3>
          <p className="text-sm text-gray-600">浏览生成的文档</p>
        </button>
      </div>

      {/* 最近交互 */}
      {interactions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近交互</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {interactions.slice(0, 5).map((interaction) => (
                <div key={interaction.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{interaction.skill?.name || '未知技能'}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {interaction.customer?.name || '无客户'} • {new Date(interaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      interaction.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      interaction.status === 'RUNNING' ? 'bg-blue-100 text-blue-800' :
                      interaction.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {interaction.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
