import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api.service';
import type { SystemUser, SystemTeam, SystemStats, TeamApplication, CreateSystemUserDto, CreateSystemTeamDto } from '../../types';

type TabType = 'users' | 'teams' | 'stats' | 'applications';

export default function SystemPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [teams, setTeams] = useState<SystemTeam[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [applications, setApplications] = useState<TeamApplication[]>([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [teamsPagination, setTeamsPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [applicationsPagination, setApplicationsPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<TeamApplication | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Create user form
  const [newUser, setNewUser] = useState<CreateSystemUserDto>({
    email: '',
    full_name: '',
    password: '',
    role: 'MEMBER',
    is_active: true,
  });

  // Create team form
  const [newTeam, setNewTeam] = useState<CreateSystemTeamDto>({
    name: '',
    description: '',
    owner_id: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab, usersPagination.page, teamsPagination.page, applicationsPagination.page]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'users') {
        const result = await apiService.getAllSystemUsers(
          usersPagination.page,
          usersPagination.pageSize,
          search || undefined
        );
        setUsers(result.data);
        setUsersPagination(prev => ({ ...prev, total: result.total }));
      } else if (activeTab === 'teams') {
        const result = await apiService.getAllSystemTeams(
          teamsPagination.page,
          teamsPagination.pageSize,
          search || undefined
        );
        setTeams(result.data);
        setTeamsPagination(prev => ({ ...prev, total: result.total }));
      } else if (activeTab === 'stats') {
        const statsData = await apiService.getSystemStats();
        setStats(statsData);
      } else if (activeTab === 'applications') {
        const result = await apiService.getSystemTeamApplications(
          applicationsPagination.page,
          applicationsPagination.pageSize
        );
        setApplications(result.data);
        setApplicationsPagination(prev => ({ ...prev, total: result.total }));
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      alert('加载数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (activeTab === 'users') {
      setUsersPagination(prev => ({ ...prev, page: 1 }));
    } else if (activeTab === 'teams') {
      setTeamsPagination(prev => ({ ...prev, page: 1 }));
    }
    loadData();
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!confirm(`确定要${currentStatus ? '禁用' : '启用'}此用户吗？`)) return;

    try {
      await apiService.updateUserStatus(userId, { is_active: !currentStatus });
      alert('用户状态更新成功');
      loadData();
    } catch (error) {
      console.error('更新用户状态失败:', error);
      alert('更新用户状态失败');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword.trim()) return;

    try {
      await apiService.resetUserPassword(selectedUser.id, { new_password: newPassword });
      setShowPasswordModal(false);
      setSelectedUser(null);
      setNewPassword('');
      alert('密码重置成功');
    } catch (error) {
      console.error('重置密码失败:', error);
      alert('重置密码失败');
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`确定要删除团队 "${teamName}" 吗？此操作不可恢复！`)) return;

    try {
      await apiService.deleteSystemTeam(teamId);
      alert('团队删除成功');
      loadData();
    } catch (error) {
      console.error('删除团队失败:', error);
      alert('删除团队失败');
    }
  };

  const handleCreateUser = async () => {
    try {
      await apiService.createSystemUser(newUser);
      setShowCreateUserModal(false);
      setNewUser({
        email: '',
        full_name: '',
        password: '',
        role: 'MEMBER',
        is_active: true,
      });
      alert('用户创建成功');
      loadData();
    } catch (error) {
      console.error('创建用户失败:', error);
      alert('创建用户失败');
    }
  };

  const handleCreateTeam = async () => {
    try {
      await apiService.createSystemTeam(newTeam);
      setShowCreateTeamModal(false);
      setNewTeam({
        name: '',
        description: '',
        owner_id: '',
      });
      alert('团队创建成功');
      loadData();
    } catch (error) {
      console.error('创建团队失败:', error);
      alert('创建团队失败');
    }
  };

  const handleReviewApplication = async (status: 'approved' | 'rejected') => {
    if (!selectedApplication) return;

    try {
      await apiService.reviewTeamApplication(selectedApplication.id, {
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : undefined,
      });
      setShowReviewModal(false);
      setSelectedApplication(null);
      setRejectionReason('');
      alert(status === 'approved' ? '申请已批准' : '申请已拒绝');
      loadData();
    } catch (error) {
      console.error('审核申请失败:', error);
      alert('审核申请失败');
    }
  };

  const getRoleText = (role: string) => {
    const roles: Record<string, string> = {
      SYSTEM_ADMIN: '系统管理员',
      ADMIN: '管理员',
      MEMBER: '成员',
      OWNER: '所有者',
    };
    return roles[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      SYSTEM_ADMIN: 'bg-red-100 text-red-700',
      ADMIN: 'bg-blue-100 text-blue-700',
      MEMBER: 'bg-gray-100 text-gray-700',
      OWNER: 'bg-purple-100 text-purple-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const getApplicationStatusText = (status: string) => {
    const statuses: Record<string, string> = {
      pending: '待审核',
      approved: '已批准',
      rejected: '已拒绝',
    };
    return statuses[status] || status;
  };

  const getApplicationStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getCurrentPagination = () => {
    switch (activeTab) {
      case 'users':
        return usersPagination;
      case 'teams':
        return teamsPagination;
      case 'applications':
        return applicationsPagination;
      default:
        return usersPagination;
    }
  };

  const getTotalPages = () => {
    const pagination = getCurrentPagination();
    return Math.ceil(pagination.total / pagination.pageSize);
  };

  const handlePageChange = (newPage: number) => {
    if (activeTab === 'users') {
      setUsersPagination(prev => ({ ...prev, page: newPage }));
    } else if (activeTab === 'teams') {
      setTeamsPagination(prev => ({ ...prev, page: newPage }));
    } else if (activeTab === 'applications') {
      setApplicationsPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const currentPagination = getCurrentPagination();
  const totalPages = getTotalPages();

  if (user?.role !== 'SYSTEM_ADMIN') {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">访问被拒绝</h1>
          <p className="text-gray-600">您没有权限访问此页面</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">系统管理</h1>

      {/* 标签页 */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-[#1677FF] text-[#1677FF]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              系统统计
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-[#1677FF] text-[#1677FF]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              用户管理
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'teams'
                  ? 'border-[#1677FF] text-[#1677FF]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              团队管理
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'applications'
                  ? 'border-[#1677FF] text-[#1677FF]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              团队申请
            </button>
          </nav>
        </div>
      </div>

      {/* 搜索栏和操作按钮 */}
      {(activeTab === 'users' || activeTab === 'teams') && (
        <div className="mb-6 flex gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={activeTab === 'users' ? '搜索用户（邮箱或姓名）' : '搜索团队'}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF]"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-[#1677FF] text-white rounded-lg hover:bg-[#4096FF]"
          >
            搜索
          </button>
          <button
            onClick={() => {
              setSearch('');
              loadData();
            }}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            重置
          </button>
          {activeTab === 'users' && (
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              新建用户
            </button>
          )}
          {activeTab === 'teams' && (
            <button
              onClick={() => setShowCreateTeamModal(true)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              新建团队
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1677FF]"></div>
        </div>
      ) : (
        <>
          {/* 系统统计 */}
          {activeTab === 'stats' && stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">总用户数</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalUsers}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">活跃用户</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.activeUsers}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">总团队数</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalTeams}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">团队成员总数</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalTeamMembers}</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 用户列表 */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">姓名</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">邮箱</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">角色</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">状态</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">团队</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">注册时间</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((userItem) => (
                      <tr key={userItem.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{userItem.full_name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{userItem.email}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(userItem.role)}`}>
                            {getRoleText(userItem.role)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            userItem.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {userItem.is_active ? '活跃' : '已禁用'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {userItem.teams.map(t => t.name).join(', ') || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {new Date(userItem.created_at).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleUserStatus(userItem.id, userItem.is_active)}
                              className={`${
                                userItem.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'
                              }`}
                            >
                              {userItem.is_active ? '禁用' : '启用'}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(userItem);
                                setShowPasswordModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              重置密码
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-gray-700">
                    共 {currentPagination.total} 条记录
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(currentPagination.page - 1)}
                      disabled={currentPagination.page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      上一页
                    </button>
                    <span className="px-4 py-2 text-gray-700">
                      第 {currentPagination.page} / {totalPages} 页
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPagination.page + 1)}
                      disabled={currentPagination.page === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 团队列表 */}
          {activeTab === 'teams' && (
            <div className="bg-white rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">团队名称</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">描述</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">所有者</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">成员数量</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">创建时间</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team) => (
                      <tr key={team.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{team.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{team.description || '-'}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {team.owner ? team.owner.full_name : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{team.member_count}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {new Date(team.created_at).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <button
                            onClick={() => handleDeleteTeam(team.id, team.name)}
                            className="text-red-600 hover:text-red-700"
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-gray-700">
                    共 {currentPagination.total} 条记录
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(currentPagination.page - 1)}
                      disabled={currentPagination.page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      上一页
                    </button>
                    <span className="px-4 py-2 text-gray-700">
                      第 {currentPagination.page} / {totalPages} 页
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPagination.page + 1)}
                      disabled={currentPagination.page === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 团队申请列表 */}
          {activeTab === 'applications' && (
            <div className="bg-white rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">申请团队</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">描述</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">申请人</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">状态</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">申请时间</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{app.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{app.description || '-'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {app.user ? `${app.user.full_name} (${app.user.email})` : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getApplicationStatusColor(app.status)}`}>
                            {getApplicationStatusText(app.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {new Date(app.created_at).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {app.status === 'pending' ? (
                            <button
                              onClick={() => {
                                setSelectedApplication(app);
                                setShowReviewModal(true);
                              }}
                              className="text-[#1677FF] hover:text-[#4096FF]"
                            >
                              审核
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-gray-700">
                    共 {currentPagination.total} 条记录
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(currentPagination.page - 1)}
                      disabled={currentPagination.page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      上一页
                    </button>
                    <span className="px-4 py-2 text-gray-700">
                      第 {currentPagination.page} / {totalPages} 页
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPagination.page + 1)}
                      disabled={currentPagination.page === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 重置密码弹窗 */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">重置用户密码</h2>
            <p className="text-sm text-gray-600 mb-4">
              为 <span className="font-medium">{selectedUser.full_name}</span> ({selectedUser.email}) 重置密码
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新密码 *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF]"
                  placeholder="请输入新密码（至少6位）"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setSelectedUser(null);
                  setNewPassword('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleResetPassword}
                disabled={!newPassword.trim() || newPassword.length < 6}
                className="px-4 py-2 bg-[#1677FF] text-white rounded-lg hover:bg-[#4096FF] disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 创建用户弹窗 */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">创建新用户</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF]"
                  placeholder="请输入姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱 *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF]"
                  placeholder="请输入邮箱"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密码 *</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF]"
                  placeholder="请输入密码（至少6位）"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF]"
                >
                  <option value="MEMBER">成员</option>
                  <option value="ADMIN">管理员</option>
                  <option value="SYSTEM_ADMIN">系统管理员</option>
                </select>
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newUser.is_active}
                    onChange={(e) => setNewUser({ ...newUser, is_active: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">启用账号</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateUserModal(false);
                  setNewUser({
                    email: '',
                    full_name: '',
                    password: '',
                    role: 'MEMBER',
                    is_active: true,
                  });
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleCreateUser}
                disabled={!newUser.email.trim() || !newUser.full_name.trim() || !newUser.password.trim() || newUser.password.length < 6}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                创建用户
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 创建团队弹窗 */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">创建新团队</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">团队名称 *</label>
                <input
                  type="text"
                  required
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF]"
                  placeholder="请输入团队名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF]"
                  placeholder="请输入团队描述"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所有者用户ID *</label>
                <input
                  type="text"
                  required
                  value={newTeam.owner_id}
                  onChange={(e) => setNewTeam({ ...newTeam, owner_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF]"
                  placeholder="请输入所有者用户ID"
                />
                <p className="text-xs text-gray-500 mt-1">从用户列表中复制用户ID</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateTeamModal(false);
                  setNewTeam({
                    name: '',
                    description: '',
                    owner_id: '',
                  });
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={!newTeam.name.trim() || !newTeam.owner_id.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                创建团队
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 审核申请弹窗 */}
      {showReviewModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">审核团队申请</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">申请人:</span> {selectedApplication.user?.full_name} ({selectedApplication.user?.email})
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">团队名称:</span> {selectedApplication.name}
              </p>
              {selectedApplication.description && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">描述:</span> {selectedApplication.description}
                </p>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">拒绝原因（拒绝时填写）</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1677FF] focus:border-[#1677FF]"
                  placeholder="如果拒绝申请，请填写原因"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedApplication(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => handleReviewApplication('rejected')}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                拒绝
              </button>
              <button
                onClick={() => handleReviewApplication('approved')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                批准
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
