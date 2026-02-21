import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api.service';
import { webSocketService } from '../../services/websocket.service';
import type { Skill, Customer } from '../../types';

export default function SkillsPage() {
  const { team, user } = useAuth();
  const navigate = useNavigate();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showStreamingModal, setShowStreamingModal] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';

  useEffect(() => {
    loadSkills();
    loadCustomers();
    // Connect WebSocket when user is available and has a team
    if (user && team) {
      const token = localStorage.getItem('access_token');
      if (token) {
        webSocketService.connect(token);
      }
    }
    return () => {
      // Don't disconnect on unmount, as WebSocket should stay connected
    };
  }, [user, team]);

  const loadSkills = async () => {
    try {
      if (isSystemAdmin) {
        const data = await apiService.getSystemSkills();
        setSkills(data.data);
      } else {
        const data = await apiService.getSkills();
        setSkills(data);
      }
    } catch (error) {
      console.error('加载技能失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleExecuteSkill = async () => {
    if (isSystemAdmin) {
      alert('系统管理员无法执行技能，请使用普通用户账号');
      return;
    }
    if (!selectedSkill || !selectedCustomer || !team) {
      alert('请选择技能和客户');
      return;
    }

    // Validate required parameters
    const missingParams = selectedSkill.parameters
      ?.filter(p => p.required && !parameters[p.name])
      .map(p => p.label);

    if (missingParams && missingParams.length > 0) {
      alert(`请填写必填参数: ${missingParams.join(', ')}`);
      return;
    }

    setIsExecuting(true);
    setStreamingContent('');
    setExecutionError(null);
    setShowStreamingModal(true);

    try {
      webSocketService.executeSkill(
        {
          skillId: selectedSkill.id,
          teamId: team.id,
          customerId: selectedCustomer,
          parameters,
        },
        {
          onStart: (data) => {
            console.log('Execution started:', data);
          },
          onChunk: (data) => {
            setStreamingContent(prev => prev + data.chunk);
          },
          onComplete: (data) => {
            setIsExecuting(false);
            console.log('Execution completed:', data);
            // Navigate to interaction detail after a short delay
            setTimeout(() => {
              setShowStreamingModal(false);
              navigate(`/interactions/${data.interactionId}`);
            }, 1000);
          },
          onError: (data) => {
            setIsExecuting(false);
            setExecutionError(data.message);
            console.error('Execution error:', data);
          },
        }
      );
    } catch (error: any) {
      setIsExecuting(false);
      setExecutionError(error.message || '执行失败');
    }
  };

  const handleCancelExecution = () => {
    // This would need to be implemented with cancelSkill
    setIsExecuting(false);
    setShowStreamingModal(false);
    setStreamingContent('');
  };

  if (isLoading) {
    return <div className="p-6">加载中...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">技能中心</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 技能列表 */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">可用技能</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className={`bg-white rounded-lg shadow p-5 cursor-pointer transition-all ${
                  selectedSkill?.id === skill.id ? 'ring-2 ring-[#1677FF]' : 'hover:shadow-md'
                }`}
                onClick={() => {
                  setSelectedSkill(skill);
                  setParameters({});
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{skill.name}</h3>
                  {skill.category && (
                    <span className="text-xs bg-[#1677FF]/10 text-[#1677FF] px-2 py-1 rounded">
                      {skill.category}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{skill.description}</p>
                {skill.usage_hint && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mb-2">
                    💡 {skill.usage_hint}
                  </div>
                )}
                {skill.parameters && skill.parameters.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    参数: {skill.parameters.map(p => p.label).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {skills.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">🛠️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无可用技能</h3>
              <p className="text-gray-500">系统正在准备技能...</p>
            </div>
          )}
        </div>

        {/* 技能执行面板 */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">执行技能</h2>
          <div className="bg-white rounded-lg shadow p-5 sticky top-6">
            {selectedSkill ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedSkill.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedSkill.description}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">选择客户 *</label>
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF]"
                    required
                  >
                    <option value="">请选择客户</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                  {customers.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      请先在客户管理页面添加客户
                    </p>
                  )}
                </div>

                {selectedSkill.parameters && selectedSkill.parameters.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">技能参数</label>
                    {selectedSkill.parameters.map((param) => (
                      <div key={param.name} className="mb-3">
                        <label className="block text-xs text-gray-600 mb-1">
                          {param.label} <span className="text-gray-400">({param.name})</span>
                          {param.required && <span className="text-red-500"> *</span>}
                        </label>
                        {param.options ? (
                          <select
                            value={parameters[param.name] || ''}
                            onChange={(e) => setParameters({ ...parameters, [param.name]: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF]"
                            required={param.required}
                          >
                            <option value="">请选择</option>
                            {param.options.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : param.type === 'text' || param.type === 'string' ? (
                          <textarea
                            value={parameters[param.name] || ''}
                            onChange={(e) => setParameters({ ...parameters, [param.name]: e.target.value })}
                            placeholder={param.placeholder || ''}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF]"
                            required={param.required}
                          />
                        ) : (
                          <input
                            type={param.type === 'number' ? 'number' : 'text'}
                            value={parameters[param.name] || ''}
                            onChange={(e) => setParameters({ ...parameters, [param.name]: e.target.value })}
                            placeholder={param.placeholder || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF]"
                            required={param.required}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleExecuteSkill}
                  disabled={isExecuting || !selectedCustomer}
                  className="w-full bg-[#1677FF] text-white py-2 px-4 rounded-lg hover:bg-[#4096FF] disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isExecuting ? '执行中...' : '执行技能'}
                </button>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">👈</div>
                <p>请选择一个技能</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 流式响应弹窗 */}
      {showStreamingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedSkill?.name} - 执行中
              </h2>
              {!isExecuting && (
                <button
                  onClick={() => setShowStreamingModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              {executionError ? (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                  <p className="font-semibold mb-2">执行出错</p>
                  <p>{executionError}</p>
                </div>
              ) : isExecuting || streamingContent ? (
                <div className="prose max-w-none">
                  <div className="text-sm text-gray-500 mb-4">
                    {isExecuting && <span className="inline-block animate-pulse">●</span>} AI 响应：
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-gray-800">
                    {streamingContent || <span className="text-gray-400">等待响应...</span>}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1677FF]"></div>
                  <p className="mt-4 text-gray-600">正在执行技能...</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              {isExecuting && (
                <button
                  onClick={handleCancelExecution}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  取消执行
                </button>
              )}
              {!isExecuting && streamingContent && (
                <button
                  onClick={() => {
                    setShowStreamingModal(false);
                    // Copy to clipboard
                    navigator.clipboard.writeText(streamingContent);
                    alert('内容已复制到剪贴板');
                  }}
                  className="px-4 py-2 bg-[#1677FF] text-white rounded-lg hover:bg-[#4096FF]"
                >
                  复制内容
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
