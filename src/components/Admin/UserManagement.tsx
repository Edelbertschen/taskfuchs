import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/apiService';
import { 
  Users, 
  Trash2, 
  Shield, 
  ShieldOff, 
  RefreshCw, 
  Search,
  Calendar,
  CheckSquare,
  FileText,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  X
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  language: string;
  createdAt: string;
  lastLoginAt: string;
  _count?: {
    tasks: number;
    projects: number;
  };
}

interface Stats {
  totalUsers: number;
  totalTasks: number;
  totalProjects: number;
  activeUsersLast7Days: number;
  activeUsersLast30Days: number;
}

export function UserManagement() {
  const { t } = useTranslation();
  const { state: authState } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch users and stats
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [usersResponse, statsResponse] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getStats()
      ]);
      
      setUsers(usersResponse.users);
      // Handle both old (totalNotes) and new (totalProjects) API responses
      const stats = statsResponse.stats as any;
      setStats({
        ...stats,
        totalProjects: stats.totalProjects ?? stats.totalNotes ?? 0
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authState.isAdmin) {
      fetchData();
    }
  }, [authState.isAdmin]);

  // Filter users by search query
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handle user deletion
  const handleDeleteUser = async (userId: string) => {
    setIsDeleting(true);
    try {
      await adminAPI.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle admin toggle
  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    try {
      await adminAPI.setAdmin(userId, !isAdmin);
      setUsers(users.map(u => 
        u.id === userId ? { ...u, isAdmin: !isAdmin } : u
      ));
    } catch (err: any) {
      setError(err.message || 'Failed to update admin status');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Not admin - show access denied
  if (!authState.isAdmin) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl max-w-md border border-gray-200/50 dark:border-gray-700/50">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {t('admin.accessDenied', 'Access Denied')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('admin.adminRequired', 'You need admin privileges to view this page.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('admin.userManagement', 'User Management')}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {t('admin.manageAllUsers', 'Manage all online users')}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.totalUsers', 'Users')}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTasks}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.totalTasks', 'Tasks')}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalProjects}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.totalProjects', 'Projects')}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeUsersLast7Days}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.active7Days', 'Active (7d)')}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeUsersLast30Days}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.active30Days', 'Active (30d)')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50/90 dark:bg-red-900/30 backdrop-blur-sm border border-red-200/50 dark:border-red-800/50 rounded-xl text-red-700 dark:text-red-400 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-800/30 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search and Refresh */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('admin.searchUsers', 'Search users...')}
              className="w-full pl-10 pr-4 py-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 mx-auto border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
              <p className="mt-4 text-gray-500 dark:text-gray-400">{t('common.loading', 'Loading...')}</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery 
                  ? t('admin.noUsersFound', 'No users found')
                  : t('admin.noUsers', 'No users yet')
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('admin.user', 'User')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('admin.stats', 'Statistics')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('admin.created', 'Created')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('admin.lastLogin', 'Last Login')}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('admin.actions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-medium">
                            {user.name?.[0] || user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {user.name || 'Unnamed User'}
                              </p>
                              {user.isAdmin && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
                                  Admin
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <CheckSquare className="w-4 h-4" />
                            {user._count?.tasks || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {user._count?.projects || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.lastLoginAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                            disabled={user.id === authState.user?.id}
                            className={`p-2 rounded-lg transition-colors ${
                              user.isAdmin 
                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={user.isAdmin ? t('admin.revokeAdmin', 'Revoke admin privileges') : t('admin.makeAdmin', 'Make admin')}
                          >
                            {user.isAdmin ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(user.id)}
                            disabled={user.id === authState.user?.id}
                            className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t('admin.deleteUser', 'Delete user')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200/50 dark:border-gray-700/50">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white mb-2">
                {t('admin.confirmDelete', 'Delete user?')}
              </h3>
              <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
                {t('admin.deleteWarning', 'This action cannot be undone. All user data will be deleted.')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={() => handleDeleteUser(deleteConfirm)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {t('common.delete', 'Delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagement;

