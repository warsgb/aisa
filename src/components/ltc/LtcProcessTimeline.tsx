import { useRef } from 'react';
import type { LtcNode, Skill } from '../../types';
import { SkillCard } from '../skill/SkillCard';

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
      <div className="flex gap-4 overflow-x-auto pb-4 px-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-64 h-96 bg-gray-100 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-[#F5F7FA] rounded-xl">
        <span className="text-4xl mb-3">📋</span>
        <p className="text-gray-500">暂无LTC流程配置</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Scroll container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-4 px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
        style={{ scrollbarWidth: 'thin' }}
      >
        {nodes.map((node, index) => {
          const nodeSkills = bindings[node.id] || [];
          const isActive = currentNodeId === node.id;
          return (
            <div
              key={node.id}
              className={`
                flex-shrink-0 w-72 flex flex-col
                bg-white rounded-xl border-2 transition-all duration-300
                ${isActive ? 'border-[#1677FF] shadow-lg shadow-[#1677FF]/10' : 'border-gray-100 hover:border-gray-200'}
              `}
              style={{ borderRadius: '12px' }}
            >
              {/* Node header - 蓝色标题头 */}
              <div
                onClick={() => onNodeClick?.(node)}
                className={`
                  px-4 py-3 border-b border-white/10 cursor-pointer
                  ${isActive ? 'bg-[#1677FF]' : 'bg-[#1677FF]'}
                  ${onNodeClick ? 'hover:opacity-90' : ''}
                  transition-opacity duration-200
                `}
                style={{ borderRadius: '12px 12px 0 0' }}
              >
                <div className="flex items-center gap-2">
                  {/* Step number */}
                  <span
                    className={`
                      flex-shrink-0 w-6 h-6 flex items-center justify-center
                      text-xs font-bold rounded-full
                      ${isActive ? 'bg-white text-[#1677FF]' : 'bg-white/20 text-white'}
                    `}
                  >
                    {index + 1}
                  </span>

                  {/* Node name */}
                  <h3 className={`font-semibold truncate ${isActive ? 'text-white' : 'text-white'}`}>
                    {node.name}
                  </h3>
                </div>

                {/* Node description */}
                {node.description && (
                  <p className="mt-1 text-xs text-white/70 line-clamp-1 ml-8">
                    {node.description}
                  </p>
                )}
              </div>

              {/* Skills list */}
              <div className="flex-1 p-3 overflow-y-auto max-h-80">
                {nodeSkills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                    <span className="text-2xl mb-1">🛠️</span>
                    <p className="text-xs">暂无绑定技能</p>
                  </div>
                ) : (
                  <div className="space-y-2">
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

              {/* Footer with count */}
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500" style={{ borderRadius: '0 0 12px 12px' }}>
                {nodeSkills.length} 个技能
              </div>
            </div>
          );
        })}
      </div>

      {/* Gradient fade indicators */}
      <div className="absolute left-0 top-0 bottom-4 w-4 bg-gradient-to-r from-[#F5F7FA] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-4 w-4 bg-gradient-to-l from-[#F5F7FA] to-transparent pointer-events-none" />
    </div>
  );
}
