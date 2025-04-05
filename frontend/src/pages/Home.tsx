import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, User } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import DarkModeToggle from '../components/DarkModeToggle';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axios';
import CreatePostForm from '../components/CreatePostForm';
import PostCard from '../components/PostCard';
import { Post } from '../components/PostCard';
import PostModal from '../components/PostModal';

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

interface SuggestedUser {
  id: number;
  username: string;
  email: string;
  userImage: string | null;
  role: string;
  mutualFriend: string | null; // Name of a mutual connection
}

interface FollowData {
  followers: Array<{
    id: number;
    username: string;
    userImage: string | null;
    role: string;
  }>;
  following: Array<{
    id: number;
    username: string;
    userImage: string | null;
    role: string;
  }>;
}

// Additional interface for suggestions API response
interface UserSuggestion {
  id: number;
  username: string;
  email: string;
  userImage: string | null;
  role: string;
  mutualFriend?: string | null;
}

const Home: React.FC = () => {
  const { darkMode } = useDarkMode();
  const { user, updateUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Update state for suggested users to include mutual connection info
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [followLoading, setFollowLoading] = useState<number[]>([]); // Track which users are being followed
  const [followedUsers, setFollowedUsers] = useState<number[]>([]); // Track which users are already followed

  // Post modal state
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [isPostModalVisible, setIsPostModalVisible] = useState(false);

  // Main Feed
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Load more posts when scrolling
  const loadMorePosts = async () => {
    if (isLoadingMore || !hasMore || !user?.id) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      console.log(`Loading more posts - page ${nextPage}`);
      
      const response = await axiosInstance.get<Post[]>('/api/posts', {
        params: {
          page: nextPage,
          limit: 10,
          timestamp: new Date().getTime(), // Cache busting
          userId: user.id // Send the user ID so backend can filter private posts correctly
        }
      });
      
      console.log(`Received ${response.data.length} additional posts`);
      
      if (response.data.length === 0) {
        setHasMore(false);
      } else {
        setPage(nextPage);
        setPosts(prevPosts => [...prevPosts, ...response.data]);
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Update fetchPosts to fetch with pagination and handle media correctly
  const fetchPosts = async () => {
    try {
      // Reset pagination when fetching fresh
      setPage(1);
      setHasMore(true);
      setPosts([]);
      setLoading(true);
      console.log("Fetching initial posts with timestamp:", new Date().toISOString());
      
      // Make sure we have a valid user before fetching
      if (!user?.id) {
        console.log("User not logged in or ID not available, delaying fetch");
        setLoading(false);
        return;
      }

      const response = await axiosInstance.get<Post[]>('/api/posts', {
        params: {
          page: 1,
          limit: 10,
          timestamp: new Date().getTime(), // Cache busting with better name than '_'
          userId: user.id // Send the user ID so backend can filter private posts correctly
        }
      });
      
      console.log(`Received ${response.data.length} posts from API`);
      
      // Debug post data
      if (response.data.length > 0) {
        console.log(`Latest post: ID ${response.data[0].id}, created at ${new Date(response.data[0].createdAt).toLocaleString()}`);
        console.log(`Post privacy settings:`, response.data.map(p => ({
          id: p.id, 
          isPrivate: p.isPrivate,
          authorId: p.authorId
        })));
        console.log(`Media info:`, response.data.map(p => ({
          id: p.id, 
          hasMedia: !!p.mediaUrl, 
          mediaUrl: p.mediaUrl,
          mediaType: p.mediaType
        })));
      } else {
        console.log("No posts returned from API");
      }
      
      // Ensure posts are sorted by newest first
      const sortedPosts = response.data.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      // Update state with fetched posts
      setPosts(sortedPosts);
      setHasMore(response.data.length >= 10);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Change scroll detection to work on the whole page
  useEffect(() => {
    const handleScroll = () => {
      if (loading || isLoadingMore || !hasMore) return;
      
      // Check if we've scrolled near the bottom of the page
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollThreshold = 100; // px from bottom
      
      if (documentHeight - (scrollPosition + windowHeight) < scrollThreshold) {
        loadMorePosts();
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, isLoadingMore, hasMore]);

  // Update function to fetch suggested users to return more users and filter by role
  const fetchSuggestedUsers = async () => {
    console.log('Starting to fetch suggested users...');
    try {
      // Get current user's follows data
      console.log('Fetching follow data...');
      const { data: followData } = await axiosInstance.get<FollowData>('/api/users/follows');
      console.log('Follow data:', followData);
      
      // Get the IDs of users we're already following
      const followingIds = followData.following.map(f => f.id);
      setFollowedUsers(followingIds);
      console.log('Following IDs:', followingIds);
      
      // Fetch users that might be interesting to follow
      console.log('Fetching user suggestions...');
      const { data: potentialUsers } = await axiosInstance.get<UserSuggestion[]>('/api/users/suggestions');
      console.log('Potential users:', potentialUsers);
      
      // Filter to only show USER role accounts (not ADMIN or other roles)
      const filteredUsers = potentialUsers
        .filter(user => user.role === 'USER')
        .map(user => ({
        id: user.id,
        username: user.username,
          email: user.email || '',  // Include email
        userImage: user.userImage,
        role: user.role,
        mutualFriend: user.mutualFriend || null
      }));
      
      console.log('Filtered users:', filteredUsers);
      
      // Show at least 5 suggestions if available
      setSuggestedUsers(filteredUsers.slice(0, 5));
    } catch (error) {
      console.error('Error fetching suggested users:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      
      // Fallback if the API fails - show some users from a generic search
      try {
        console.log('Falling back to generic user search...');
        const { data } = await axiosInstance.get<SearchUser[]>('/api/users/search?query=a');
        console.log('Fallback search results:', data);
        
        const filteredUsers = data
          .filter(user => user.role === 'USER' && !followedUsers.includes(user.id))
          .slice(0, 5)
          .map(user => ({
            id: user.id,
            username: user.username,
            email: user.email || '',  // Include email
            userImage: user.userImage,
            role: user.role,
            mutualFriend: 'You might know'
          }));
        
        console.log('Fallback filtered users:', filteredUsers);
        setSuggestedUsers(filteredUsers);
      } catch (fallbackError) {
        console.error('Even fallback search failed:', fallbackError);
        setSuggestedUsers([]);
      }
    }
  };

  // Update the handleFollowUser function to handle API errors correctly
  const handleFollowUser = async (userId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to profile when clicking follow
    e.preventDefault();
    
    const isFollowing = followedUsers.includes(userId);
    
    try {
      setFollowLoading(prev => [...prev, userId]);
      
      if (isFollowing) {
        // Unfollow the user
        await axiosInstance.delete(`/api/users/follow/${userId}`);
        
        // Update followedUsers state
        setFollowedUsers(prev => prev.filter(id => id !== userId));
      } else {
        // Follow the user
        await axiosInstance.post(`/api/users/follow/${userId}`);
        
        // Update followedUsers state
        setFollowedUsers(prev => [...prev, userId]);
      }
      
      // Don't refresh suggested users here - let them stay in the list
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

      console.log('Search query changed to:', searchQuery);
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

        console.log('Search results received:', response.data);
        setSearchResults(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error searching users:', error);
        if (error instanceof Error) {
          console.error('Error details:', error.message);
        }
        setSearchError(error instanceof Error ? error.message : 'Failed to search users');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    console.log('Setting up search debounce for query:', searchQuery);
    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Call fetchSuggestedUsers in useEffect
  useEffect(() => {
    fetchSuggestedUsers();
  }, []);

  // Make sure fetchSuggestedUsers is called when the user is logged in
  useEffect(() => {
    if (user?.id) {
      console.log('User is logged in, fetching suggested users');
      fetchSuggestedUsers();
    }
  }, [user?.id]);

  // Make sure to call fetchPosts when user logs in
  useEffect(() => {
    if (user?.id) {
      console.log('User is logged in, fetching posts');
      fetchPosts();
    }
  }, [user?.id]);

  // Show post modal
  const handlePostClick = (postId: number) => {
    setSelectedPostId(postId);
    setIsPostModalVisible(true);
  };
  
  // Close post modal
  const handleClosePostModal = () => {
    setIsPostModalVisible(false);
    setTimeout(() => setSelectedPostId(null), 300); // Wait for animation to finish
  };

  // Update handleLike, handleComment, and handleShare functions
  const handleLike = async (postId: number) => {
    // Like functionality is now handled in the PostCard component
    console.log('Like in parent component:', postId);
    // No need to do anything here as the PostCard component handles the API calls
  };

  const handleComment = (postId: number) => {
    // Open the post modal when comment is clicked
    handlePostClick(postId);
  };

  const handleShare = (postId: number) => {
    // Share functionality is now handled in the PostCard component
    console.log('Share in parent component:', postId);
    // No need to do anything here as the PostCard component handles sharing
  };

  // Highlight matching text in search results - similar to FollowModal
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

                            return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Left Sidebar */}
      <Sidebar />

      {/* Dark Mode Toggle - Fixed Position */}
      <div className="fixed top-4 right-4 z-40">
        <DarkModeToggle />
      </div>

      {/* Backdrop for search results - styled exactly like FollowModal */}
      {(searchQuery.trim().length > 0 && (isSearching || searchResults.length > 0)) && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-20 flex items-center justify-center backdrop-blur-md bg-black/40 sidebar-exclude"
          onClick={() => setSearchQuery('')}
          style={{ 
            backdropFilter: 'blur(8px)',
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
            left: window.innerWidth <= 1024 ? '64px' : '256px'
          }}
        />
      )}

      {/* Post Modal */}
      <PostModal 
        postId={selectedPostId} 
        isVisible={isPostModalVisible} 
        onClose={handleClosePostModal} 
      />

      <div className="flex lg:ml-64 ml-16 relative h-screen overflow-hidden">
        <div className="flex flex-1">
          {/* Main Content Column */}
          <div className="flex-1 max-w-2xl overflow-y-auto mx-auto relative">
            {/* Top Search Bar - Animated background */}
            <motion.div 
              className={`sticky top-0 z-30 py-4 px-4`}
              animate={{ 
                backgroundColor: searchQuery.trim().length > 0 ? 'rgba(0,0,0,0)' : darkMode ? 'rgb(17, 24, 39)' : 'rgb(243, 244, 246)'
              }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-full border ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 ${darkMode ? 'focus:ring-blue-600' : 'focus:ring-blue-500'}`}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>

              {/* Search results dropdown */}
              {(searchQuery.trim().length > 0 && (isSearching || searchResults.length > 0)) && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`absolute left-0 right-0 mx-4 mt-1 rounded-lg shadow-lg overflow-hidden z-40 border ${
                  darkMode ? 'bg-gray-800/95 border-gray-700' : 'bg-white/95 border-gray-200'
                  } backdrop-blur-md`}
                >
                  {isSearching ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                    </div>
                  ) : searchError ? (
                    <div className={`p-4 text-center ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                      {searchError}
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No users found matching "{searchQuery}"
                    </div>
                  ) : (
                    <div>
                      {searchResults.map((result) => (
                        <div
                          key={result.id}
                          onClick={() => navigate(`/profile/${result.username}`)}
                          className={`flex items-center p-3 cursor-pointer hover:bg-opacity-80 ${
                            darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                          }`}
                        >
                                  <div className={`w-10 h-10 rounded-full overflow-hidden border ${
                            darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-100'
                          }`}>
                            {result.userImage ? (
                              <img
                                src={result.userImage}
                                alt={result.username}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User size={20} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                                      </div>
                                    )}
                                  </div>
                          <div className="ml-3">
                            <div className="font-medium">
                              {highlightMatch(result.username, searchQuery)}
                            </div>
                            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {highlightMatch(result.email, searchQuery)}
                                  </div>
                                </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
                  )}
                </motion.div>

            {/* Posts container */}
            <div className="px-4 pb-20">
              {/* Post creation form */}
              <div className="mb-6">
                <CreatePostForm onPostCreated={() => {
                  console.log("Post created, refreshing feed immediately...");
                  setLoading(true); // Show loading state when refreshing
                  fetchPosts();
                }} />
            </div>

              {/* Post feed */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading posts...</p>
            </div>
              ) : posts.length === 0 ? (
                <div className={`text-center py-8 rounded-lg ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-500'} p-6`}>
                  <p className="mb-4 text-lg">Your feed is empty</p>
                  <p>Follow more users to see their posts, or create your first post to get started!</p>
          </div>
              ) : (
                <div className="space-y-6">
                  {posts.map((post, index) => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      onPostClick={handlePostClick}
                      refreshPosts={fetchPosts}
                    />
                  ))}
                  
                  {isLoadingMore && (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* This wrapper ensures scroll appears exactly at the divider */}
          <div className="hidden md:block">
            {/* Subtle divider for light mode */}
            <div className={`h-full border-l ${darkMode ? 'border-gray-700/50' : 'border-gray-300/50'}`}></div>
          </div>

          {/* Right Sidebar - Suggested Users */}
          <div className="hidden md:block w-96 overflow-y-auto pr-12">
            <div className="p-4">
            {/* User Profile Card */}
            <div 
                className={`rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 mb-6 shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md`}
              onClick={() => navigate(`/profile/${user?.username}`)}
              >
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded-full overflow-hidden border ${
                    darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-100'
                  }`}>
                  {user?.userImage ? (
                    <img
                        src={user.userImage}
                      alt={user.username}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.classList.add('flex', 'items-center', 'justify-center');
                            const iconElement = document.createElement('div');
                            iconElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${darkMode ? 'text-gray-500' : 'text-gray-400'}"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
                            parent.appendChild(iconElement);
                          }
                      }}
                    />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={24} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                    </div>
                  )}
                </div>
                  <div className="ml-3 flex-1">
                    <h3 className="font-semibold">{user?.username}</h3>
                    <p className={`text-sm truncate max-w-[150px] ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {user?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/profile/edit');
                  }}
                  className={`mt-4 w-full py-2 rounded-lg border ${
                    darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-100'
                  } transition-colors duration-200 text-sm font-medium`}
                >
                  Edit Profile
                </button>
              </div>
              
              {/* Suggested Users */}
              <div className={`rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow-sm transition-all duration-200`}>
                <div className={`p-4 border-b border-opacity-10 font-semibold text-lg flex justify-between items-center ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <span>Suggested for you</span>
                </div>
                {suggestedUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No suggestions available
            </div>
                ) : (
                  <div className={`divide-y divide-opacity-10 ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {suggestedUsers.map((user) => (
                      <div key={user.id} className="p-4 hover:bg-opacity-50 transition-colors hover:bg-gray-700/10">
                        <div className="flex items-center justify-between">
                          <div 
                            className="flex items-center cursor-pointer"
                            onClick={() => navigate(`/profile/${user.username}`)}
                          >
                            <div className={`w-10 h-10 rounded-full overflow-hidden border ${
                              darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-100'
                            }`}>
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
                                  <User size={20} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                            </div>
                          )}
                        </div>
                            <div className="ml-3">
                              <div className="font-medium">{user.username}</div>
                              <div className={`text-xs truncate max-w-[150px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {user.email}
                          </div>
                        </div>
                      </div>
                      <button 
                            onClick={(e) => handleFollowUser(user.id, e)}
                            disabled={followLoading.includes(user.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              followedUsers.includes(user.id)
                            ? darkMode 
                                  ? 'bg-gray-700 hover:bg-red-600 text-gray-300'
                                  : 'bg-gray-200 hover:bg-red-500 text-gray-700 hover:text-white'
                            : darkMode
                              ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                  : 'bg-blue-500 hover:bg-blue-400 text-white'
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
                        </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;