import { useState, useEffect, useCallback } from "react";
import { User, FileCheck, X, Shield, Lock, RefreshCw, LogOut, Users, Settings, Calendar, AlertTriangle, CheckCircle, Search } from "lucide-react";
import { useDarkMode } from "../context/DarkModeContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import DarkModeToggle from "../components/DarkModeToggle";
import { motion } from 'framer-motion';

interface UserData {
  id: number;
  email: string;
  username: string;
  mobile: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  twoFactorEnabled: boolean;
  createdAt: string;
  userImage: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  isBanned: boolean;
  bannedAt: string | null;
}

const Admin: React.FC = () => {
  const { darkMode } = useDarkMode();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }
      setUsers(data);
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    if (user.role !== 'ADMIN') {
      navigate('/');
      return;
    }

    fetchUsers();
  }, [user, navigate, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleBan = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server response:', errorData);
        throw new Error(`Failed to ban user: ${response.status}`);
      }

      const updatedUser = await response.json();
      console.log('User banned:', updatedUser);
      
      await fetchUsers();
    } catch (err) {
      console.error('Ban error:', err);
      setError(err instanceof Error ? err.message : 'Failed to ban user');
    }
  };

  const handleUnban = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/admin/users/${userId}/unban`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server response:', errorData);
        throw new Error(`Failed to unban user: ${response.status}`);
      }

      const updatedUser = await response.json();
      console.log('User unbanned:', updatedUser);
      
      await fetchUsers();
    } catch (err) {
      console.error('Unban error:', err);
      setError(err instanceof Error ? err.message : 'Failed to unban user');
    }
  };

  const handleLock = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/admin/users/${userId}/lock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server response:', errorData);
        throw new Error(`Failed to lock user: ${response.status}`);
      }

      const updatedUser = await response.json();
      console.log('User locked:', updatedUser);
      
      await fetchUsers();
    } catch (err) {
      console.error('Lock error:', err);
      setError(err instanceof Error ? err.message : 'Failed to lock user');
    }
  };

  const handleUnlock = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/admin/users/${userId}/unlock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server response:', errorData);
        throw new Error(`Failed to unlock user: ${response.status}`);
      }

      const updatedUser = await response.json();
      console.log('User unlocked:', updatedUser);
      
      await fetchUsers();
    } catch (err) {
      console.error('Unlock error:', err);
      setError(err instanceof Error ? err.message : 'Failed to unlock user');
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Ask for confirmation before deleting
      if (!window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
        return;
      }

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server response:', errorData);
        throw new Error(`Failed to delete user: ${errorData.error || response.status}`);
      }

      console.log('User deleted successfully');
      await fetchUsers(); // Refresh the user list
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      {/* Fixed Dark Mode Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <DarkModeToggle />
      </div>

      {/* Header */}
      <div className={`fixed top-0 left-0 right-0 z-10 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Users className={`h-8 w-8 mr-3 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
                <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>Admin Dashboard</h1>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                darkMode ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"
              }`}>
                Admin Panel
              </span>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                className={`p-2 rounded-lg transition-colors flex items-center ${
                  darkMode
                    ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                title="Refresh user list"
              >
                <RefreshCw size={20} className="mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={handleLogout}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  darkMode
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
              >
                <LogOut size={20} className="mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 p-6">
        <div className="max-w-7xl mx-auto">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 bg-red-100 text-red-600 rounded-lg border border-red-200"
            >
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                {error}
              </div>
            </motion.div>
          )}

          {/* Stats Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"
          >
            <div className={`p-6 rounded-lg shadow-sm transform transition-all duration-200 hover:scale-105 ${darkMode ? "bg-gray-800 hover:bg-gray-750" : "bg-white hover:bg-gray-50"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Total Users</p>
                  <h3 className={`text-3xl font-bold mt-2 ${darkMode ? "text-white" : "text-gray-900"}`}>{users.length}</h3>
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                    Active accounts in system
                  </p>
                </div>
                <div className={`p-4 rounded-full ${darkMode ? "bg-blue-900/20" : "bg-blue-100"}`}>
                  <Users className={`h-8 w-8 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
                </div>
              </div>
            </div>
            
            <div className={`p-6 rounded-lg shadow-sm transform transition-all duration-200 hover:scale-105 ${darkMode ? "bg-gray-800 hover:bg-gray-750" : "bg-white hover:bg-gray-50"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-600"}`}>2FA Enabled</p>
                  <h3 className={`text-3xl font-bold mt-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                    {users.filter(u => u.twoFactorEnabled).length}
                  </h3>
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                    Secured with 2FA
                  </p>
                </div>
                <div className={`p-4 rounded-full ${darkMode ? "bg-green-900/20" : "bg-green-100"}`}>
                  <Shield className={`h-8 w-8 ${darkMode ? "text-green-400" : "text-green-600"}`} />
                </div>
              </div>
            </div>
            
            <div className={`p-6 rounded-lg shadow-sm transform transition-all duration-200 hover:scale-105 ${darkMode ? "bg-gray-800 hover:bg-gray-750" : "bg-white hover:bg-gray-50"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Locked Accounts</p>
                  <h3 className={`text-3xl font-bold mt-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                    {users.filter(u => u.lockedUntil && new Date(u.lockedUntil) > new Date()).length}
                  </h3>
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                    Currently locked out
                  </p>
                </div>
                <div className={`p-4 rounded-full ${darkMode ? "bg-red-900/20" : "bg-red-100"}`}>
                  <Lock className={`h-8 w-8 ${darkMode ? "text-red-400" : "text-red-600"}`} />
                </div>
              </div>
            </div>
          </motion.div>

          {/* User List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-sm`}
          >
            <div className={`p-6 border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                <h2 className={`text-xl font-semibold flex items-center ${darkMode ? "text-white" : "text-gray-900"}`}>
                  <User className="mr-2" />
                  User Management
                </h2>
                
                {/* Search Bar */}
                <div className="relative w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full sm:w-64 pl-10 pr-4 py-2 rounded-lg border ${
                      darkMode 
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" 
                        : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <Search className={`h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={darkMode ? "bg-gray-800" : "bg-gray-50"}>
                    <tr>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-600"} uppercase tracking-wider`}>
                        User
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-600"} uppercase tracking-wider`}>
                        Role
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-600"} uppercase tracking-wider`}>
                        Status
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-600"} uppercase tracking-wider`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
                    {filteredUsers.map((user) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-50"} transition-colors`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {user.userImage ? (
                              <img 
                                src={user.userImage} 
                                alt={user.username} 
                                className="w-10 h-10 rounded-full mr-3 object-cover ring-2 ring-offset-2 ring-gray-300"
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-full mr-3 flex items-center justify-center ${darkMode ? "bg-gray-700" : "bg-gray-200"} ring-2 ring-offset-2 ring-gray-300`}>
                                <User size={20} className={darkMode ? "text-gray-400" : "text-gray-500"} />
                              </div>
                            )}
                            <div>
                              <div className={`text-sm font-medium ${darkMode ? "text-gray-200" : "text-gray-900"}`}>
                                {user.username}
                              </div>
                              <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                                {user.email}
                              </div>
                              {user.mobile && (
                                <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                                  {user.mobile}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'ADMIN'
                              ? "bg-purple-100 text-purple-800"
                              : user.role === 'MODERATOR'
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}>
                            {user.role.toLowerCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.twoFactorEnabled
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {user.twoFactorEnabled ? "2FA Enabled" : "2FA Disabled"}
                            </span>
                            {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
                              <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                                Locked
                              </span>
                            )}
                            {user.isBanned && (
                              <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                Banned
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-4">
                            {!user.isBanned ? (
                              <button
                                onClick={() => handleBan(user.id)}
                                className={`flex items-center px-3 py-1 rounded-md transition-colors ${
                                  darkMode
                                    ? "bg-orange-600 text-white hover:bg-orange-700"
                                    : "bg-orange-500 text-white hover:bg-orange-600"
                                }`}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Ban Account
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUnban(user.id)}
                                className={`flex items-center px-3 py-1 rounded-md transition-colors ${
                                  darkMode
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "bg-green-500 text-white hover:bg-green-600"
                                }`}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Unban Account
                              </button>
                            )}
                            {/* Lock/Unlock Button */}
                            {user.lockedUntil && new Date(user.lockedUntil) > new Date() ? (
                              <button
                                onClick={() => handleUnlock(user.id)}
                                className={`flex items-center px-3 py-1 rounded-md transition-colors ${
                                  darkMode
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "bg-green-500 text-white hover:bg-green-600"
                                }`}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Unlock Account
                              </button>
                            ) : (
                              <button
                                onClick={() => handleLock(user.id)}
                                className={`flex items-center px-3 py-1 rounded-md transition-colors ${
                                  darkMode
                                    ? "bg-amber-500 text-white hover:bg-amber-600"
                                    : "bg-amber-400 text-white hover:bg-amber-500"
                                }`}
                              >
                                <Lock className="w-4 h-4 mr-1" />
                                Lock Account
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(user.id)}
                              className={`flex items-center px-3 py-1 rounded-md transition-colors ${
                                darkMode
                                  ? "bg-red-600 text-white hover:bg-red-700"
                                  : "bg-red-500 text-white hover:bg-red-600"
                              }`}
                            >
                              <AlertTriangle className="w-4 h-4 mr-1" />
                              Delete Account
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Admin; 