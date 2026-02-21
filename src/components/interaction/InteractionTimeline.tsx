import { Link } from 'react-router-dom';
import type { SkillInteraction } from '../../types';
import { formatDate } from '../../utils';
import {
  CheckCircle2,
  Loader2,
  Clock,
  XCircle,
  Ban,
  Pause,
  FileText,
  ArrowRight,
} from 'lucide-react';

interface InteractionTimelineProps {
  interactions: SkillInteraction[];
  isLoading?: boolean;
  maxItems?: number;
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  COMPLETED: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
  RUNNING: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-100' },
  PENDING: { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100' },
  FAILED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  CANCELLED: { icon: Ban, color: 'text-gray-500', bg: 'bg-gray-100' },
  PAUSED: { icon: Pause, color: 'text-yellow-600', bg: 'bg-yellow-100' },
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
          <div key={i} className="flex gap-3 p-4 bg-gray-50 rounded-xl animate-pulse">
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
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <div className="w-14 h-14 mb-3 bg-gray-100 rounded-full flex items-center justify-center">
          <FileText className="w-7 h-7 text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-500">暂无交互记录</p>
        <p className="text-xs text-gray-400 mt-1">执行技能后将显示在此处</p>
      </div>
    );
  }

  const displayInteractions = maxItems
    ? interactions.slice(0, maxItems)
    : interactions;

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100" />

      <div className="space-y-3">
        {displayInteractions.map((interaction) => {
          const statusConfig = STATUS_CONFIG[interaction.status] || { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100' };
          const StatusIcon = statusConfig.icon;

          return (
            <Link
              key={interaction.id}
              to={`/interactions/${interaction.id}`}
              className="relative flex gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-[#1677FF]/30 hover:shadow-sm transition-all duration-200 group"
            >
              {/* Status icon */}
              <div className={`relative z-10 flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                <StatusIcon className={`w-5 h-5 ${interaction.status === 'RUNNING' ? 'animate-spin' : ''}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium text-gray-900 truncate group-hover:text-[#1677FF] transition-colors">
                    {interaction.skill?.name || '未知技能'}
                  </h4>
                  <span
                    className={`
                      text-xs px-2 py-0.5 rounded-full font-medium
                      ${interaction.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : ''}
                      ${interaction.status === 'RUNNING' ? 'bg-blue-100 text-blue-700' : ''}
                      ${interaction.status === 'FAILED' ? 'bg-red-100 text-red-700' : ''}
                      ${interaction.status === 'PENDING' ? 'bg-gray-100 text-gray-600' : ''}
                      ${interaction.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' : ''}
                      ${interaction.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' : ''}
                    `}
                  >
                    {STATUS_LABELS[interaction.status] || interaction.status}
                  </span>
                </div>

                {interaction.customer && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {interaction.customer.name}
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
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          );
        })}
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
