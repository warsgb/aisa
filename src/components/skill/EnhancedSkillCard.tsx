import type { Skill } from '../../types';
import { Play, Flame } from 'lucide-react';

interface EnhancedSkillCardProps {
  skill: Skill;
  onExecute: (skill: Skill) => void;
  usageCount?: number;
  compact?: boolean;
  isExecuted?: boolean; // 是否已执行过（针对当前客户）
}

const HOT_THRESHOLD = 15;

// 按钮状态类型
type ButtonState = 'default' | 'executed' | 'disabled';

export function EnhancedSkillCard({ skill, onExecute, usageCount = 0, compact = false, isExecuted = false }: EnhancedSkillCardProps) {
  const isHot = usageCount >= HOT_THRESHOLD;

  // 确定按钮状态
  const getButtonState = (): ButtonState => {
    // 如果技能未启用，显示灰色（开发中）
    if (skill.is_enabled === false) {
      return 'disabled';
    }
    // 如果已执行过，显示绿色
    if (isExecuted) {
      return 'executed';
    }
    // 默认蓝色
    return 'default';
  };

  const buttonState = getButtonState();

  // 按钮样式配置
  const buttonStyles = {
    default: {
      bg: 'bg-primary',
      hoverBg: 'hover:bg-primary/90',
      text: 'text-white',
      iconColor: 'fill-current',
    },
    executed: {
      bg: 'bg-green-500',
      hoverBg: 'hover:bg-green-600',
      text: 'text-white',
      iconColor: 'fill-current',
    },
    disabled: {
      bg: 'bg-gray-300',
      hoverBg: 'hover:bg-gray-300',
      text: 'text-gray-500',
      iconColor: 'fill-current',
    },
  };

  const currentStyle = buttonStyles[buttonState];
  const isDisabled = buttonState === 'disabled';

  if (compact) {
    return (
      <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm hover:shadow-card-hover transition-all duration-200 group">
        {/* Single row: Skill name + HOT tag + Play button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-gray-900 truncate">{skill.name}</h4>
            {isHot && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-accent-hot/10 text-accent-hot text-xs font-medium rounded-full shrink-0">
                <Flame className="w-2.5 h-2.5 fill-current" />
                <span className="text-[10px]">HOT</span>
              </span>
            )}
          </div>
          <button
            onClick={() => !isDisabled && onExecute(skill)}
            disabled={isDisabled}
            className={`
              w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200 shadow-sm hover:shadow-md shrink-0
              ${currentStyle.bg} ${currentStyle.hoverBg} ${currentStyle.text}
              ${!isDisabled ? 'active:scale-95 cursor-pointer' : 'cursor-not-allowed opacity-70'}
            `}
            aria-label={`执行 ${skill.name}`}
          >
            <Play className={`w-3 h-3 ml-0.5 ${currentStyle.iconColor}`} fill={buttonState !== 'disabled'} />
          </button>
        </div>
        {/* Second row: Usage count */}
        <div className="mt-1.5 text-xs text-gray-400 number">
          使用 {usageCount} 次
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-card hover:shadow-card-hover transition-all duration-200 group">
      {/* Top: Skill name + HOT tag */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-semibold text-gray-900 flex-1">{skill.name}</h4>
        {isHot && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-accent-hot/10 text-accent-hot text-xs font-medium rounded-full shrink-0">
            <Flame className="w-3 h-3 fill-current" />
            HOT
          </span>
        )}
      </div>

      {/* Middle: Description */}
      {skill.description && (
        <p className="text-sm text-gray-500 line-clamp-2 mb-3 min-h-[2.5rem]">
          {skill.description}
        </p>
      )}

      {/* Bottom: Usage count + Play button */}
      <div className="flex items-center justify-between mt-auto">
        <span className="text-xs text-gray-400 number">
          使用 {usageCount} 次
        </span>
        <button
          onClick={() => !isDisabled && onExecute(skill)}
          disabled={isDisabled}
          className={`
            w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 shadow-sm hover:shadow-md
            ${currentStyle.bg} ${currentStyle.hoverBg} ${currentStyle.text}
            ${!isDisabled ? 'active:scale-95 cursor-pointer' : 'cursor-not-allowed opacity-70'}
          `}
          aria-label={`执行 ${skill.name}`}
        >
          <Play className={`w-4 h-4 ml-0.5 ${currentStyle.iconColor}`} fill={buttonState !== 'disabled'} />
        </button>
      </div>
    </div>
  );
}
