import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axios';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import DarkModeToggle from '../components/DarkModeToggle';
import { motion } from 'framer-motion';
import { User, Edit2, Image as ImageIcon, MessageSquare, Calendar, Mail, Link as LinkIcon, ImageOff, Camera, Pencil } from 'lucide-react';

interface Post {
  id: number;
  content: string;
  mediaHash: string | null;
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

  const handleFollowToggle = async () => {
    if (!profile || followLoading) return;

    setFollowLoading(true);
    try {
      const endpoint = profile.isFollowing ? 'unfollow' : 'follow';
      const { data } = await axiosInstance.post(`/api/users/${endpoint}/${profile.username}`);
      
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

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Dark Mode Toggle - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <DarkModeToggle />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 ml-16 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
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
                    <div className="text-center">
                      <div className="font-bold text-2xl">{profile.followersCount}</div>
                      <div className={`text-base ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Followers</div>
                    </div>
                    <div className="text-center">
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

          {/* Posts Grid */}
          <div className="mt-8 max-w-4xl mx-auto">
            <h2 className={`text-2xl font-semibold mb-6 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              Posts
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {profile.posts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`group rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer`}
                >
                  {post.mediaHash ? (
                    <div className="aspect-square relative">
                      <img
                        src={`/api/media/${post.mediaHash}`}
                        alt="Post media"
                        className="w-full h-full object-cover"
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

            {profile.posts.length === 0 && (
              <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <ImageOff size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">No posts yet</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile; 