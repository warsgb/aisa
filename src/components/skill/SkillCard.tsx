import type { Skill } from '../../types';

interface SkillCardProps {
  skill: Skill;
  onExecute: (skill: Skill) => void;
  compact?: boolean;
}

export function SkillCard({ skill, onExecute, compact = false }: SkillCardProps) {
  if (compact) {
    return (
      <button
        onClick={() => onExecute(skill)}
        className="w-full text-left px-2 py-1.5 bg-white border border-gray-100 rounded-md hover:border-[#1677FF] hover:shadow-sm transition-all duration-200 group"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[#1677FF] font-medium text-xs truncate flex-1 text-left">
            {skill.name}
          </span>
          <span className="text-gray-300 group-hover:text-[#1677FF] text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            ▶
          </span>
        </div>
      </button>
    );
  }

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-[#1677FF]/30 transition-all duration-200"
      style={{ borderRadius: '12px' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate mb-1">{skill.name}</h4>
          {skill.description && (
            <p className="text-sm text-gray-500 line-clamp-2">{skill.description}</p>
          )}
          {skill.category && (
            <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-[#F5F7FA] text-gray-600 rounded-full">
              {skill.category}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => onExecute(skill)}
        className="w-full mt-3 py-2 px-4 bg-[#1677FF] text-white text-sm font-medium rounded-lg hover:bg-[#4096FF] active:bg-[#0958D9] transition-colors duration-200"
        style={{ borderRadius: '8px' }}
      >
        执行技能
      </button>
    </div>
  );
}
