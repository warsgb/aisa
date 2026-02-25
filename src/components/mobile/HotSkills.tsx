import { Flame, Zap } from 'lucide-react';
import type { Skill, SkillInteraction } from '../../types';

interface HotSkillsProps {
  skills: Skill[];
  interactions: SkillInteraction[];
  onSkillExecute: (skill: Skill) => void;
  onShowAllSkills?: () => void;
}

/**
 * Hot skills grid (2x2)
 * Shows top 4 most used skills with orange gradient styling
 */
export function HotSkills({ skills, interactions, onSkillExecute, onShowAllSkills }: HotSkillsProps) {
  // Calculate skill usage count
  const skillUsageMap = new Map<string, number>();
  interactions.forEach((interaction) => {
    const count = skillUsageMap.get(interaction.skill_id) || 0;
    skillUsageMap.set(interaction.skill_id, count + 1);
  });

  // Sort skills by usage count and get top 4
  const hotSkills = [...skills]
    .filter((skill) => skillUsageMap.has(skill.id))
    .sort((a, b) => (skillUsageMap.get(b.id) || 0) - (skillUsageMap.get(a.id) || 0))
    .slice(0, 4);

  // If not enough skills with usage, fill with random enabled skills
  const remainingSkills = skills.filter((skill) => !skillUsageMap.has(skill.id)).slice(0, 4 - hotSkills.length);
  const displaySkills = [...hotSkills, ...remainingSkills].slice(0, 4);

  if (displaySkills.length === 0 && !onShowAllSkills) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          热门技能
        </h3>
        {onShowAllSkills && (
          <button
            onClick={onShowAllSkills}
            className="text-sm text-[#1677FF] font-medium"
          >
            查看全部
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {displaySkills.map((skill, index) => {
          const usageCount = skillUsageMap.get(skill.id) || 0;

          return (
            <button
              key={skill.id}
              onClick={() => onSkillExecute(skill)}
              className="relative bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl p-2.5 shadow-sm hover:shadow-md transition-all duration-200 min-h-[68px] flex flex-col justify-between text-left group"
            >
              {/* Index Badge */}
              <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">{index + 1}</span>
              </div>

              {/* Skill Name */}
              <div className="flex-1 pr-4">
                <h4 className="text-white font-semibold text-xs leading-tight">
                  {skill.name}
                </h4>
              </div>

              {/* Usage Count */}
              {usageCount > 0 && (
                <div className="flex items-center gap-1 text-white/90 text-[10px] mt-1">
                  <Zap className="w-2.5 h-2.5 fill-current" />
                  <span>{usageCount}次</span>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-colors pointer-events-none" />
            </button>
          );
        })}

        {/* Fill empty slots if less than 4 skills */}
        {Array.from({ length: Math.max(0, 4 - displaySkills.length) }).map((_, index) => (
          <div
            key={`empty-skill-${index}`}
            className="bg-gray-100 rounded-xl p-2.5 flex items-center justify-center min-h-[68px]"
          >
            <span className="text-gray-400 text-xs">暂无数据</span>
          </div>
        ))}
      </div>
    </div>
  );
}
