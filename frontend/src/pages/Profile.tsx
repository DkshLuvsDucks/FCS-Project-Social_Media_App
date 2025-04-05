import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axios';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import DarkModeToggle from '../components/DarkModeToggle';
import FollowModal from '../components/FollowModal';
import { motion } from 'framer-motion';
import { User, Edit2, Image as ImageIcon, MessageSquare, Calendar, Mail, Link as LinkIcon, ImageOff, Camera, Pencil, Grid as GridIcon, Bookmark as BookmarkIcon } from 'lucide-react';
import PostModal from '../components/PostModal';

interface Post {
  id: number;
  content: string;
  mediaHash: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  createdAt: string;
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  bio: string | null;
  userImage: string | null;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  posts: Post[];
  isFollowing?: boolean;
}

const Profile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  
  // State for posts display
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [savedPostsLoading, setSavedPostsLoading] = useState(false);
  
  // State for modals
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [isPostModalVisible, setIsPostModalVisible] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await axiosInstance.get<UserProfile>(`/api/users/profile/${username}`);
        setProfile(data);
      } catch (err) {
        setError('Failed to load profile');
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchProfile();
    }
  }, [username]);
  
  // Fetch saved posts if the current user views their own profile
  useEffect(() => {
    const fetchSavedPosts = async () => {
      // Only fetch saved posts if viewing own profile and saved tab is active
      if (!user || username !== user.username || activeTab !== 'saved') {
        return;
      }
      
      try {
        setSavedPostsLoading(true);
        const { data } = await axiosInstance.get<Post[]>('/api/users/saved-posts');
        setSavedPosts(data);
      } catch (err) {
        console.error('Error fetching saved posts:', err);
      } finally {
        setSavedPostsLoading(false);
      }
    };
    
    fetchSavedPosts();
  }, [username, user, activeTab]);

  const handleFollowToggle = async () => {
    if (!profile || followLoading) return;

    setFollowLoading(true);
    try {
      if (profile.isFollowing) {
        // Unfollow
        await axiosInstance.delete(`/api/users/follow/${profile.id}`);
      } else {
        // Follow
        await axiosInstance.post(`/api/users/follow/${profile.id}`);
      }
      
      setProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          isFollowing: !prev.isFollowing,
          followersCount: prev.followersCount + (prev.isFollowing ? -1 : 1)
        };
      });
    } catch (err) {
      console.error('Error toggling follow:', err);
      // Show error toast or message
    } finally {
      setFollowLoading(false);
    }
  };
  
  // Handle post click to show detail modal
  const handlePostClick = (postId: number) => {
    setSelectedPostId(postId);
    setIsPostModalVisible(true);
  };
  
  // Close post modal
  const handleClosePostModal = () => {
    setIsPostModalVisible(false);
    setTimeout(() => setSelectedPostId(null), 300); // Wait for animation to finish
  };
  
  // Function to get proper media URL (same as in PostCard)
  const getMediaUrl = (url: string | null | undefined, hash: string | null | undefined): string | null => {
    if (!url && !hash) {
      return null;
    }
    
    // Direct API endpoint - preferred method that should work everywhere
    if (hash) {
      return `/api/posts/media/${hash}`;
    }
    
    // If we have a URL but no hash
    if (url) {
      // If it's already a direct uploads path
      if (url.startsWith('/uploads/')) {
        return url;
      }
      
      // If it's an API path, try to extract the hash or filename
      if (url.includes('/api/media/') || url.includes('/api/posts/media/')) {
        const hashOrFilename = url.split('/').pop();
        if (hashOrFilename) {
          return `/api/posts/media/${hashOrFilename}`;
        }
      }
      
      // If it's a full path to a file with filename
      if (url.includes('/uploads/posts/')) {
        const filename = url.split('/').pop();
        if (filename) {
          return url;
        }
      }
      
      // Fallback - return the original URL
      return url;
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
        <Sidebar />
        <div className="flex-1 lg:ml-64 ml-16 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`min-h-screen flex ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
        <Sidebar />
        <div className="flex-1 lg:ml-64 ml-16 flex items-center justify-center">
          <div className={`text-lg ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
            {error || 'Profile not found'}
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.username === profile.username;
  const postsToDisplay = activeTab === 'posts' ? profile.posts : savedPosts;
  const isLoading = activeTab === 'posts' ? loading : savedPostsLoading;

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Dark Mode Toggle - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <DarkModeToggle />
      </div>

      {/* Sidebar */}
      <Sidebar />
      
      {/* Post Modal */}
      <PostModal 
        postId={selectedPostId} 
        isVisible={isPostModalVisible} 
        onClose={handleClosePostModal} 
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 ml-16 p-6">
        <div>
          {/* Profile Header */}
          <div className={`rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm transition-all duration-200 hover:shadow-md overflow-hidden max-w-4xl mx-auto`}>
            {/* Profile Info */}
            <div className="px-8 py-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                {/* Profile Picture */}
                <div className="relative group">
                  <div className={`w-40 h-40 rounded-full border-4 ${darkMode ? 'border-gray-800 bg-gray-700' : 'border-white bg-gray-100'} flex items-center justify-center overflow-hidden shadow-lg transition-transform duration-200 group-hover:scale-105`}>
                    {profile.userImage ? (
                      <img
                        src={profile.userImage}
                        alt={profile.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <User size={80} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                        <span className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No photo</span>
                      </div>
                    )}
                  </div>
                  {isOwnProfile && (
                    <button
                      onClick={() => navigate('/profile/edit')}
                      className={`absolute bottom-2 right-2 p-2.5 rounded-full ${
                        darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50'
                      } shadow-md transition-all duration-200 border-2 ${darkMode ? 'border-gray-800' : 'border-white'} opacity-0 group-hover:opacity-100`}
                    >
                      <Pencil size={20} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
                    </button>
                  )}
                </div>

                {/* Profile Details */}
                <div className="flex-1 text-center md:text-left space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-center md:justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold">{profile.username}</h1>
                        {isOwnProfile && (
                          <button
                            onClick={() => navigate('/profile/edit')}
                            className={`p-2 rounded-lg ${
                              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                            } transition-colors duration-200`}
                          >
                            <Edit2 size={20} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
                          </button>
                        )}
                      </div>
                      <div className={`flex flex-wrap items-center justify-center md:justify-start gap-4 text-base ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <div className="flex items-center gap-2">
                          <Mail size={18} />
                          <span>{profile.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={18} />
                          <span>Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                    {!isOwnProfile && (
                      <button
                        onClick={handleFollowToggle}
                        disabled={followLoading}
                        className={`px-8 py-2.5 rounded-lg ${
                          profile.isFollowing
                            ? darkMode
                              ? 'bg-gray-700 hover:bg-gray-600'
                              : 'bg-gray-200 hover:bg-gray-300'
                            : darkMode
                              ? 'bg-blue-600 hover:bg-blue-700'
                              : 'bg-blue-500 hover:bg-blue-600'
                        } ${
                          profile.isFollowing
                            ? darkMode
                              ? 'text-gray-300'
                              : 'text-gray-700'
                            : 'text-white'
                        } transition-colors duration-200 font-medium text-base flex items-center justify-center min-w-[120px]`}
                      >
                        {followLoading ? (
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : profile.isFollowing ? (
                          'Following'
                        ) : (
                          'Follow'
                        )}
                      </button>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex justify-center md:justify-start gap-12">
                    <div className="text-center">
                      <div className="font-bold text-2xl">{profile.posts.length}</div>
                      <div className={`text-base ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Posts</div>
                    </div>
                    <div 
                      className="text-center cursor-pointer hover:opacity-80" 
                      onClick={() => setFollowersModalOpen(true)}
                    >
                      <div className="font-bold text-2xl">{profile.followersCount}</div>
                      <div className={`text-base ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Followers</div>
                    </div>
                    <div 
                      className="text-center cursor-pointer hover:opacity-80" 
                      onClick={() => setFollowingModalOpen(true)}
                    >
                      <div className="font-bold text-2xl">{profile.followingCount}</div>
                      <div className={`text-base ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Following</div>
                    </div>
                  </div>

                  {/* Bio */}
                  {profile.bio ? (
                    <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        About
                      </h3>
                      <p className={`text-base ${darkMode ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-wrap leading-relaxed`}>
                        {profile.bio}
                      </p>
                    </div>
                  ) : isOwnProfile ? (
                    <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'} cursor-pointer hover:bg-opacity-80 transition-all duration-200`}>
                      <p className={`text-base ${darkMode ? 'text-gray-400' : 'text-gray-500'} text-center`}>
                        Add a bio to tell people about yourself
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Posts - Grid View */}
          <div className="mt-8">
            <div className="flex items-center border-t border-gray-200 dark:border-gray-700 text-sm">
              <button 
                onClick={() => setActiveTab('posts')}
                className={`flex-1 py-3 font-medium ${
                  activeTab === 'posts' 
                    ? 'border-t-2 border-black dark:border-white' 
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-center">
                  <GridIcon size={18} className="mr-2" />
                  Posts
                </div>
              </button>
              
              {isOwnProfile && (
                <button 
                  onClick={() => setActiveTab('saved')}
                  className={`flex-1 py-3 font-medium ${
                    activeTab === 'saved' 
                      ? 'border-t-2 border-black dark:border-white' 
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <BookmarkIcon size={18} className="mr-2" />
                    Saved
                  </div>
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-3 gap-1 mt-1">
                {[...Array(9)].map((_, i) => (
                  <div 
                    key={i} 
                    className="aspect-square bg-gray-200 dark:bg-gray-700 animate-pulse"
                  ></div>
                ))}
              </div>
            ) : postsToDisplay.length > 0 ? (
              <div className="grid grid-cols-3 gap-1 mt-1">
                {postsToDisplay.map(post => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`group rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer`}
                    onClick={() => handlePostClick(post.id)}
                  >
                    {post.mediaUrl || post.mediaHash ? (
                      <div className="aspect-square relative">
                        <img
                          src={getMediaUrl(post.mediaUrl, post.mediaHash) || undefined}
                          alt="Post media"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Show fallback on error
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'bg-gray-800');
                            const fallback = document.createElement('div');
                            fallback.className = 'flex flex-col items-center justify-center text-gray-500';
                            fallback.innerHTML = `
                              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                              <span class="text-xs">Media not available</span>
                            `;
                            e.currentTarget.parentElement?.appendChild(fallback);
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                          <ImageIcon size={24} className="text-white opacity-0 group-hover:opacity-100" />
                        </div>
                      </div>
                    ) : (
                      <div className="p-6">
                        <p className={`text-base ${darkMode ? 'text-gray-300' : 'text-gray-700'} line-clamp-3`}>
                          {post.content}
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="inline-flex rounded-full bg-gray-100 dark:bg-gray-800 p-6 mb-4">
                  <Camera size={40} className="h-10 w-10 text-gray-500" />
                </div>
                <h3 className="text-xl font-semibold">
                  {activeTab === 'posts' 
                    ? `No Posts Yet` 
                    : `No Saved Posts`}
                </h3>
                <p className="text-gray-500 mt-1">
                  {activeTab === 'posts'
                    ? `When ${isOwnProfile ? 'you' : profile?.username} uploads posts, they'll appear here.`
                    : `Posts you save will appear here.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Followers Modal */}
      <FollowModal
        isOpen={followersModalOpen}
        onClose={() => setFollowersModalOpen(false)}
        title={`${profile?.username}'s Followers`}
        type="followers"
        username={profile?.username || ''}
      />
      
      {/* Following Modal */}
      <FollowModal
        isOpen={followingModalOpen}
        onClose={() => setFollowingModalOpen(false)}
        title={`${profile?.username} is Following`}
        type="following"
        username={profile?.username || ''}
      />
    </div>
  );
};

export default Profile; 