import { Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import type { SkillInteraction } from '../../types';
import { useNavigate } from 'react-router-dom';

interface RecentRecordsProps {
  interactions: SkillInteraction[];
}

/**
 * Recent execution records list
 * Shows last 3 interactions with status icons and timestamps
 */
export function RecentRecords({ interactions }: RecentRecordsProps) {
  const navigate = useNavigate();

  if (interactions.length === 0) {
    return (
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#1677FF]" />
          最近记录
        </h3>
        <div className="bg-white rounded-xl p-6 text-center border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-sm">暂无执行记录</p>
        </div>
      </div>
    );
  }

  const recentInteractions = interactions.slice(0, 3);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-white" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-white" />;
      case 'RUNNING':
        return <Loader className="w-4 h-4 text-white animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-white/70" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`;
    return `${Math.floor(diffMins / 1440)}天前`;
  };

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#1677FF]" />
        最近记录
      </h3>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {recentInteractions.map((interaction, index) => {
          const getStatusBgColor = (status: string) => {
            switch (status) {
              case 'COMPLETED': return 'from-green-400 to-green-600';
              case 'FAILED': return 'from-red-400 to-red-600';
              case 'RUNNING': return 'from-blue-400 to-blue-600';
              default: return 'from-gray-400 to-gray-600';
            }
          };

          return (
          <button
            key={interaction.id}
            onClick={() => navigate(`/interactions/${interaction.id}`)}
            className={`
              w-full p-3.5 flex items-center gap-3 transition-colors
              ${index < recentInteractions.length - 1 ? 'border-b border-gray-50' : ''}
              hover:bg-gray-50
            `}
          >
            {/* Status Icon */}
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getStatusBgColor(interaction.status)} flex items-center justify-center shrink-0 shadow-sm`}>
              {getStatusIcon(interaction.status)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 text-left">
              <h4 className="text-sm font-semibold text-gray-900 truncate">
                {interaction.title || interaction.skill?.name || '未知技能'}
              </h4>
              {interaction.summary && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{interaction.summary}</p>
              )}
            </div>

            {/* Time */}
            <div className="shrink-0 text-xs text-gray-400">
              {formatTime(interaction.created_at)}
            </div>
          </button>
          );
        })}
      </div>

      {interactions.length > 3 && (
        <button
          onClick={() => navigate('/interactions')}
          className="w-full mt-3 py-2 text-sm text-[#1677FF] font-medium hover:text-[#1677FF]/80 transition-colors"
        >
          查看全部 {interactions.length} 条记录
        </button>
      )}
    </div>
  );
}
