import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TeamSwitcher from './TeamSwitcher';
import {
  Home,
  Users,
  Workflow,
  Wrench,
  MessageSquare,
  FileText,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Database,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, team, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/customers', label: '客户管理', icon: Users },
    { path: '/ltc-config', label: 'LTC流程配置', icon: Workflow },
    { path: '/skills', label: '技能管理', icon: Wrench },
    { path: '/interactions', label: '交互记录', icon: MessageSquare },
    { path: '/documents', label: '文档管理', icon: FileText },
    { path: '/settings', label: '系统设置', icon: Settings },
    ...(user?.role === 'SYSTEM_ADMIN' ? [
      { path: '/system-config', label: '系统配置', icon: Database },
      { path: '/system', label: '系统管理', icon: Shield },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* 顶部导航栏 - 清新白色风格 */}
      <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50 border-b border-gray-100">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between h-14">
            <div className="flex items-center">
              {/* 菜单折叠按钮 */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="mr-4 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title={isCollapsed ? '展开菜单' : '收起菜单'}
              >
                {isCollapsed ? (
                  <Menu className="w-5 h-5 text-gray-600" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-600" />
                )}
              </button>

              <h1 className="text-lg font-bold text-primary">Win-AI</h1>
              <span className="ml-3 text-sm text-gray-500">
                {team?.name || '未加入团队'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <TeamSwitcher />
              <span className="text-sm text-gray-600">
                {user?.full_name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                退出
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 侧边栏 - 清新白色风格，可折叠 */}
        <aside
          className={`
            bg-white shadow-sm fixed left-0 top-14 bottom-0 overflow-hidden
            transition-all duration-300 ease-in-out z-40
            border-r border-gray-100
            ${isCollapsed ? 'w-16' : 'w-56'}
          `}
        >
          <nav className="p-2 pt-3">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = item.path === '/' ? location.pathname === '/' : location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`
                        relative flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group
                        ${isActive
                          ? 'text-primary bg-primary/5'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                        }
                        ${isCollapsed ? 'justify-center' : ''}
                      `}
                      title={isCollapsed ? item.label : undefined}
                    >
                      {isActive && !isCollapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                      )}
                      <Icon className={`w-5 h-5 shrink-0`} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* 折叠/展开按钮 */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`
              absolute bottom-4 right-0 transform translate-x(1/2)
              w-6 h-6 bg-white border border-gray-200 rounded-full
              flex items-center justify-center
              shadow-sm hover:shadow-md transition-all duration-200
              ${isCollapsed ? 'left-1/2 -translate-x-1/2' : ''}
            `}
            title={isCollapsed ? '展开菜单' : '收起菜单'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </aside>

        {/* 主内容区 */}
        <main
          className={`
            flex-1 pt-14 pb-6 px-6 transition-all duration-300
            ${isCollapsed ? 'ml-16' : 'ml-56'}
          `}
        >
          <div className="pt-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
