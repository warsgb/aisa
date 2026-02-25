import { Link } from 'react-router-dom';
import type { SkillInteraction, LtcNode } from '../../types';
import { formatDate } from '../../utils';
import {
  CheckCircle2,
  Loader2,
  Clock,
  XCircle,
  Ban,
  Pause,
  FileText,
  Workflow,
  ArrowRight,
  User,
  Wrench,
  Calendar,
  TrendingUp,
} from 'lucide-react';

interface InteractionTimelineProps {
  interactions: SkillInteraction[];
  ltcNodesMap?: Record<string, LtcNode>;
  isLoading?: boolean;
  maxItems?: number;
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; emoji: string }> = {
  COMPLETED: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    emoji: '✅',
  },
  RUNNING: {
    icon: Loader2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    emoji: '🔄',
  },
  PENDING: {
    icon: Clock,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    emoji: '⏳',
  },
  FAILED: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    emoji: '❌',
  },
  CANCELLED: {
    icon: Ban,
    color: 'text-gray-500',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    emoji: '🚫',
  },
  PAUSED: {
    icon: Pause,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    emoji: '⏸️',
  },
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
  ltcNodesMap = {},
  isLoading,
  maxItems = 10,
}: InteractionTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 sm:gap-4 p-3.5 sm:p-5 bg-white rounded-2xl border border-gray-100 animate-pulse">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-xl" />
            <div className="flex-1 space-y-3">
              <div className="h-5 bg-gray-100 rounded w-1/3" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (interactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="w-16 h-16 mb-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center border border-gray-100">
          <FileText className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-gray-600 mb-1">暂无交互记录</p>
        <p className="text-xs text-gray-400">执行技能后将显示在此处</p>
      </div>
    );
  }

  const displayInteractions = maxItems
    ? interactions.slice(0, maxItems)
    : interactions;
  const newestId = interactions[0]?.id;

  return (
    <div className="relative">
      {/* Timeline line - hidden on mobile */}
      <div className="hidden sm:block absolute left-7 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#1677FF]/20 via-gray-100 to-transparent" />

      <div className="space-y-3 sm:space-y-4">
        {displayInteractions.map((interaction) => {
          const statusConfig = STATUS_CONFIG[interaction.status] || STATUS_CONFIG.PENDING;
          const StatusIcon = statusConfig.icon;
          const isNewest = interaction.id === newestId;
          const ltcNode = interaction.node_id ? ltcNodesMap[interaction.node_id] : null;

          return (
            <Link
              key={interaction.id}
              to={`/interactions/${interaction.id}`}
              className={`
                relative flex gap-3 sm:gap-4 p-3.5 sm:p-5 bg-white rounded-2xl border transition-all duration-300 group
                ${isNewest ? 'border-[#1677FF]/30 bg-gradient-to-r from-[#1677FF]/5 to-transparent shadow-sm' : 'border-gray-100 hover:border-[#1677FF]/20 hover:shadow-md'}
              `}
            >
              {/* Status icon */}
              <div className={`relative z-10 flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-xl border ${statusConfig.bg} ${statusConfig.border} ${statusConfig.color}`}>
                <StatusIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${interaction.status === 'RUNNING' ? 'animate-spin' : ''}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5 sm:mb-2">
                  {/* LTC Stage Tag */}
                  {ltcNode && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1677FF]/10 text-[#1677FF] text-[11px] font-semibold rounded-lg border border-[#1677FF]/20">
                      <Workflow className="w-3 h-3" />
                      {ltcNode.name}
                    </span>
                  )}

                  <h4 className="text-base sm:text-sm font-semibold text-gray-900 truncate group-hover:text-[#1677FF] transition-colors">
                    {interaction.skill?.name || '未知技能'}
                  </h4>

                  {/* Status Badge */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                    <span>{statusConfig.emoji}</span>
                    {STATUS_LABELS[interaction.status] || interaction.status}
                  </span>
                </div>

                {interaction.customer && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-1.5 sm:mb-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>{interaction.customer.name}</span>
                  </div>
                )}

                {interaction.summary && (
                  <p className="text-sm sm:text-sm text-gray-600 line-clamp-2 mb-1.5 sm:mb-2">
                    {interaction.summary}
                  </p>
                )}

                <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(interaction.created_at)}
                  </span>
                  {interaction.skill && (
                    <span className="inline-flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      {interaction.skill.name}
                    </span>
                  )}
                </div>
              </div>

              {/* View Details - simplified on mobile */}
              <div className="flex-shrink-0 self-center flex items-center gap-2 text-gray-300 group-hover:text-[#1677FF] transition-all duration-200">
                <ArrowRight className="w-5 h-5 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      {interactions.length > maxItems && (
        <Link
          to="/interactions"
          className="group mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-white rounded-xl border border-gray-100 hover:border-[#1677FF]/30 hover:shadow-md transition-all duration-200 text-sm font-medium text-gray-600 hover:text-[#1677FF]"
        >
          <span>查看全部 {interactions.length} 条记录</span>
          <TrendingUp className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}
    </div>
  );
}
