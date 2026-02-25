import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { apiService } from '../../services/api.service';
import type { SkillInteraction, InteractionMessage } from '../../types';
import MDEditor from '@uiw/react-md-editor';
import {
  ArrowLeft,
  Home,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Pause,
  Loader2,
  User,
  Bot,
  Settings,
  Edit3,
  Save,
  X,
  FileText,
  Wrench,
  Calendar,
  MessageSquare,
  Info,
  ChevronRight,
} from 'lucide-react';

export default function InteractionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { team } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
      COMPLETED: {
        icon: CheckCircle,
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
        label: '已完成',
      },
      RUNNING: {
        icon: Loader2,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        label: '执行中',
      },
      PENDING: {
        icon: Clock,
        color: 'text-gray-600',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        label: '待处理',
      },
      FAILED: {
        icon: XCircle,
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        label: '失败',
      },
      CANCELLED: {
        icon: Ban,
        color: 'text-gray-500',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        label: '已取消',
      },
      PAUSED: {
        icon: Pause,
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        label: '已暂停',
      },
    };
    return configs[status] || configs.PENDING;
  };

  const getRoleConfig = (role: string) => {
    const configs: Record<string, { icon: React.ElementType; color: string; bg: string; name: string }> = {
      USER: {
        icon: User,
        color: 'text-gray-700',
        bg: 'bg-gray-100',
        name: '用户',
      },
      ASSISTANT: {
        icon: Bot,
        color: 'text-[#1677FF]',
        bg: 'bg-[#1677FF]/10',
        name: '助手',
      },
      SYSTEM: {
        icon: Settings,
        color: 'text-gray-600',
        bg: 'bg-gray-50',
        name: '系统',
      },
    };
    return configs[role] || { icon: MessageSquare, color: 'text-gray-600', bg: 'bg-gray-50', name: role };
  };

  const getStatusColor = (status: string) => {
    const config = getStatusConfig(status);
    return `${config.bg} ${config.color} ${config.border}`;
  };

  const getStatusText = (status: string) => {
    return getStatusConfig(status).label;
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#1677FF]/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-[#1677FF] rounded-full animate-spin"></div>
          </div>
          <p className="mt-6 text-gray-600 font-medium">加载交互详情...</p>
        </div>
      </div>
    );
  }

  if (!interaction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-50 rounded-2xl flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">交互未找到</h2>
            <p className="text-gray-500 mb-6">请检查链接是否正确，或返回列表查看其他记录</p>
            <button
              onClick={() => navigate('/interactions')}
              className="inline-flex items-center gap-2 bg-[#1677FF] text-white px-6 py-3 rounded-xl hover:bg-[#4096FF] transition-all duration-200 font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              返回列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(interaction.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className={isMobile ? 'px-4 py-2' : 'max-w-5xl mx-auto p-6'}>
        {/* 头部导航 - PC only */}
        {!isMobile && (
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={() => navigate('/interactions')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-[#1677FF] hover:bg-white rounded-xl transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              返回列表
            </button>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-[#1677FF] hover:bg-white rounded-xl transition-all duration-200"
            >
              <Home className="w-4 h-4" />
              返回首页
            </button>
          </div>
        )}

        {/* 交互信息卡片 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">
                  {interaction.title || interaction.skill?.name || '技能执行'}
                </h1>
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${getStatusColor(interaction.status)}`}>
                  <StatusIcon className={`w-4 h-4 ${interaction.status === 'RUNNING' ? 'animate-spin' : ''}`} />
                  {getStatusText(interaction.status)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-500">
                {interaction.skill && (
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{interaction.skill.name}</span>
                  </div>
                )}
                {interaction.customer && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{interaction.customer.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{new Date(interaction.created_at).toLocaleString('zh-CN')}</span>
                </div>
              </div>
            </div>
          </div>

          {interaction.summary && (
            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-[#1677FF]/10 rounded-lg flex items-center justify-center">
                  <Info className="w-4 h-4 text-[#1677FF]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">执行摘要</h3>
                  <p className="text-gray-600 leading-relaxed">{interaction.summary}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 消息列表 */}
        <div>
          <div className="flex items-center gap-3 mb-6 px-2">
            <MessageSquare className="w-6 h-6 text-[#1677FF]" />
            <h2 className="text-xl font-bold text-gray-900">对话记录</h2>
            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
              {messages.length} 条消息
            </span>
          </div>

          {messages.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-gray-50 rounded-2xl flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无消息记录</h3>
              <p className="text-gray-500">该交互暂无详细对话内容</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const roleConfig = getRoleConfig(message.role);
                const RoleIcon = roleConfig.icon;
                const isUser = message.role === 'USER';

                return (
                  <div
                    key={message.id}
                    className={`bg-white shadow-sm border ${isUser ? 'border-gray-100 mr-0 ml-12' : 'border-[#1677FF]/10 mr-12 ml-0'} overflow-hidden transition-all duration-200`}
                  >
                    {/* Message Header */}
                    <div className={`px-6 py-4 ${isUser ? 'bg-gray-50' : 'bg-gradient-to-r from-[#1677FF]/5 to-transparent'} border-b border-gray-100`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${roleConfig.bg} flex items-center justify-center`}>
                            <RoleIcon className={`w-5 h-5 ${roleConfig.color}`} />
                          </div>
                          <div>
                            <div className={`font-semibold ${isUser ? 'text-gray-900' : 'text-[#1677FF]'}`}>
                              {roleConfig.name}
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(message.created_at).toLocaleString('zh-CN')}
                            </div>
                          </div>
                        </div>

                        {/* Edit button */}
                        {editingMessageId !== message.id && (
                          <button
                            onClick={() => handleEditClick(message)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-[#1677FF] hover:bg-[#1677FF]/10 rounded-lg transition-all duration-200"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            编辑
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className="p-6">
                      {editingMessageId === message.id ? (
                        /* Edit mode */
                        <div className="space-y-4" data-color-mode="light">
                          <MDEditor
                            value={editContent}
                            onChange={(v) => setEditContent(v || '')}
                            height={300}
                            className="rounded-xl overflow-hidden"
                          />
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={handleCancelEdit}
                              disabled={isSaving}
                              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all duration-200 font-medium"
                            >
                              <X className="w-4 h-4" />
                              取消
                            </button>
                            <button
                              onClick={() => handleSaveEdit(message.id)}
                              disabled={isSaving}
                              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm bg-[#1677FF] text-white rounded-xl hover:bg-[#4096FF] disabled:opacity-50 transition-all duration-200 font-medium shadow-lg shadow-[#1677FF]/30"
                            >
                              {isSaving && (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              )}
                              <Save className="w-4 h-4" />
                              保存
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* View mode */
                        <>
                          <div className={`prose max-w-none prose-headings:font-semibold prose-a:text-[#1677FF] prose-a:no-underline hover:prose-a:underline ${isMobile ? 'prose-sm prose-p:text-sm' : ''}`} data-color-mode="light">
                            <MDEditor.Markdown source={message.content} />
                          </div>

                          {message.metadata && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <div className="flex items-center gap-4 text-xs text-gray-400">
                                <span className="inline-flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5" />
                                  Token: {message.metadata.token_count || 'N/A'}
                                </span>
                                {message.metadata.model && (
                                  <span className="inline-flex items-center gap-1">
                                    <Bot className="w-3.5 h-3.5" />
                                    {message.metadata.model}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
