import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api.service';
import type { SharedFramework, TeamMember, InviteMemberData } from '../../types';

export default function SettingsPage() {
  const { user, team, logout } = useAuth();
  const [frameworks, setFrameworks] = useState<SharedFramework[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');

  useEffect(() => {
    loadData();
  }, [team]);

  const loadData = async () => {
    if (!team) return;
    try {
      const [frameworksData, teamData] = await Promise.all([
        apiService.getFrameworks(),
        apiService.getTeam(team.id),
      ]);
      setFrameworks(frameworksData);
      setTeamMembers(teamData.members || []);
    } catch (error) {
      console.error('加载设置失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!team || !inviteEmail.trim()) return;

    try {
      const payload: InviteMemberData = {
        email: inviteEmail,
        role: inviteRole,
      };
      // 如果提供了密码，添加到 payload
      if (invitePassword.trim()) {
        payload.password = invitePassword;
      }

      await apiService.createTeamMember(team.id, payload);
      setShowInviteModal(false);
      setInviteEmail('');
      setInvitePassword('');
      setInviteRole('MEMBER');
      alert('邀请已发送');
      loadData();
    } catch (error) {
      console.error('邀请成员失败:', error);
      alert('邀请成员失败');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!team) return;
    if (!confirm(`确定要移除成员 "${memberName}" 吗？`)) return;

    try {
      await apiService.removeTeamMember(team.id, memberId);
      loadData();
    } catch (error) {
      console.error('移除成员失败:', error);
      alert('移除成员失败');
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: 'MEMBER' | 'ADMIN') => {
    if (!team) return;

    try {
      await apiService.updateTeamMember(team.id, memberId, { role: newRole });
      loadData();
    } catch (error) {
      console.error('更新成员角色失败:', error);
      alert('更新成员角色失败');
    }
  };

  const getRoleText = (role: string) => {
    const roles: Record<string, string> = {
      OWNER: '所有者',
      ADMIN: '管理员',
      MEMBER: '成员',
    };
    return roles[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      OWNER: 'bg-purple-100 text-purple-700',
      ADMIN: 'bg-blue-100 text-blue-700',
      MEMBER: 'bg-gray-100 text-gray-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const getScopeColor = (scope: string) => {
    const colors: Record<string, string> = {
      global: 'bg-green-100 text-green-700',
      team: 'bg-blue-100 text-blue-700',
    };
    return colors[scope] || 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">系统设置</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 团队信息 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">团队信息</h2>
          {team && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">团队名称</label>
                <p className="text-gray-900">{team.name}</p>
              </div>
              {team.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">描述</label>
                  <p className="text-gray-900">{team.description}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">您的角色</label>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(team.role)}`}>
                  {getRoleText(team.role)}
                </span>
              </div>
              <div className="text-xs text-gray-400 pt-2 border-t">
                团队 ID: {team.id}
              </div>
            </div>
          )}
        </div>

        {/* 账户信息 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">账户信息</h2>
          {user && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">姓名</label>
                <p className="text-gray-900">{user.full_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">邮箱</label>
                <p className="text-gray-900">{user.email}</p>
              </div>
              <div className="pt-2">
                <button
                  onClick={logout}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  退出登录
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 团队成员 */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">团队成员</h2>
            {(team?.role === 'OWNER' || team?.role === 'ADMIN') && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm"
              >
                邀请成员
              </button>
            )}
          </div>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无团队成员
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">姓名</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">邮箱</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">角色</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">加入时间</th>
                    {(team?.role === 'OWNER' || team?.role === 'ADMIN') && (
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">操作</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{member.full_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{member.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(member.role)}`}>
                          {getRoleText(member.role)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(member.joined_at).toLocaleDateString('zh-CN')}
                      </td>
                      {(team?.role === 'OWNER' || team?.role === 'ADMIN') && (
                        <td className="py-3 px-4 text-sm">
                          {member.role !== 'OWNER' && (
                            <div className="flex gap-2">
                              <select
                                value={member.role}
                                onChange={(e) => handleUpdateMemberRole(member.id, e.target.value as 'MEMBER' | 'ADMIN')}
                                className="text-xs border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="MEMBER">成员</option>
                                <option value="ADMIN">管理员</option>
                              </select>
                              <button
                                onClick={() => handleRemoveMember(member.id, member.full_name)}
                                className="text-red-600 hover:text-red-700"
                              >
                                移除
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 共享框架 */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">共享框架</h2>
          {frameworks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无共享框架
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {frameworks.map((framework) => (
                <div key={framework.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{framework.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${getScopeColor(framework.scope)}`}>
                      {framework.scope === 'global' ? '全局' : '团队'}
                    </span>
                  </div>
                  {framework.description && (
                    <p className="text-sm text-gray-600 mb-2">{framework.description}</p>
                  )}
                  <p className="text-xs text-gray-400">/{framework.slug}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 邀请成员弹窗 */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">邀请团队成员</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱 *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密码（可选，直接指定则无需邮件验证）</label>
                <input
                  type="password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="留空则发送邮件验证，填写则直接设置密码"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'MEMBER' | 'ADMIN')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="MEMBER">成员</option>
                  <option value="ADMIN">管理员</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setInvitePassword('');
                  setInviteRole('MEMBER');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setInvitePassword('');
                  setInviteRole('MEMBER');
                }}
                disabled={!inviteEmail.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                邀请
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
