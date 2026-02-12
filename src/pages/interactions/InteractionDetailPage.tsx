import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api.service';
import type { SkillInteraction, InteractionMessage } from '../../types';

export default function InteractionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { team } = useAuth();
  const navigate = useNavigate();
  const [interaction, setInteraction] = useState<SkillInteraction | null>(null);
  const [messages, setMessages] = useState<InteractionMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id || !team) return;
    loadData();
  }, [id, team]);

  const loadData = async () => {
    if (!id || !team) return;
    try {
      setIsLoading(true);
      const [interactionData, messagesData] = await Promise.all([
        apiService.getInteraction(team.id, id),
        apiService.getInteractionMessages(team.id, id),
      ]);
      setInteraction(interactionData);
      setMessages(messagesData);
    } catch (error) {
      console.error('加载交互详情失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'USER':
        return '👤';
      case 'ASSISTANT':
        return '🤖';
      case 'SYSTEM':
        return '⚙️';
      default:
        return '💬';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'USER':
        return '用户';
      case 'ASSISTANT':
        return '助手';
      case 'SYSTEM':
        return '系统';
      default:
        return role;
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

  if (!interaction) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-900 mb-2">交互未找到</h2>
          <p className="text-red-700 mb-4">请检查链接是否正确</p>
          <button
            onClick={() => navigate('/interactions')}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/interactions')}
          className="text-indigo-600 hover:text-indigo-700 mb-4 flex items-center gap-2"
        >
          ← 返回列表
        </button>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {interaction.title || interaction.skill?.name || '技能执行'}
                </h1>
                <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(interaction.status)}`}>
                  {getStatusText(interaction.status)}
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
                <div className="flex items-center gap-1">
                  <span>📅</span>
                  <span>{new Date(interaction.created_at).toLocaleString('zh-CN')}</span>
                </div>
              </div>
            </div>
          </div>

          {interaction.summary && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">摘要</h3>
              <p className="text-gray-600">{interaction.summary}</p>
            </div>
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">对话记录</h2>

        {messages.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-gray-500">暂无消息记录</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`bg-white rounded-lg shadow p-5 ${
                message.role === 'USER' ? 'ml-8' : 'mr-8'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{getRoleIcon(message.role)}</span>
                <div>
                  <div className="font-medium text-gray-900">
                    {getRoleName(message.role)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(message.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>
              </div>

              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700">
                  {message.content}
                </div>
              </div>

              {message.metadata && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    📊 Token: {message.metadata.token_count || 'N/A'} |
                    Model: {message.metadata.model || 'N/A'}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
