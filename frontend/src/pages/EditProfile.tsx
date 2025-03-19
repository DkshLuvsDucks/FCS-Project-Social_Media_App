import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axios';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import DarkModeToggle from '../components/DarkModeToggle';
import { motion } from 'framer-motion';
import { User, Camera, X, Shield, Phone, Mail, CheckCircle2, XCircle } from 'lucide-react';

interface ProfileData {
  username: string;
  bio: string;
  userImage: string | null;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface UploadResponse {
  url: string;
}

interface UserProfile {
  username: string;
  bio: string | null;
  userImage: string | null;
}

const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { darkMode } = useDarkMode();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    username: user?.username || '',
    bio: user?.bio || '',
    userImage: user?.userImage || null,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Fetch user profile data when component mounts
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data } = await axiosInstance.get<UserProfile>(`/api/users/profile/${user?.username}`);
        console.log('Fetched profile data:', data); // Debug log
        setFormData(prev => ({
          ...prev,
          username: data.username,
          bio: data.bio || '',
          userImage: data.userImage || null,
        }));
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load profile data');
      }
    };

    if (user?.username) {
      fetchUserProfile();
    }
  }, [user?.username]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setError('New passwords do not match');
        setLoading(false);
        return;
      }
    }

    try {
      const updateData = {
        username: formData.username,
        bio: formData.bio,
        userImage: formData.userImage,
        ...(formData.newPassword && {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      };

      await axiosInstance.put('/api/users/profile', updateData);
      setSuccess(true);
      
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await axiosInstance.post<UploadResponse>('/api/users/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.url) {
        // Always use HTTPS for the image URL
        const imageUrl = `https://localhost:3000${response.data.url}`;
        
        console.log('Uploaded image URL:', imageUrl); // Debug log
        setFormData(prev => ({
          ...prev,
          userImage: imageUrl
        }));
        // Update the user context with the new image URL
        updateUser({ userImage: imageUrl });
        setError(null);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Image upload error:', err);
      if (err.response?.status === 404) {
        setError('Image upload endpoint not found. Please check the server configuration.');
      } else if (err.response?.status === 500) {
        setError('Server error while uploading image. Please try again later.');
      } else {
        setError(err.response?.data?.error || 'Failed to upload image. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      setLoading(true);
      setFormData(prev => ({
        ...prev,
        userImage: null
      }));
      // Update the user context when removing the image
      updateUser({ userImage: null });
      setError(null);
    } catch (err: any) {
      console.error('Error removing profile picture:', err);
      setError('Failed to remove profile picture. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Dark Mode Toggle - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <DarkModeToggle />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 ml-16 p-6" overflow-y-auto>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-2xl mx-auto"
        >
          <div className={`rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm p-8`}>
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold">Edit Profile</h1>
              <button
                onClick={() => navigate(`/profile/${user?.username}`)}
                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X size={24} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
              </button>
            </div>

            {error && (
              <div className={`mb-4 p-4 rounded-lg ${darkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-50 text-red-600'}`}>
                {error}
              </div>
            )}

            {success && (
              <div className={`mb-4 p-4 rounded-lg ${darkMode ? 'bg-green-900/50 text-green-200' : 'bg-green-50 text-green-600'}`}>
                Profile updated successfully!
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Picture */}
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className={`w-32 h-32 rounded-full border-4 ${darkMode ? 'border-gray-800 bg-gray-700' : 'border-white bg-gray-100'} flex items-center justify-center overflow-hidden shadow-lg`}>
                    {formData.userImage ? (
                      <img
                        src={formData.userImage}
                        alt={formData.username}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Image failed to load:', formData.userImage);
                          setFormData(prev => ({ ...prev, userImage: null }));
                        }}
                      />
                    ) : (
                      <User size={64} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                    )}
                  </div>
                  {/* Remove button at top-left */}
                  {formData.userImage && (
                    <button
                      onClick={handleRemoveImage}
                      disabled={loading}
                      className={`absolute top-1 left-1 p-1.5 rounded-full ${
                        darkMode 
                          ? 'bg-gray-800 hover:bg-red-900/90 border-gray-700 hover:border-red-500/50' 
                          : 'bg-white hover:bg-red-50 border-gray-200 hover:border-red-200'
                      } shadow-md border transition-all duration-200 group`}
                      title="Remove profile picture"
                    >
                      <X 
                        size={14} 
                        className={`${
                          darkMode 
                            ? 'text-gray-400 group-hover:text-red-400' 
                            : 'text-gray-500 group-hover:text-red-500'
                        } transition-colors duration-200`}
                      />
                    </button>
                  )}
                  {/* Change picture button at bottom-right */}
                  <label
                    className={`absolute bottom-2 right-2 p-2.5 rounded-full ${
                      darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50'
                    } shadow-md cursor-pointer border-2 ${darkMode ? 'border-gray-800' : 'border-white'} transition-all duration-200`}
                    title="Change profile picture"
                  >
                    <Camera size={20} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={loading}
                    />
                  </label>
                </div>
                <span className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {loading ? 'Uploading...' : ''}
                </span>
              </div>

              {/* Username */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-2 rounded-lg border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              {/* Bio */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Tell us about yourself..."
                  className={`w-full px-4 py-2 rounded-lg border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              {/* 2FA Section */}
              <div className="pt-6 border-t border-gray-700">
                <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Two-Factor Authentication
                </h2>
                <div className="space-y-4">
                  {/* Email 2FA */}
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail size={24} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                        <div>
                          <h3 className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Email 2FA</h3>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Receive verification codes via email
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`px-4 py-2 rounded-lg ${
                          darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-100 hover:bg-gray-200'
                        } transition-colors duration-200`}
                      >
                        Enable
                      </button>
                    </div>
                  </div>

                  {/* Phone 2FA */}
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Phone size={24} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                        <div>
                          <h3 className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Phone 2FA</h3>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Receive verification codes via SMS
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`px-4 py-2 rounded-lg ${
                          darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-100 hover:bg-gray-200'
                        } transition-colors duration-200`}
                      >
                        Enable
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="pt-6 border-t border-gray-700">
                <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Change Password
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Current Password
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg ${
                  darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                } text-white font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Changes'
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EditProfile; 