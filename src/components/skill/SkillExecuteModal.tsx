import { useState, useEffect, useRef, useCallback } from 'react';
import { webSocketService } from '../../services/websocket.service';
import { apiService } from '../../services/api.service';
import { useCurrentCustomerStore } from '../../stores';
import { useAuth } from '../../context/AuthContext';
import type { Skill, SkillParameter, Document } from '../../types';
import MDEditor from '@uiw/react-md-editor';

interface SkillExecuteModalProps {
  skill: Skill | null;
  nodeId?: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (interactionId: string) => void;
}

interface ParameterValue {
  value: string | string[] | boolean | number;
  error?: string;
}

export function SkillExecuteModal({
  skill,
  nodeId,
  isOpen,
  onClose,
  onComplete,
}: SkillExecuteModalProps) {
  const { team } = useAuth();
  const { currentCustomer } = useCurrentCustomerStore();

  // State
  const [parameters, setParameters] = useState<Record<string, ParameterValue>>({});
  const [referenceDocumentId, setReferenceDocumentId] = useState<string>('');
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [streamOutput, setStreamOutput] = useState('');
  const [currentInteractionId, setCurrentInteractionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [executionStage, setExecutionStage] = useState<'idle' | 'preparing' | 'initiating' | 'waiting' | 'receiving' | 'completed'>('idle');

  const outputRef = useRef<HTMLDivElement>(null);

  // Load available documents when modal opens
  useEffect(() => {
    if (isOpen && team?.id) {
      setIsLoadingDocs(true);
      apiService
        .getDocuments(team.id, currentCustomer?.id)
        .then((docs) => {
          setAvailableDocuments(docs);
        })
        .catch(() => {
          // Ignore error, documents are optional
        })
        .finally(() => {
          setIsLoadingDocs(false);
        });
    }
  }, [isOpen, team?.id, currentCustomer?.id]);

  // Connect to WebSocket when modal opens
  useEffect(() => {
    if (isOpen && !webSocketService.connected) {
      const token = localStorage.getItem('access_token');
      if (token) {
        webSocketService.connect(token);
      }
    }
  }, [isOpen]);

  // Initialize parameters when skill changes
  useEffect(() => {
    if (skill?.parameters) {
      const initialParams: Record<string, ParameterValue> = {};
      skill.parameters.forEach((param) => {
        initialParams[param.name] = {
          value: param.default ?? (param.type === 'boolean' ? false : param.type === 'array' ? [] : ''),
        };
      });
      setParameters(initialParams);
    } else {
      setParameters({});
    }
    setReferenceDocumentId('');
    setStreamOutput('');
    setCurrentInteractionId(null);
    setError(null);
    setExecutionStage('idle');
  }, [skill]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [streamOutput]);

  // WebSocket event handlers
  useEffect(() => {
    if (!isExecuting) return;

    const handleStart = (data: { interactionId: string }) => {
      setCurrentInteractionId(data.interactionId);
      setExecutionStage('receiving');
    };

    const handleChunk = (data: { chunk: string }) => {
      setStreamOutput((prev) => prev + data.chunk);
    };

    const handleComplete = (data: { interactionId: string; documentId?: string; content: string }) => {
      setIsExecuting(false);
      setExecutionStage('completed');
      setStreamOutput(data.content);
      onComplete?.(data.interactionId);
    };

    const handleError = (data: { message: string }) => {
      setIsExecuting(false);
      setExecutionStage('idle');
      setError(data.message);
    };

    webSocketService.on('skill:started', handleStart);
    webSocketService.on('skill:chunk', handleChunk);
    webSocketService.on('skill:completed', handleComplete);
    webSocketService.on('skill:error', handleError);

    return () => {
      webSocketService.off('skill:started', handleStart);
      webSocketService.off('skill:chunk', handleChunk);
      webSocketService.off('skill:completed', handleComplete);
      webSocketService.off('skill:error', handleError);
    };
  }, [isExecuting, onComplete]);

  const validateParameters = (): boolean => {
    if (!skill?.parameters) return true;

    let isValid = true;
    const newParams = { ...parameters };

    skill.parameters.forEach((param) => {
      if (param.required) {
        const value = parameters[param.name]?.value;
        const isEmpty =
          value === undefined ||
          value === null ||
          value === '' ||
          (Array.isArray(value) && value.length === 0);

        if (isEmpty) {
          isValid = false;
          newParams[param.name] = {
            ...newParams[param.name],
            error: '此字段为必填项',
          };
        }
      }
    });

    setParameters(newParams);
    return isValid;
  };

  const handleExecute = useCallback(async () => {
    if (!skill || !team?.id) return;

    if (!validateParameters()) return;

    setIsExecuting(true);
    setExecutionStage('preparing');
    setStreamOutput('');
    setError(null);

    // Stage 1: Preparing parameters (with small delay for UI visibility)
    await new Promise(resolve => setTimeout(resolve, 300));

    // Build parameter object
    const paramValues: Record<string, any> = {};
    Object.entries(parameters).forEach(([key, param]) => {
      paramValues[key] = param.value;
    });

    setExecutionStage('initiating');
    await new Promise(resolve => setTimeout(resolve, 200));

    setExecutionStage('waiting');

    // Execute skill via WebSocket
    webSocketService.executeSkill(
      {
        skillId: skill.id,
        teamId: team.id,
        customerId: currentCustomer?.id,
        parameters: paramValues,
      },
      {
        onStart: (data) => {
          setCurrentInteractionId(data.interactionId);
          setExecutionStage('receiving');
        },
        onChunk: (data) => {
          setStreamOutput((prev) => prev + data.chunk);
        },
        onComplete: (data) => {
          setIsExecuting(false);
          setExecutionStage('completed');
          setStreamOutput(data.content);
          onComplete?.(data.interactionId);
        },
        onError: (data) => {
          setIsExecuting(false);
          setExecutionStage('idle');
          setError(data.message);
        },
      }
    );
  }, [skill, team?.id, currentCustomer?.id, nodeId, parameters, referenceDocumentId]);

  const handleCancel = useCallback(() => {
    if (currentInteractionId) {
      webSocketService.cancelSkill(currentInteractionId);
    }
    setIsExecuting(false);
    setExecutionStage('idle');
  }, [currentInteractionId]);

  const handleParameterChange = (paramName: string, value: any) => {
    setParameters((prev) => ({
      ...prev,
      [paramName]: { value, error: undefined },
    }));
  };

  const renderParameterInput = (param: SkillParameter) => {
    const paramState = parameters[param.name];
    const value = paramState?.value;
    const error = paramState?.error;

    const baseClassName = `
      w-full px-3 py-2 border rounded-lg text-sm
      focus:outline-none focus:ring-2 focus:ring-[#1677FF]/20 focus:border-[#1677FF]
      ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'}
    `;

    switch (param.type) {
      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleParameterChange(param.name, e.target.checked)}
              className="w-4 h-4 text-[#1677FF] border-gray-300 rounded focus:ring-[#1677FF]"
            />
            <span className="text-sm text-gray-600">{param.placeholder || '启用'}</span>
          </label>
        );

      case 'select':
        return (
          <select
            value={String(value || '')}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            className={baseClassName}
          >
            <option value="">请选择...</option>
            {param.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            value={String(value || '')}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            placeholder={param.placeholder}
            rows={4}
            className={baseClassName}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value === undefined || value === null ? '' : String(value)}
            onChange={(e) => handleParameterChange(param.name, Number(e.target.value))}
            placeholder={param.placeholder}
            className={baseClassName}
          />
        );

      default:
        return (
          <input
            type="text"
            value={String(value || '')}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            placeholder={param.placeholder}
            className={baseClassName}
          />
        );
    }
  };

  if (!isOpen || !skill) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{skill.name}</h2>
            {skill.description && (
              <p className="text-sm text-gray-500 mt-0.5">{skill.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left: Parameters and Document Selection */}
          <div className="w-full md:w-1/2 p-6 border-r border-gray-100 overflow-y-auto">
            {/* Customer info */}
            {currentCustomer && (
              <div className="mb-4 p-3 bg-[#F5F7FA] rounded-lg">
                <span className="text-xs text-gray-500">当前客户</span>
                <div className="font-medium text-gray-900">{currentCustomer.name}</div>
              </div>
            )}

            {/* Parameters */}
            {skill.parameters && skill.parameters.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">参数设置</h3>
                {skill.parameters.map((param) => (
                  <div key={param.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {param.label} <span className="text-gray-400 font-normal">({param.name})</span>
                      {param.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderParameterInput(param)}
                    {parameters[param.name]?.error && (
                      <p className="mt-1 text-xs text-red-500">{parameters[param.name].error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Reference document selection */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">引用历史文档</h3>
              {isLoadingDocs ? (
                <div className="text-sm text-gray-400">加载文档...</div>
              ) : availableDocuments.length === 0 ? (
                <div className="text-sm text-gray-400">暂无可用文档</div>
              ) : (
                <select
                  value={referenceDocumentId}
                  onChange={(e) => setReferenceDocumentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1677FF]"
                >
                  <option value="">不引用文档</option>
                  {availableDocuments.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title}
                    </option>
                  ))}
                </select>
              )}
              {referenceDocumentId && (
                <p className="mt-1 text-xs text-[#1677FF]">
                  已选择引用文档，AI将参考此文档内容
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              {isExecuting ? (
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  取消执行
                </button>
              ) : (
                <button
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="flex-1 px-4 py-2 bg-[#1677FF] text-white rounded-lg hover:bg-[#4096FF] disabled:opacity-50 transition-colors"
                >
                  开始执行
                </button>
              )}
              <button
                onClick={onClose}
                disabled={isExecuting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                关闭
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          {/* Right: Stream output */}
          <div className="w-full md:w-1/2 flex flex-col bg-gray-50">
            <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">执行输出</h3>
              {isExecuting && (
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1677FF] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1677FF]"></span>
                  </span>
                  <span className="text-xs text-[#1677FF]">执行中...</span>
                </div>
              )}
            </div>
            <div
              ref={outputRef}
              className="flex-1 overflow-y-auto p-4"
              data-color-mode="light"
            >
              {/* Execution Status Indicator */}
              {isExecuting && (
                <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="space-y-3">
                    {/* Stage 1: Preparing */}
                    <div className="flex items-center gap-3">
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        executionStage === 'preparing' ? 'bg-[#1677FF] text-white animate-pulse' :
                        executionStage === 'initiating' || executionStage === 'waiting' || executionStage === 'receiving' || executionStage === 'completed' ? 'bg-green-500 text-white' :
                        'bg-gray-200 text-gray-400'
                      }`}>
                        {executionStage === 'preparing' ? '1' : '✓'}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-700">准备参数</div>
                        <div className="text-xs text-gray-500">正在组装技能参数...</div>
                      </div>
                      {executionStage === 'preparing' && (
                        <div className="animate-spin h-4 w-4 border-2 border-[#1677FF] border-t-transparent rounded-full"></div>
                      )}
                    </div>

                    {/* Stage 2: Initiating */}
                    <div className="flex items-center gap-3">
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        executionStage === 'initiating' ? 'bg-[#1677FF] text-white animate-pulse' :
                        executionStage === 'waiting' || executionStage === 'receiving' || executionStage === 'completed' ? 'bg-green-500 text-white' :
                        'bg-gray-200 text-gray-400'
                      }`}>
                        {executionStage === 'initiating' || executionStage === 'preparing' ? '2' : '✓'}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-700">发起请求</div>
                        <div className="text-xs text-gray-500">正在连接AI模型服务...</div>
                      </div>
                      {executionStage === 'initiating' && (
                        <div className="animate-spin h-4 w-4 border-2 border-[#1677FF] border-t-transparent rounded-full"></div>
                      )}
                    </div>

                    {/* Stage 3: Waiting/Receiving */}
                    <div className="flex items-center gap-3">
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        executionStage === 'waiting' || executionStage === 'receiving' ? 'bg-[#1677FF] text-white animate-pulse' :
                        executionStage === 'completed' ? 'bg-green-500 text-white' :
                        'bg-gray-200 text-gray-400'
                      }`}>
                        {executionStage === 'waiting' || executionStage === 'receiving' || executionStage === 'completed' ? '✓' : '3'}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-700">
                          {executionStage === 'waiting' ? '等待响应' :
                           executionStage === 'receiving' ? '接收数据' :
                           '模型处理'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {executionStage === 'waiting' ? '等待模型开始返回数据...' :
                           executionStage === 'receiving' ? '正在接收流式输出...' :
                           '等待模型返回结果...'}
                        </div>
                      </div>
                      {(executionStage === 'waiting' || executionStage === 'receiving') && (
                        <div className="animate-spin h-4 w-4 border-2 border-[#1677FF] border-t-transparent rounded-full"></div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full bg-[#1677FF] transition-all duration-500 ${
                        executionStage === 'preparing' ? 'w-1/4' :
                        executionStage === 'initiating' ? 'w-2/4' :
                        executionStage === 'waiting' ? 'w-3/4' :
                        executionStage === 'receiving' ? 'w-4/4 animate-pulse' :
                        'w-0'
                      }`}></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stream Output */}
              {streamOutput ? (
                <MDEditor.Markdown source={streamOutput} />
              ) : !isExecuting ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <span className="text-3xl mb-2">📝</span>
                  <p className="text-sm">点击"开始执行"查看结果</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
