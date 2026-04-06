import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api.service';
import type { Document, Customer } from '../../types';

export default function DocumentsPage() {
  const { team, user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [filterCustomer, setFilterCustomer] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    customer_id: '',
  });
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';

  useEffect(() => {
    if (!team && !isSystemAdmin) return;
    loadCustomers();
  }, [team, isSystemAdmin]);

  useEffect(() => {
    if (!team && !isSystemAdmin) return;
    loadDocuments();
  }, [team, isSystemAdmin, filterCustomer]);

  const loadCustomers = async () => {
    try {
      if (isSystemAdmin) {
        const data = await apiService.getSystemCustomers();
        setCustomers(data.data);
      } else if (team) {
        const data = await apiService.getCustomers(team.id);
        setCustomers(data);
      }
    } catch (error) {
      console.error('加载客户失败:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      if (isSystemAdmin) {
        const data = await apiService.getSystemDocuments();
        setDocuments(data.data);
      } else if (team) {
        const data = filterCustomer
          ? await apiService.getDocuments(team.id, filterCustomer)
          : await apiService.getDocuments(team.id);
        setDocuments(data);
      }
    } catch (error) {
      console.error('加载文档失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    if (!team || !formData.title.trim()) return;

    try {
      await apiService.createDocument(team.id, {
        title: formData.title,
        content: formData.content,
        format: 'markdown',
        customer_id: formData.customer_id || undefined,
      });
      setShowNewModal(false);
      setFormData({ title: '', content: '', customer_id: '' });
      loadDocuments();
    } catch (error) {
      console.error('创建文档失败:', error);
      alert('创建文档失败');
    }
  };

  const handleUpdateDocument = async () => {
    if (!team || !selectedDoc) return;

    try {
      await apiService.updateDocument(team.id, selectedDoc.id, {
        title: formData.title,
        content: formData.content,
        customer_id: formData.customer_id || undefined,
        change_description: '手动更新',
      });
      setShowEditModal(false);
      setSelectedDoc(null);
      setFormData({ title: '', content: '', customer_id: '' });
      loadDocuments();
    } catch (error) {
      console.error('更新文档失败:', error);
      alert('更新文档失败');
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (!team) return;
    if (!confirm(`确定要删除文档 "${doc.title}" 吗？`)) return;

    try {
      await apiService.deleteDocument(team.id, doc.id);
      loadDocuments();
    } catch (error) {
      console.error('删除文档失败:', error);
      alert('删除文档失败');
    }
  };

  const openEditModal = (doc: Document) => {
    setSelectedDoc(doc);
    setFormData({
      title: doc.title,
      content: doc.content,
      customer_id: doc.customer?.id || '',
    });
    setShowEditModal(true);
  };

  const openViewModal = (doc: Document) => {
    navigate(`/documents/${doc.id}`, { state: { document: doc } });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">文档管理</h1>
        <button
          onClick={() => setShowNewModal(true)}
          className="bg-[#1677FF] text-white px-4 py-2 rounded-lg hover:bg-[#4096FF]"
        >
          新建文档
        </button>
      </div>

      {/* 筛选和搜索 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">按客户筛选</label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF]"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索文档</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索标题或内容..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF]"
            />
          </div>
        </div>
      </div>

      {/* 文档列表 */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无文档</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || filterCustomer ? '没有找到匹配的文档' : '点击上方按钮创建您的第一个文档'}
          </p>
          {!searchQuery && !filterCustomer && (
            <button
              onClick={() => setShowNewModal(true)}
              className="bg-[#1677FF] text-white px-6 py-2 rounded-lg hover:bg-[#4096FF]"
            >
              创建文档
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 flex-1 line-clamp-1">
                    {doc.title}
                  </h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded ml-2">
                    MD
                  </span>
                </div>
                {doc.customer && (
                  <div className="text-sm text-gray-500 mb-2">👤 {doc.customer.name}</div>
                )}
                <p className="text-sm text-gray-600 line-clamp-3 mb-4 min-h-[60px]">
                  {doc.content.substring(0, 150)}...
                </p>
                <div className="text-xs text-gray-400 mb-4">
                  更新于 {formatDate(doc.updated_at)}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openViewModal(doc)}
                    className="flex-1 bg-[#1677FF] text-white px-3 py-2 rounded-lg text-sm hover:bg-[#4096FF]"
                  >
                    查看
                  </button>
                  <button
                    onClick={() => openEditModal(doc)}
                    className="flex-1 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(doc)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新建文档弹窗 */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">新建文档</h2>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">所属客户</label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF]"
                  >
                    <option value="">不关联客户</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">可选择关联此文档到特定客户</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF]"
                    placeholder="请输入文档标题"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF] font-mono text-sm"
                    placeholder="请输入文档内容（支持 Markdown 格式）"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setFormData({ title: '', content: '', customer_id: '' });
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleCreateDocument}
                disabled={!formData.title.trim()}
                className="px-4 py-2 bg-[#1677FF] text-white rounded-lg hover:bg-[#4096FF] disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑文档弹窗 */}
      {showEditModal && selectedDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">编辑文档</h2>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">所属客户</label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF]"
                  >
                    <option value="">不关联客户</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">可选择关联此文档到特定客户</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF] font-mono text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedDoc(null);
                  setFormData({ title: '', content: '', customer_id: '' });
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleUpdateDocument}
                disabled={!formData.title.trim()}
                className="px-4 py-2 bg-[#1677FF] text-white rounded-lg hover:bg-[#4096FF] disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
