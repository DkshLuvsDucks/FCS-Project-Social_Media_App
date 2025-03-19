import React, { useState, useEffect } from 'react';
import { Search, User } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import DarkModeToggle from '../components/DarkModeToggle';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axios';

interface SearchUser {
  id: number;
  username: string;
  email: string;
  role: string;
  userImage: string | null;
}

interface UserProfile {
  username: string;
  email: string;
  bio: string | null;
  userImage: string | null;
  role: string;
}

const Home: React.FC = () => {
  const { darkMode } = useDarkMode();
  const { user, updateUser } = useAuth();
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

  // Fetch user profile data when component mounts
  useEffect(() => {
    const fetchUserProfile = async () => {
      // Don't fetch if we already have the image URL
      if (!user?.username || user?.userImage) return;
      
      try {
        const { data } = await axiosInstance.get<UserProfile>(`/api/users/profile/${user.username}`);
        console.log('Fetched profile data:', data);
        
        // Only update if the data is different
        if (data.userImage !== user.userImage) {
          updateUser(data);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Don't show error to user as this is a background update
      }
    };

    // Add a small delay to prevent immediate fetch on mount
    const timer = setTimeout(fetchUserProfile, 1000);
    return () => clearTimeout(timer);
  }, [user?.username, user?.userImage, updateUser]);

  // Debug logs for user data
  useEffect(() => {
    console.log('Current user data:', user);
    console.log('User image URL:', user?.userImage);
  }, [user]);

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

        const response = await axiosInstance.get(`/api/users/search?query=${encodeURIComponent(searchQuery)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log('Search results:', response.data);
        setSearchResults(Array.isArray(response.data) ? response.data : []);
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
                                onClick={() => navigate(`/profile/${user.username}`)}
                                className={`p-3 ${
                                  darkMode 
                                    ? 'hover:bg-gray-700/50' 
                                    : 'hover:bg-gray-50'
                                } transition-colors duration-200 cursor-pointer border-b last:border-b-0 ${
                                  darkMode ? 'border-gray-700' : 'border-gray-100'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className={`w-10 h-10 rounded-full overflow-hidden border ${
                                    darkMode ? 'border-gray-700' : 'border-gray-200'
                                  } shadow-sm`}>
                                    {user.userImage ? (
                                      <img
                                        src={user.userImage.startsWith('http') ? user.userImage : `https://localhost:3000${user.userImage}`}
                                        alt={user.username}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          console.error('Profile image failed to load:', user.userImage);
                                          e.currentTarget.style.display = 'none';
                                          e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', darkMode ? 'bg-gray-700' : 'bg-gray-100');
                                        }}
                                      />
                                    ) : (
                                      <div className={`w-full h-full flex items-center justify-center ${
                                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                                      }`}>
                                        <User className={`w-5 h-5 ${
                                          darkMode ? 'text-gray-400' : 'text-gray-500'
                                        }`} />
                                      </div>
                                    )}
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
                                        ? darkMode
                                          ? 'bg-purple-900/30 text-purple-200 border border-purple-700/30'
                                          : 'bg-purple-50 text-purple-700 border border-purple-100'
                                        : user.role === 'MODERATOR'
                                        ? darkMode
                                          ? 'bg-blue-900/30 text-blue-200 border border-blue-700/30'
                                          : 'bg-blue-50 text-blue-700 border border-blue-100'
                                        : user.role === 'VENDOR'
                                        ? darkMode
                                          ? 'bg-amber-900/30 text-amber-200 border border-amber-700/30'
                                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                                        : darkMode
                                          ? 'bg-emerald-900/30 text-emerald-200 border border-emerald-700/30'
                                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    }`}>
                                      {user.role === 'ADMIN' && (
                                        <svg className={`w-3 h-3 mr-1 ${darkMode ? 'text-purple-300' : 'text-purple-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                      )}
                                      {user.role === 'MODERATOR' && (
                                        <svg className={`w-3 h-3 mr-1 ${darkMode ? 'text-blue-300' : 'text-blue-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                        </svg>
                                      )}
                                      {user.role === 'VENDOR' && (
                                        <svg className={`w-3 h-3 mr-1 ${darkMode ? 'text-amber-300' : 'text-amber-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                        </svg>
                                      )}
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
              onClick={() => navigate(`/profile/${user?.username}`)}
              className={`rounded-xl ${darkMode ? 'bg-gray-800/80' : 'bg-white'} p-4 shadow-sm transition-all duration-200 hover:shadow-md backdrop-blur-sm w-full cursor-pointer hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${darkMode ? 'border-gray-700' : 'border-gray-200'} shadow-inner transition-all duration-200`}>
                  {user?.userImage ? (
                    <img
                      src={user.userImage.startsWith('http') ? user.userImage : `https://localhost:3000${user.userImage}`}
                      alt={user.username}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Profile image failed to load:', user.userImage);
                        const imgElement = e.currentTarget;
                        console.log('Attempted image URL:', imgElement.src);
                        imgElement.src = ''; // Clear the src to show fallback
                        // Show fallback icon
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', darkMode ? 'bg-gray-700' : 'bg-gray-100');
                        const iconDiv = document.createElement('div');
                        iconDiv.className = 'flex items-center justify-center';
                        iconDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${darkMode ? 'text-gray-400' : 'text-gray-600'}"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
                        e.currentTarget.parentElement?.appendChild(iconDiv);
                      }}
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <User size={24} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                    </div>
                  )}
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