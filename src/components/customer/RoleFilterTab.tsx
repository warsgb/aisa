import type { IronTriangleRole } from '../../types';

interface RoleFilterTabProps {
  activeRole: IronTriangleRole | 'ALL';
  onRoleChange: (role: IronTriangleRole | 'ALL') => void;
  disabled?: boolean;
}

const ROLES: Array<{ value: IronTriangleRole | 'ALL'; label: string }> = [
  { value: 'ALL', label: '全部技能' },
  { value: 'AR', label: '客户经理' },
  { value: 'SR', label: '解决方案经理' },
  { value: 'FR', label: '交付经理' },
];

export function RoleFilterTab({ activeRole, onRoleChange, disabled }: RoleFilterTabProps) {
  return (
    <div className="inline-flex items-center gap-1 px-1 py-1 bg-gray-100 rounded-xl">
      {ROLES.map((role) => (
        <button
          key={role.value}
          onClick={() => !disabled && onRoleChange(role.value)}
          disabled={disabled}
          className={`
            px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${activeRole === role.value
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }
          `}
        >
          {role.label}
        </button>
      ))}
    </div>
  );
}
