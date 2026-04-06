import { useState, useEffect } from 'react';
import { apiService } from '../../services/api.service';
import type { CustomerFollowup } from '../../types';
import { MessageSquare, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';

interface FollowupListProps {
  teamId: string;
  customerId: string;
}

export function FollowupList({ teamId, customerId }: FollowupListProps) {
  const [followups, setFollowups] = useState<CustomerFollowup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    loadFollowups();
  }, [teamId, customerId]);

  const loadFollowups = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getCustomerFollowups(teamId, customerId);
      setFollowups(data);
    } catch (err) {
      console.error('加载跟进记录失败', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    setIsSaving(true);
    try {
      const created = await apiService.createCustomerFollowup(teamId, customerId, { content: newContent });
      setFollowups(prev => [created, ...prev]);
      setNewContent('');
      setIsAdding(false);
    } catch {
      alert('添加失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该跟进记录？')) return;
    try {
      await apiService.deleteCustomerFollowup(teamId, customerId, id);
      setFollowups(prev => prev.filter(f => f.id !== id));
    } catch {
      alert('删除失败，请重试');
    }
  };

  const startEdit = (f: CustomerFollowup) => {
    setEditingId(f.id);
    setEditContent(f.content);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || !editingId) return;
    setIsSaving(true);
    try {
      const updated = await apiService.updateCustomerFollowup(teamId, customerId, editingId, { content: editContent });
      setFollowups(prev => prev.map(f => f.id === editingId ? updated : f));
      setEditingId(null);
      setEditContent('');
    } catch {
      alert('更新失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-4">
      {/* Add new follow-up */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 mt-1 flex-shrink-0 bg-[#1677FF]/10 text-[#1677FF] rounded-lg flex items-center justify-center">
          <Plus className="w-4 h-4" />
        </div>
        <div className="flex-1">
          {isAdding ? (
            <div className="space-y-2">
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="填写跟进内容..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1677FF]/30 focus:border-[#1677FF]"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setIsAdding(false); setNewContent(''); }}
                  className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAdd}
                  disabled={isSaving || !newContent.trim()}
                  className="px-3 py-1.5 text-sm text-white bg-[#1677FF] rounded-lg hover:bg-[#4096FF] disabled:opacity-50 flex items-center gap-1 transition-colors"
                >
                  {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                  保存
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full text-left px-3 py-2 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg hover:border-[#1677FF] hover:text-[#1677FF] transition-colors"
            >
              添加跟进记录...
            </button>
          )}
        </div>
      </div>

      {/* Follow-up list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-[#1677FF] animate-spin" />
        </div>
      ) : followups.length === 0 && !isAdding ? (
        <div className="text-center py-6">
          <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">暂无跟进记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {followups.map(f => (
            <div key={f.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              {editingId === f.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1677FF]/30 focus:border-[#1677FF]"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setEditingId(null); setEditContent(''); }}
                      className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSaving || !editContent.trim()}
                      className="px-3 py-1.5 text-sm text-white bg-[#1677FF] rounded-lg hover:bg-[#4096FF] disabled:opacity-50 flex items-center gap-1"
                    >
                      {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{f.content}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{f.user?.full_name || '未知用户'}</span>
                      <span>·</span>
                      <span>{formatDate(f.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(f)}
                        className="p-1.5 text-gray-400 hover:text-[#1677FF] hover:bg-[#1677FF]/5 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
