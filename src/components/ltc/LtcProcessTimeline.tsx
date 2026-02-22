import type { LtcNode, Skill } from '../../types';
import { EnhancedSkillCard } from '../skill/EnhancedSkillCard';
import { Wrench } from 'lucide-react';

interface LtcProcessTimelineProps {
  nodes: LtcNode[];
  bindings: Record<string, Skill[]>;
  skillUsageCounts?: Record<string, number>;
  executedSkillIds?: Set<string>;
  currentNodeId?: string;
  onNodeClick?: (node: LtcNode) => void;
  onSkillExecute: (skill: Skill, nodeId?: string) => void;
  isLoading?: boolean;
}

export function LtcProcessTimeline({
  nodes,
  bindings,
  skillUsageCounts = {},
  executedSkillIds = new Set(),
  currentNodeId,
  onNodeClick,
  onSkillExecute,
  isLoading,
}: LtcProcessTimelineProps) {
  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-3 border border-gray-100 animate-pulse min-w-[180px] flex-shrink-0"
          >
            <div className="w-10 h-10 mx-auto mb-3 bg-gray-200 rounded-full" />
            <div className="h-3 bg-gray-200 rounded mb-2" />
          </div>
        ))}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 bg-background rounded-xl">
        <div className="w-12 h-12 mb-2 bg-gray-200 rounded-full flex items-center justify-center">
          <Wrench className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-500 text-sm">暂无LTC流程配置</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Horizontal scroll layout for nodes - single row */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {nodes.map((node, index) => {
          const nodeSkills = bindings[node.id] || [];
          const isActive = currentNodeId === node.id;

          return (
            <div
              key={node.id}
              className={`
                relative bg-white rounded-xl p-3 border transition-all duration-200 min-w-[180px] flex-shrink-0
                ${isActive ? 'border-primary shadow-md shadow-primary/10' : 'border-gray-100 hover:border-gray-200'}
              `}
            >
              {/* Connecting line (to next node) */}
              {index < nodes.length - 1 && (
                <div className="absolute top-5 -right-3 w-3 h-0.5 bg-gradient-to-r from-gray-300 to-gray-200" />
              )}

              {/* Circular node marker - compact size, always blue with white border */}
              <div
                onClick={() => onNodeClick?.(node)}
                className={`
                  relative w-10 h-10 mx-auto mb-3 flex items-center justify-center
                  rounded-full transition-all duration-200 cursor-pointer border-2 shadow-sm
                  bg-primary border-white
                  ${isActive ? 'ring-2 ring-primary/30' : ''}
                  ${onNodeClick ? 'hover:scale-105' : ''}
                `}
              >
                <span className="text-sm font-bold text-white">
                  {index + 1}
                </span>
                {isActive && (
                  <div className="absolute inset-0 rounded-full bg-white animate-ping opacity-30" />
                )}
              </div>

              {/* Node name with blue border */}
              <div className="text-center mb-3">
                <div
                  onClick={() => onNodeClick?.(node)}
                  className={`
                    inline-block px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer
                    ${isActive ? 'bg-primary text-white border-2 border-white shadow-sm' : 'bg-white text-primary border-2 border-primary hover:bg-primary/5'}
                  `}
                >
                  {node.name}
                </div>
              </div>

              {/* Skills grid */}
              <div className="space-y-2">
                {nodeSkills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-3 text-gray-400">
                    <Wrench className="w-4 h-4 mb-1 text-gray-300" />
                    <p className="text-xs">暂无绑定技能</p>
                  </div>
                ) : (
                  nodeSkills.map((skill) => (
                    <EnhancedSkillCard
                      key={skill.id}
                      skill={skill}
                      onExecute={(s) => onSkillExecute(s, node.id)}
                      usageCount={skillUsageCounts[skill.id] || 0}
                      isExecuted={executedSkillIds.has(skill.id)}
                      compact={true}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
