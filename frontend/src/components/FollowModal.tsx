import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Check, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../utils/axios';

interface UserData {
  id: number;
  username: string;
  userImage: string | null;
  followsYou?: boolean;
}

interface FollowData {
  followers: UserData[];
  following: UserData[];
}

interface FollowModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'followers' | 'following';
  username: string;
}

const FollowModal: React.FC<FollowModalProps> = ({ isOpen, onClose, title, type, username }) => {
  const { darkMode } = useDarkMode();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState<number[]>([]);
  const [followedUsers, setFollowedUsers] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchFollowData = async () => {
      if (!isOpen) return;

      setLoading(true);
      setError(null);

      try {
        // Get my current follows to determine who follows back
        const { data: myFollowData } = await axiosInstance.get<FollowData>('/api/users/follows');
        
        // Track IDs of users I'm following
        const myFollowingIds = myFollowData.following.map((f: UserData) => f.id);
        setFollowedUsers(myFollowingIds);
        
        // Fetch user list of either followers or following
        const { data: listData } = await axiosInstance.get<UserData[]>(`/api/users/profile/${username}/${type}`);
        
        // Process users to add the "follows you" flag for both followers and following
        const processedUsers = listData.map((userData: UserData) => ({
          ...userData,
          followsYou: myFollowData.followers.some((f: UserData) => f.id === userData.id)
        }));
        
        setUsers(processedUsers);
      } catch (err) {
        console.error(`Error fetching ${type}:`, err);
        setError(`Failed to load ${type}`);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowData();
  }, [isOpen, type, username]);

  // Sort users by search relevance
  const sortedFilteredUsers = useMemo(() => {
    if (searchQuery.trim() === '') {
      return users;
    }
    
    const query = searchQuery.toLowerCase();
    
    // Filter users that match the search query
    const matchingUsers = users.filter(user => 
      user.username.toLowerCase().includes(query)
    );
    
    // Sort by relevance - exact matches first, then by position of match, then alphabetically
    return matchingUsers.sort((a, b) => {
      const aLower = a.username.toLowerCase();
      const bLower = b.username.toLowerCase();
      
      // Exact matches come first
      if (aLower === query && bLower !== query) return -1;
      if (bLower === query && aLower !== query) return 1;
      
      // Then sort by where the match occurs (earlier = higher rank)
      const aIndex = aLower.indexOf(query);
      const bIndex = bLower.indexOf(query);
      if (aIndex !== bIndex) return aIndex - bIndex;
      
      // Finally sort alphabetically
      return aLower.localeCompare(bLower);
    });
  }, [searchQuery, users]);

  const handleFollowToggle = async (userId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to profile when clicking follow
    if (followLoading.includes(userId)) return;
    
    const isFollowing = followedUsers.includes(userId);
    
    try {
      setFollowLoading(prev => [...prev, userId]);
      
      if (isFollowing) {
        // Unfollow the user
        await axiosInstance.delete(`/api/users/follows/${userId}`);
        
        // Update followedUsers state
        setFollowedUsers(prev => prev.filter(id => id !== userId));
      } else {
        // Follow the user
        await axiosInstance.post(`/api/users/follows/${userId}`);
        
        // Update followedUsers state
        setFollowedUsers(prev => [...prev, userId]);
      }
      
      // Don't refresh the users list - let them stay in the list
      // This way users can unfollow if they accidentally followed
    } catch (error: any) {
      console.error('Error following/unfollowing user:', error);
      // Show error in console for debugging
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Status code:', error.response.status);
      }
    } finally {
      setFollowLoading(prev => prev.filter(id => id !== userId));
    }
  };

  const handleUserClick = (username: string) => {
    navigate(`/profile/${username}`);
    onClose();
  };

  // Highlight matching text in search results
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className={`${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
          {part}
        </span>
      ) : part
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-md bg-black/40 p-4 sidebar-exclude"
          onClick={onClose}
          style={{ 
            backdropFilter: 'blur(8px)',
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
            left: window.innerWidth <= 1024 ? '64px' : '256px'
          }}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className={`relative w-full max-w-md rounded-xl overflow-hidden ${darkMode ? 'bg-gray-800/95' : 'bg-white/95'} shadow-xl backdrop-blur-md`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
              <h3 className="text-lg font-semibold">{title}</h3>
              <button 
                onClick={onClose}
                className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition-colors`}
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Search Bar */}
            <div className={`p-3 ${darkMode ? 'bg-gray-800/80' : 'bg-white/80'} sticky top-0 z-10`}>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-gray-50/80 border-gray-200 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 ${
                    darkMode ? 'focus:ring-blue-600/50' : 'focus:ring-blue-500/50'
                  }`}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>
            
            {/* Content */}
            <div className="max-h-[50vh] overflow-y-auto">
              {loading ? (
                <div className="p-8 flex justify-center items-center">
                  <div className="w-6 h-6 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
                </div>
              ) : error ? (
                <div className={`p-4 text-center ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                  {error}
                </div>
              ) : sortedFilteredUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchQuery ? 'No matching users found' : `No ${type} found`}
                </div>
              ) : (
                <ul className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {sortedFilteredUsers.map(user => (
                    <li key={user.id} className="p-4 hover:bg-opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center cursor-pointer"
                          onClick={() => handleUserClick(user.username)}
                        >
                          <div className={`w-10 h-10 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            {user.userImage ? (
                              <img 
                                src={user.userImage} 
                                alt={user.username} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User size={18} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">
                              {searchQuery ? highlightMatch(user.username, searchQuery) : user.username}
                            </div>
                            {user.followsYou && (
                              <div className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'} flex items-center`}>
                                <Check size={12} className="mr-1" />
                                Follows you
                              </div>
                              
                            )}
                          </div>
                        </div>
                        
                        {user.id !== authUser?.id && (
                          <button
                            onClick={(e) => handleFollowToggle(user.id, e)}
                            disabled={followLoading.includes(user.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              followedUsers.includes(user.id)
                                ? darkMode
                                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                : darkMode
                                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                          >
                            {followLoading.includes(user.id) ? (
                              <div className="w-4 h-4 border-2 border-t-transparent border-current rounded-full animate-spin mx-2"></div>
                            ) : followedUsers.includes(user.id) ? (
                              'Following'
                            ) : (
                              'Follow'
                            )}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FollowModal; 