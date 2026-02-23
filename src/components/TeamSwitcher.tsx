import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useCurrentCustomerStore } from '../stores';
import { apiService } from '../services/api.service';
import { ChevronDown, Check } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  role: string;
}

export default function TeamSwitcher() {
  const { user, team } = useAuth();
  const { clearCustomer } = useCurrentCustomerStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const loadUserTeams = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Use getTeams which returns all teams the user is a member of
      const userTeams = await apiService.getTeams();
      setTeams(userTeams);
    } catch (error) {
      console.error('加载用户团队失败:', error);
      setTeams([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserTeams();
  }, [user]);

  // Update dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  const handleTeamChange = async (selectedTeam: Team) => {
    try {
      // Clear current customer state before switching team
      clearCustomer();
      // Also clear localStorage to prevent cross-team customer data
      localStorage.removeItem('current-customer-storage');

      // Call API to switch team (this will update the token)
      const response = await apiService.switchTeam(selectedTeam.id);

      // Update localStorage with new tokens
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);

      // Close dropdown
      setIsOpen(false);

      // Force reload after a short delay to ensure tokens are saved
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('切换团队失败:', error);
      alert('切换团队失败: ' + (error as Error).message);
    }
  };

  if (!user || user.role === 'SYSTEM_ADMIN') {
    return null;
  }

  if (teams.length <= 1) {
    return null; // Don't show switcher if user has only one team
  }

  const dropdown = isOpen ? (
    <div
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[9999]"
      style={{
        top: `${dropdownPosition.top}px`,
        right: `${dropdownPosition.right}px`,
      }}
    >
      {/* 点击外部关闭的遮罩层 */}
      <div
        className="fixed inset-0 -z-10"
        onClick={() => setIsOpen(false)}
      />
      <div className="p-2">
        <div className="text-xs font-medium text-gray-500 px-3 py-2 mb-1">
          切换团队
        </div>
        {isLoading ? (
          <div className="px-3 py-4 text-center text-sm text-gray-500">
            加载中...
          </div>
        ) : teams.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-gray-500">
            暂无团队
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {teams.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTeamChange(t)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{t.name}</span>
                  <span className="text-xs text-gray-500">
                    {t.role === 'OWNER' ? '所有者' : t.role === 'ADMIN' ? '管理员' : '成员'}
                  </span>
                </div>
                {team?.id === t.id && (
                  <Check className="w-4 h-4 text-[#1677FF]" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">
          {team?.name || '未选择团队'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}
