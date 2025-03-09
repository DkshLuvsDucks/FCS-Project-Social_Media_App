import React, { useState, useEffect } from 'react';
import { Search, User } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import DarkModeToggle from '../components/DarkModeToggle';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface SearchUser {
  id: number;
  username: string;
  email: string;
  role: string;
}

const Home: React.FC = () => {
  const { darkMode } = useDarkMode();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const navigate = useNavigate();

  const suggestedUsers = [
    { id: 1, name: 'Jane Smith', role: 'Frontend Developer', avatar: null },
    { id: 2, name: 'Jane Smith', role: 'Frontend Developer', avatar: null },
    { id: 3, name: 'Jane Smith', role: 'Frontend Developer', avatar: null },
  ];

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length === 0) {
        setSearchResults([]);
        setIsSearching(false);
        setSearchError(null);
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        console.log('Sending search request for:', searchQuery);
        const token = localStorage.getItem('token');
        console.log('Using token:', token ? 'Token exists' : 'No token found');

        const response = await fetch(`/api/users/search?query=${encodeURIComponent(searchQuery)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        console.log('Search response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
          console.error('Search error response:', errorData);
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Search results:', data);
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchError(error instanceof Error ? error.message : 'Failed to search users');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Left Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 ml-16 flex flex-col min-h-screen">
        {/* Top Bar with Search and Dark Mode Toggle */}
        <div className={`sticky top-0 z-10 h-16 w-full ${darkMode ? 'bg-gray-800/95 border-gray-800' : 'bg-white/95 border-gray-200'} border-b backdrop-blur-sm shadow-sm transition-colors duration-200`}>
          <div className="flex items-center h-full max-w-[1200px] mx-auto px-4">
            <div className="flex-1 flex justify-center lg:pr-[320px] w-full">
              <div className="w-full max-w-3xl px-2 sm:px-4 lg:px-6">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="relative group w-full"
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    aria-label="Search users"
                    className={`w-full pl-11 pr-4 py-2.5 rounded-full border-2 ${
                      darkMode 
                        ? 'bg-gray-700/40 border-gray-600/50 text-white placeholder-gray-400 focus:bg-gray-700/60' 
                        : 'bg-gray-50/80 border-gray-200/50 text-gray-900 placeholder-gray-500 focus:bg-white'
                    } focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 text-[15px] shadow-sm hover:border-gray-300 dark:hover:border-gray-500`}
                  />
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />

                  {/* Search Results Dropdown */}
                  {(searchResults.length > 0 || searchQuery.trim() !== '') && (
                    <div className={`absolute mt-2 w-full rounded-xl ${
                      darkMode ? 'bg-gray-800/95' : 'bg-white/95'
                    } shadow-lg backdrop-blur-sm border ${
                      darkMode ? 'border-gray-700' : 'border-gray-200'
                    } overflow-hidden z-50`}>
                      {searchResults.length > 0 ? (
                        <div className="max-h-[400px] overflow-y-auto">
                          {searchResults.map((user) => {
                            const highlightMatch = (text: string, searchTerm: string) => {
                              if (!searchTerm) return text;
                              const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
                              return parts.map((part, i) => 
                                part.toLowerCase() === searchTerm.toLowerCase() ? (
                                  <span key={i} className={`${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                    {part}
                                  </span>
                                ) : part
                              );
                            };

                            return (
                              <motion.div
                                key={user.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.1 }}
                                className={`p-3 ${
                                  darkMode 
                                    ? 'hover:bg-gray-700/50' 
                                    : 'hover:bg-gray-50'
                                } transition-colors duration-200 cursor-pointer border-b last:border-b-0 ${
                                  darkMode ? 'border-gray-700' : 'border-gray-100'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    darkMode 
                                      ? 'bg-gray-700' 
                                      : 'bg-gray-100'
                                  }`}>
                                    <User className={`w-5 h-5 ${
                                      darkMode 
                                        ? 'text-gray-300' 
                                        : 'text-gray-500'
                                    }`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className={`font-medium text-sm truncate ${
                                      darkMode ? 'text-gray-100' : 'text-gray-900'
                                    }`}>
                                      {highlightMatch(user.username, searchQuery)}
                                    </h3>
                                    <p className={`text-xs truncate ${
                                      darkMode ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                      {highlightMatch(user.email, searchQuery)}
                                    </p>
                                    <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-xs font-medium ${
                                      user.role === 'ADMIN'
                                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                        : user.role === 'MODERATOR'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                    }`}>
                                      {highlightMatch(user.role.toLowerCase(), searchQuery)}
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 text-center">
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            No users found matching "<span className="font-medium">{searchQuery}</span>"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </div>
            </div>

            {/* Dark Mode Toggle - Fixed Position */}
            <div className="fixed top-4 right-4 z-50">
              <DarkModeToggle />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row max-w-[1200px] mx-auto px-4 w-full py-6">
          {/* Main Feed */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex-1 max-w-3xl mx-auto w-full"
          >
            <div className={`rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} min-h-[500px] shadow-sm transition-all duration-200 hover:shadow-md w-full`}>
              <div className="p-4 w-full">
                <div className="animate-pulse space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-gray-700/20"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-700/20 rounded w-1/4"></div>
                        <div className="h-3 bg-gray-700/20 rounded w-1/2"></div>
                        <div className="h-5 bg-gray-700/20 rounded w-1/6"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Sidebar - Hidden on smaller screens */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="hidden lg:block w-80 pl-6 space-y-6"
          >
            {/* User Profile Card */}
            <div 
              onClick={() => navigate('/profile')}
              className={`rounded-xl ${darkMode ? 'bg-gray-800/80' : 'bg-white'} p-4 shadow-sm transition-all duration-200 hover:shadow-md backdrop-blur-sm w-full cursor-pointer hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${darkMode ? 'from-gray-700 to-gray-600' : 'from-gray-100 to-gray-200'} flex items-center justify-center shadow-inner transition-all duration-200`}>
                  <User size={24} className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-200`} />
                </div>
                <div>
                  <div className="font-semibold">{user?.username}</div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {user?.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Suggested Users Section */}
            <div className={`lg:sticky lg:top-20 rounded-xl ${darkMode ? 'bg-gray-800/80' : 'bg-white'} p-5 shadow-sm transition-all duration-200 hover:shadow-md backdrop-blur-sm w-full`}>
              <h3 className="text-lg font-semibold mb-4">Suggested for you</h3>
              <div className="space-y-4">
                {suggestedUsers.map(suggestedUser => (
                  <div key={suggestedUser.id} className="flex items-center justify-between group">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${darkMode ? 'from-gray-700 to-gray-600' : 'from-gray-100 to-gray-200'} flex items-center justify-center shadow-inner transition-all duration-200`}>
                        <User size={20} className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-200`} />
                      </div>
                      <div>
                        <div className="font-medium">{suggestedUser.name}</div>
                        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {suggestedUser.role}
                        </div>
                      </div>
                    </div>
                    <button className={`text-blue-500 hover:text-blue-600 font-medium px-3 py-1 rounded-lg transition-all duration-200 ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Home;