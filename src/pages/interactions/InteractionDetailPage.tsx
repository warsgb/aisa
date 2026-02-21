import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api.service';
import type { SkillInteraction, InteractionMessage } from '../../types';
import MDEditor from '@uiw/react-md-editor';

export default function InteractionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { team } = useAuth();
  const navigate = useNavigate();
  const [interaction, setInteraction] = useState<SkillInteraction | null>(null);
  const [messages, setMessages] = useState<InteractionMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const handleEditClick = (message: InteractionMessage) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!team || !id) return;

    setIsSaving(true);
    try {
      await apiService.updateInteractionMessage(team.id, id, messageId, {
        content: editContent,
      });

      // Update local state
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, content: editContent } : msg
        )
      );

      setEditingMessageId(null);
      setEditContent('');
    } catch (error) {
      console.error('保存消息失败:', error);
      alert('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1677FF]"></div>
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
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/interactions')}
            className="text-[#1677FF] hover:text-[#4096FF] flex items-center gap-2"
          >
            ← 返回列表
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-[#1677FF] flex items-center gap-2"
          >
            ← 返回首页
          </button>
        </div>

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
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
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
                {/* Edit button */}
                {editingMessageId !== message.id && (
                  <button
                    onClick={() => handleEditClick(message)}
                    className="text-xs px-3 py-1.5 text-gray-500 hover:text-[#1677FF] hover:bg-[#1677FF]/10 rounded-lg transition-colors flex items-center gap-1"
                  >
                    ✏️ 编辑
                  </button>
                )}
              </div>

              {editingMessageId === message.id ? (
                /* Edit mode */
                <div className="space-y-4" data-color-mode="light">
                  <MDEditor
                    value={editContent}
                    onChange={(v) => setEditContent(v || '')}
                    height={300}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleSaveEdit(message.id)}
                      disabled={isSaving}
                      className="px-4 py-2 text-sm bg-[#1677FF] text-white rounded-lg hover:bg-[#4096FF] disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {isSaving && (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      )}
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <>
                  <div className="prose max-w-none" data-color-mode="light">
                    <MDEditor.Markdown source={message.content} />
                  </div>

                  {message.metadata && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        📊 Token: {message.metadata.token_count || 'N/A'} |
                        Model: {message.metadata.model || 'N/A'}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
