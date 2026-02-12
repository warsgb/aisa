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
    { path: '/dashboard', label: '仪表盘', icon: '📊' },
    { path: '/customers', label: '客户', icon: '👥' },
    { path: '/skills', label: '技能', icon: '🛠️' },
    { path: '/interactions', label: '交互', icon: '💬' },
    { path: '/documents', label: '文档', icon: '📄' },
    { path: '/settings', label: '设置', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-indigo-600">AISA</h1>
              <span className="ml-2 text-sm text-gray-500">
                {team?.name || '未加入团队'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user?.full_name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* 侧边栏 */}
        <aside className="w-64 bg-white shadow-sm mt-6 mr-6 rounded-lg">
          <nav className="p-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg ${
                      location.pathname === item.path
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-700 hover:bg-gray-50'
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
        <main className="flex-1 mt-6 pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
