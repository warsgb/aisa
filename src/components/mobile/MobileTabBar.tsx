import { LayoutDashboard, Users, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMobileTabStore, type MobileTab } from '../../stores/mobileTab.store';

const tabs: { key: MobileTab; label: string; icon: React.ElementType; path: string }[] = [
  { key: 'workspace', label: '工作台', icon: LayoutDashboard, path: '/' },
  { key: 'customers', label: '客户', icon: Users, path: '/customers' },
  { key: 'history', label: '历史', icon: Clock, path: '/interactions' },
];

/**
 * Bottom tab navigation bar for mobile experience
 * Fixed at bottom with 3 tabs: Workspace, Customers, History
 */
export function MobileTabBar() {
  const { activeTab, setActiveTab } = useMobileTabStore();
  const navigate = useNavigate();

  const handleTabClick = (tab: MobileTab, path: string) => {
    setActiveTab(tab);
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key, tab.path)}
              className="flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-colors duration-200"
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={`w-6 h-6 mb-1 transition-colors duration-200 ${
                  isActive ? 'text-[#1677FF]' : 'text-[#9CA3AF]'
                }`}
              />
              <span
                className={`text-xs font-medium transition-colors duration-200 ${
                  isActive ? 'text-[#1677FF]' : 'text-[#9CA3AF]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
