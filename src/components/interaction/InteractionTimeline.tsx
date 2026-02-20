import { Link } from 'react-router-dom';
import type { SkillInteraction } from '../../types';
import { formatDate } from '../../utils';

interface InteractionTimelineProps {
  interactions: SkillInteraction[];
  isLoading?: boolean;
  maxItems?: number;
}

const STATUS_ICONS: Record<string, string> = {
  COMPLETED: '✅',
  RUNNING: '🔄',
  PENDING: '⏳',
  FAILED: '❌',
  CANCELLED: '🚫',
  PAUSED: '⏸️',
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: '已完成',
  RUNNING: '执行中',
  PENDING: '待处理',
  FAILED: '失败',
  CANCELLED: '已取消',
  PAUSED: '已暂停',
};

export function InteractionTimeline({
  interactions,
  isLoading,
  maxItems = 10,
}: InteractionTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-lg animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (interactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <span className="text-3xl mb-2">📝</span>
        <p className="text-sm">暂无交互记录</p>
      </div>
    );
  }

  const displayInteractions = maxItems
    ? interactions.slice(0, maxItems)
    : interactions;

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-4">
        {displayInteractions.map((interaction) => (
          <Link
            key={interaction.id}
            to={`/interactions/${interaction.id}`}
            className="relative flex gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-[#1677FF]/30 hover:shadow-sm transition-all duration-200 group"
            style={{ borderRadius: '10px' }}
          >
            {/* Status icon */}
            <div className="relative z-10 flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white rounded-full border-2 border-gray-100 group-hover:border-[#1677FF]/30 transition-colors">
              <span className="text-lg">{STATUS_ICONS[interaction.status] || '📄'}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-gray-900 truncate group-hover:text-[#1677FF] transition-colors">
                  {interaction.skill?.name || '未知技能'}
                </h4>
                <span
                  className={`
                    text-xs px-2 py-0.5 rounded-full
                    ${interaction.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : ''}
                    ${interaction.status === 'RUNNING' ? 'bg-blue-100 text-blue-700' : ''}
                    ${interaction.status === 'FAILED' ? 'bg-red-100 text-red-700' : ''}
                    ${interaction.status === 'PENDING' ? 'bg-gray-100 text-gray-600' : ''}
                    ${interaction.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' : ''}
                  `}
                >
                  {STATUS_LABELS[interaction.status] || interaction.status}
                </span>
              </div>

              {interaction.customer && (
                <p className="text-sm text-gray-500 mt-0.5">
                  👤 {interaction.customer.name}
                </p>
              )}

              {interaction.summary && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {interaction.summary}
                </p>
              )}

              <p className="text-xs text-gray-400 mt-2">
                {formatDate(interaction.created_at)}
              </p>
            </div>

            {/* Arrow */}
            <div className="flex-shrink-0 self-center text-gray-300 group-hover:text-[#1677FF] transition-colors">
              →
            </div>
          </Link>
        ))}
      </div>

      {interactions.length > maxItems && (
        <Link
          to="/interactions"
          className="block mt-4 text-center text-sm text-[#1677FF] hover:text-[#4096FF] transition-colors"
        >
          查看全部 {interactions.length} 条记录 →
        </Link>
      )}
    </div>
  );
}
