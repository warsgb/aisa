import { FileText, Zap, Target } from 'lucide-react';
import type { SkillInteraction } from '../../types';
import { useLtcConfigStore } from '../../stores/ltcConfig.store';

interface QuickStatsProps {
  customerId: string;
  interactions: SkillInteraction[];
}

/**
 * Quick stats cards showing execution metrics
 * 3 columns: execution records, used skills, current stage
 */
export function QuickStats({ customerId, interactions }: QuickStatsProps) {
  const { nodes } = useLtcConfigStore();

  // Calculate stats
  const customerInteractions = interactions.filter((i) => i.customer_id === customerId);
  const executionCount = customerInteractions.length;

  const usedSkillIds = new Set(customerInteractions.map((i) => i.skill_id));
  const usedSkillsCount = usedSkillIds.size;

  // Find current LTC stage based on most recent interaction with node_id
  const latestInteraction = customerInteractions.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];

  const currentNode = latestInteraction?.node_id
    ? nodes.find((n) => n.id === latestInteraction.node_id)
    : nodes[0];

  const currentStage = currentNode?.name || '未开始';

  const stats = [
    {
      label: '执行记录',
      value: executionCount.toString(),
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      label: '已用技能',
      value: usedSkillsCount.toString(),
      icon: Zap,
      color: 'bg-green-500',
    },
    {
      label: '当前阶段',
      value: currentStage,
      icon: Target,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col items-center justify-center"
          >
            <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center mb-2`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-lg font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}
