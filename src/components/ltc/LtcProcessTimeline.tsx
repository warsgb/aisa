import { useRef } from 'react';
import type { LtcNode, Skill } from '../../types';
import { SkillCard } from '../skill/SkillCard';
import { Wrench } from 'lucide-react';

interface LtcProcessTimelineProps {
  nodes: LtcNode[];
  bindings: Record<string, Skill[]>;
  currentNodeId?: string;
  onNodeClick?: (node: LtcNode) => void;
  onSkillExecute: (skill: Skill, nodeId?: string) => void;
  isLoading?: boolean;
}

export function LtcProcessTimeline({
  nodes,
  bindings,
  currentNodeId,
  onNodeClick,
  onSkillExecute,
  isLoading,
}: LtcProcessTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-44 h-48 bg-gray-100 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 bg-[#F5F7FA] rounded-xl">
        <div className="w-12 h-12 mb-2 bg-gray-200 rounded-full flex items-center justify-center">
          <Wrench className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-500 text-sm">暂无LTC流程配置</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Compact scroll container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
        style={{ scrollbarWidth: 'thin' }}
      >
        {nodes.map((node, index) => {
          const nodeSkills = bindings[node.id] || [];
          const isActive = currentNodeId === node.id;
          return (
            <div
              key={node.id}
              className={`
                flex-shrink-0 w-44 flex flex-col
                bg-white rounded-lg border transition-all duration-200
                ${isActive ? 'border-[#1677FF] shadow-md shadow-[#1677FF]/10' : 'border-gray-200 hover:border-gray-300'}
              `}
            >
              {/* Compact node header */}
              <div
                onClick={() => onNodeClick?.(node)}
                className={`
                  px-3 py-2 cursor-pointer
                  ${isActive ? 'bg-[#1677FF]' : 'bg-[#1677FF]'}
                  ${onNodeClick ? 'hover:opacity-90' : ''}
                  transition-opacity duration-200
                `}
              >
                <div className="flex items-center gap-2">
                  {/* Step number */}
                  <span
                    className={`
                      flex-shrink-0 w-5 h-5 flex items-center justify-center
                      text-xs font-bold rounded-full
                      ${isActive ? 'bg-white text-[#1677FF]' : 'bg-white/20 text-white'}
                    `}
                  >
                    {index + 1}
                  </span>

                  {/* Node name */}
                  <h3 className="text-sm font-semibold text-white truncate">
                    {node.name}
                  </h3>
                </div>
              </div>

              {/* Compact skills list */}
              <div className="flex-1 p-2 overflow-y-auto max-h-32">
                {nodeSkills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-3 text-gray-400">
                    <Wrench className="w-4 h-4 mb-1 text-gray-300" />
                    <p className="text-xs">暂无</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {nodeSkills.map((skill) => (
                      <SkillCard
                        key={skill.id}
                        skill={skill}
                        onExecute={(s) => onSkillExecute(s, node.id)}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Compact footer */}
              <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                {nodeSkills.length} 技能
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
