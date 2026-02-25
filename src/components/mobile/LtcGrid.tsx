import { useState } from 'react';
import type { Skill } from '../../types';
import { useLtcConfigStore } from '../../stores/ltcConfig.store';

interface LtcGridProps {
  nodes: import('../../types').LtcNode[];
  onSkillSelect: (skill: Skill) => void;
}

/**
 * 2x4 LTC stage grid display
 * Shows all 8 LTC stages in a compact grid layout
 */
export function LtcGrid({ nodes, onSkillSelect }: LtcGridProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const sortedNodes = [...nodes].sort((a, b) => a.order - b.order);

  const handleNodeClick = (nodeId: string) => {
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    } else {
      setSelectedNodeId(nodeId);
    }
  };

  const getNodeSkills = (nodeId: string) => {
    const bindings = useLtcConfigStore.getState().bindings[nodeId] || [];
    return bindings
      .filter((b) => b.skill)
      .map((b) => b.skill!)
      .sort((a, b) => {
        const orderA = bindings.find((item) => item.skill_id === a.id)?.order || 0;
        const orderB = bindings.find((item) => item.skill_id === b.id)?.order || 0;
        return orderA - orderB;
      });
  };

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <span className="w-1 h-5 bg-[#1677FF] rounded-full"></span>
        LTC 流程
      </h3>

      {/* 2x4 Grid */}
      <div className="grid grid-cols-4 gap-2">
        {sortedNodes.slice(0, 8).map((node, index) => {
          const isSelected = selectedNodeId === node.id;
          const nodeSkills = getNodeSkills(node.id);
          const hasSkills = nodeSkills.length > 0;

          return (
            <div key={node.id} className="relative">
              {/* Node Card */}
              <button
                onClick={() => handleNodeClick(node.id)}
                className={`
                  w-full aspect-square rounded-xl flex flex-col items-center justify-center p-1.5
                  transition-all duration-200 border-2 shadow-sm
                  ${
                    isSelected
                      ? 'bg-[#1677FF] border-[#1677FF] shadow-lg shadow-blue-500/25'
                      : hasSkills
                      ? 'bg-white border-gray-200 hover:border-[#1677FF] hover:shadow-md'
                      : 'bg-gray-50 border-gray-100'
                  }
                `}
              >
                {/* Stage Number */}
                <div
                  className={`text-[10px] font-bold mb-0.5 ${
                    isSelected ? 'text-white/70' : 'text-gray-400'
                  }`}
                >
                  {String(index + 1).padStart(2, '0')}
                </div>

                {/* Stage Name */}
                <div
                  className={`text-sm font-semibold text-center leading-tight ${
                    isSelected ? 'text-white' : 'text-gray-800'
                  }`}
                >
                  {node.name}
                </div>

                {/* Skills Count Badge */}
                {hasSkills && !isSelected && (
                  <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-[#1677FF] rounded-full flex items-center justify-center px-1 shadow-sm">
                    <span className="text-[9px] font-bold text-white leading-none">
                      {nodeSkills.length > 9 ? '9+' : nodeSkills.length}
                    </span>
                  </div>
                )}
              </button>

              {/* Skills Popover - shown when selected */}
              {isSelected && hasSkills && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-lg shadow-xl border border-gray-100 p-1.5 z-10 max-h-[200px] overflow-y-auto">
                  <div className="space-y-0.5">
                    {nodeSkills.map((skill) => (
                      <button
                        key={skill.id}
                        onClick={() => onSkillSelect(skill)}
                        className="w-full text-left px-2 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-[#1677FF] rounded-md transition-colors truncate font-medium"
                      >
                        {skill.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Fill empty slots if less than 8 nodes */}
        {Array.from({ length: Math.max(0, 8 - sortedNodes.length) }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className="w-full aspect-square rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center"
          >
            <span className="text-gray-300 text-xs">未配置</span>
          </div>
        ))}
      </div>
    </div>
  );
}
