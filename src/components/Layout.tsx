import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, team, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/customers', label: '客户管理', icon: '👥' },
    { path: '/ltc-config', label: 'LTC流程配置', icon: '🔧' },
    { path: '/skills', label: '技能管理', icon: '🛠️' },
    { path: '/interactions', label: '交互记录', icon: '💬' },
    { path: '/documents', label: '文档管理', icon: '📄' },
    { path: '/settings', label: '系统设置', icon: '⚙️' },
    ...(user?.role === 'SYSTEM_ADMIN' ? [{ path: '/system', label: '系统管理', icon: '🔐' }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* 顶部导航栏 */}
      <header className="bg-[#1E293B] shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">AISA</h1>
              <span className="ml-2 text-sm text-gray-300">
                {team?.name || '未加入团队'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-200">
                {user?.full_name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 侧边栏 */}
        <aside className="w-64 bg-[#1E293B] shadow-sm fixed left-0 top-16 bottom-0 overflow-y-auto">
          <nav className="p-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      (item.path === '/' ? location.pathname === '/' : location.pathname === item.path)
                        ? 'bg-[#1677FF] text-white'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 ml-64 pt-20 pb-10 px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
