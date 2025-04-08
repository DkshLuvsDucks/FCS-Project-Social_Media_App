import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axios';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import DarkModeToggle from '../components/DarkModeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Camera, X, Shield, Phone, Mail, CheckCircle2, XCircle, Store, FileCheck, AlertCircle, Clock, CheckCircle, Save, Download, File, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ProfileData {
  username: string;
  bio: string;
  userImage: string | null;
  isSeller: boolean;
  sellerVerificationDoc: string | null;
  sellerStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
}

interface UploadResponse {
  imageUrl?: string;
  url?: string;
  success: boolean;
}

interface UpdateProfileResponse {
  message?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    bio: string | null;
    userImage: string | null;
    role: string;
    isSeller: boolean;
    sellerVerificationDoc: string | null;
    sellerStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  };
}

interface UserProfile {
  username: string;
  bio: string | null;
  userImage: string | null;
  isSeller: boolean;
  sellerVerificationDoc: string | null;
  sellerStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
}

// Add a SafeImage component for better image handling
const SafeImage = ({ 
  src, 
  alt, 
  className, 
  fallbackComponent
}: { 
  src: string | null; 
  alt: string; 
  className: string;
  fallbackComponent: React.ReactNode;
}) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    // Reset states when src changes
    setIsLoading(true);
    setHasError(false);
    
    if (!src) {
      setHasError(true);
      setIsLoading(false);
      return;
    }
    
    // Log the source for debugging
    console.log("EditProfile - Attempting to load image:", src);
    
    // Function to extract filename from path
    const getFilename = (path: string): string | null => {
      const parts = path.split('/');
      return parts[parts.length - 1] || null;
    };
    
    // Preload the image to check if it loads correctly
    const img = new Image();
    
    // Set correct source URL based on path pattern
    const filename = getFilename(src);
    console.log("EditProfile - Extracted filename:", filename);
    
    if (!filename) {
      setHasError(true);
      setIsLoading(false);
      return;
    }
    
    // Backend server is always on port 3000 regardless of the frontend port
    const backendUrl = `${window.location.protocol}//localhost:3000`;
    
    // Check if this is a verification document
    if (src.includes('verification-documents')) {
      // Load directly from the verification-documents folder on backend
      img.src = `${backendUrl}/uploads/verification-documents/${filename}`;
      console.log("EditProfile - Loading verification document from:", img.src);
    }
    else if (src.startsWith('/uploads/profiles/')) {
      // Profile pictures are in a different directory on backend
      img.src = `${backendUrl}/uploads/profile-pictures/${filename}`;
      console.log("EditProfile - Loading profile picture from:", img.src);
    }
    else if (src.startsWith('http://') || src.startsWith('https://')) {
      // Already a full URL
      img.src = src;
    }
    else if (src.startsWith('/uploads/')) {
      // Other uploads use the full path on backend
      img.src = `${backendUrl}${src}`;
    }
    else {
      // Unknown format, try as is
      img.src = src;
    }
    
    // Handle successful load
    img.onload = () => {
      console.log("EditProfile - Image loaded successfully:", img.src);
      setImgSrc(img.src);
      setIsLoading(false);
      setHasError(false);
    };
    
    // Handle load error
    img.onerror = () => {
      console.error(`EditProfile - Failed to load image from path: ${img.src}`);
      setHasError(true);
      setIsLoading(false);
    };
    
    // Cleanup
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);
  
  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 dark:bg-gray-700 animate-pulse`}>
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
  
  if (hasError || !imgSrc) {
    return <>{fallbackComponent}</>;
  }
  
  return <img src={imgSrc} alt={alt} className={className} />;
};

const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { darkMode } = useDarkMode();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    username: user?.username || '',
    bio: user?.bio || '',
    userImage: user?.userImage || null,
    isSeller: user?.isSeller || false,
    sellerVerificationDoc: user?.sellerVerificationDoc || null,
    sellerStatus: user?.sellerStatus || null,
  });
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showDocViewer, setShowDocViewer] = useState(false);

  // Fetch user profile data when component mounts
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data } = await axiosInstance.get<UserProfile>(`/api/users/profile/${user?.username}`);
        console.log('Fetched profile data:', data); // Debug log
        setFormData({
          username: data.username,
          bio: data.bio || '',
          userImage: data.userImage,
          isSeller: data.isSeller,
          sellerVerificationDoc: data.sellerVerificationDoc,
          sellerStatus: data.sellerStatus,
        });
      } catch (err) {
        console.error('Error fetching user profile:', err);
        toast.error('Failed to load profile data');
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

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      
      // Ensure the userImage URL is consistent
      let userImagePath = formData.userImage;
      if (userImagePath && userImagePath.startsWith('https://localhost:3000')) {
        userImagePath = userImagePath.replace('https://localhost:3000', '');
      }

      const updateData = {
        username: formData.username,
        bio: formData.bio,
        userImage: userImagePath,
        isSeller: formData.isSeller,
        sellerVerificationDoc: formData.sellerVerificationDoc,
        sellerStatus: formData.sellerStatus
      };

      const response = await axiosInstance.put<UpdateProfileResponse>('/api/users/profile', updateData);
      
      // Update user context if provided in response
      if (response.data?.user) {
        updateUser(response.data.user);
      }
      
      toast.success('Profile updated successfully');
    } catch (err: any) {
      console.error('Profile update error:', err);
      const errorMessage = err.response?.data?.error || 'Failed to update profile';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setLoading(true);
      toast.loading('Uploading profile picture...', { id: 'image-upload' });
      
      const formData = new FormData();
      formData.append('image', file);

      const response = await axiosInstance.post<UploadResponse>('/api/users/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Get the image URL, checking both possible response formats
      const imageUrl = response.data.imageUrl || response.data.url;
      
      if (!imageUrl) {
        throw new Error('No image URL in server response');
      }
      
      // Update form data with the new image URL
      setFormData(prev => ({
        ...prev,
        userImage: imageUrl
      }));
      
      // Update user context
      updateUser({ userImage: imageUrl });
      
      toast.success('Profile picture updated', { id: 'image-upload' });
    } catch (err: any) {
      console.error('Image upload error:', err);
      const errorMessage = err.response?.data?.error || 'Failed to upload image';
      toast.error(errorMessage, { id: 'image-upload' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      setLoading(true);
      toast.loading('Removing profile picture...', { id: 'remove-image' });
      
      setFormData(prev => ({
        ...prev,
        userImage: null
      }));
      
      // Update the user context when removing the image
      updateUser({ userImage: null });
      
      toast.success('Profile picture removed', { id: 'remove-image' });
    } catch (err: any) {
      console.error('Error removing profile picture:', err);
      toast.error('Failed to remove profile picture', { id: 'remove-image' });
    } finally {
      setLoading(false);
    }
  };

  const handleSellerToggle = async () => {
    if (!formData.isSeller) {
      // If turning on seller mode, we need to upload verification doc
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*'; // Only accept image files, no PDFs
      fileInput.click();
      fileInput.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error('Please select an image file');
          return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error('File size should be less than 5MB');
          return;
        }

        try {
          setLoading(true);
          setUploadProgress(0);
          
          const formData = new FormData();
          formData.append('document', file);

          // Show loading toast
          const loadingToast = toast.loading('Uploading verification document...');

          const config = {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent: { loaded: number; total?: number }) => {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
              setUploadProgress(percentCompleted);
            }
          };

          const response = await axiosInstance.post<UploadResponse>('/api/users/seller-verification', formData, config);

          const docUrl = response.data.url;
          if (!docUrl) {
            throw new Error('No document URL in server response');
          }

          setFormData(prev => ({
            ...prev,
            isSeller: true,
            sellerVerificationDoc: docUrl,
            sellerStatus: 'PENDING'
          }));

          // Update user context
          updateUser({
            isSeller: true,
            sellerVerificationDoc: docUrl,
            sellerStatus: 'PENDING'
          });

          toast.success('Verification document uploaded successfully! Waiting for admin approval.', {
            duration: 5000,
            id: loadingToast
          });
        } catch (err: any) {
          console.error('Document upload error:', err);
          const errorMessage = err.response?.data?.error || 'Failed to upload verification document';
          toast.error(errorMessage);
          setUploadProgress(null);
        } finally {
          setLoading(false);
        }
      };
    } else {
      // If turning off seller mode
      if (window.confirm('Are you sure you want to disable seller mode? This will remove your verification status.')) {
        setFormData(prev => ({
          ...prev,
          isSeller: false,
          sellerVerificationDoc: null,
          sellerStatus: null
        }));
        
        // Update user context
        updateUser({
          isSeller: false,
          sellerVerificationDoc: null,
          sellerStatus: null
        });
        
        toast.success('Seller mode disabled');
      }
    }
  };

  const handleCancelSellerRequest = async () => {
    if (!window.confirm('Are you sure you want to cancel your seller verification request?')) {
      return;
    }
    
    try {
      setLoading(true);
      toast.loading('Cancelling verification request...', { id: 'cancel-request' });
      
      // Call the correct API endpoint to cancel the seller verification request
      await axiosInstance.post('/api/users/cancel-seller-verification');
      
      // Update form data
      setFormData(prev => ({
        ...prev,
        isSeller: false,
        sellerVerificationDoc: null,
        sellerStatus: null
      }));
      
      // Update user context
      updateUser({
        isSeller: false,
        sellerVerificationDoc: null,
        sellerStatus: null
      });
      
      toast.success('Seller verification request cancelled', { id: 'cancel-request' });
    } catch (err: any) {
      console.error('Error cancelling request:', err);
      const errorMessage = err.response?.data?.error || 'Failed to cancel verification request';
      toast.error(errorMessage, { id: 'cancel-request' });
    } finally {
      setLoading(false);
    }
  };

  const isImageFile = (url: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const lowerCaseUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerCaseUrl.endsWith(ext));
  };

  const getFullUrl = (url: string | null): string => {
    if (!url) return '';
    
    console.log("EditProfile - Getting full URL for:", url);
    
    // Use environment variable for API URL
    const apiUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//localhost:3000`;
    
    // If it's already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Get filename from path
    const filename = url.split('/').pop();
    if (!filename) {
      return url;
    }
    
    // Handle different types of uploads
    if (url.includes('verification-documents')) {
      return `${apiUrl}/uploads/verification-documents/${filename}`;
    } else if (url.startsWith('/uploads/profiles/')) {
      // For backward compatibility: redirect /uploads/profiles/ to /uploads/profile-pictures/
      return `${apiUrl}/uploads/profile-pictures/${filename}`;
    } else if (url.startsWith('/uploads/profile-pictures/')) {
      return `${apiUrl}${url}`;
    } else if (url.startsWith('/uploads/')) {
      return `${apiUrl}${url}`;
    }
    
    // Fallback to original URL if no specific pattern matches
    return url;
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
      <div className="flex-1 lg:ml-64 ml-16 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
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

            <div className="space-y-6">
              {/* Profile Picture */}
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className={`w-32 h-32 rounded-full border-4 ${darkMode ? 'border-gray-800 bg-gray-700' : 'border-white bg-gray-100'} flex items-center justify-center overflow-hidden shadow-lg`}>
                    {formData.userImage ? (
                      <SafeImage
                        src={formData.userImage}
                        alt={formData.username}
                        className="w-full h-full object-cover"
                        fallbackComponent={<User size={64} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />}
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

              {/* User Profile Info Section */}
              <div className="space-y-4">
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Profile Information
                </h2>

              {/* Username */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Username
                </label>
                  <div className="flex space-x-2">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                      className={`flex-1 px-4 py-2 rounded-lg border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                  </div>
              </div>

              {/* Bio */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Bio
                </label>
                  <div className="space-y-3">
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
                    
                    {/* Save Profile Button */}
                    <button
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className={`px-4 py-2 rounded-lg ${
                        darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                      } text-white transition-colors duration-200 flex items-center`}
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      ) : (
                        <Save size={16} className="mr-2" />
                      )}
                      Save Profile
                    </button>
                  </div>
                </div>
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

              {/* Seller Verification Section */}
              <div className="pt-6 border-t border-gray-700">
                <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Seller Verification
                </h2>
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg border ${darkMode ? 'border-gray-600' : 'border-gray-300'} ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Store className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
                  <div>
                          <h3 className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            Become a Seller
                          </h3>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {formData.sellerStatus === 'PENDING' 
                              ? 'Verification document submitted, waiting for admin approval'
                              : formData.sellerStatus === 'APPROVED'
                              ? 'Your seller account is verified'
                              : formData.sellerStatus === 'REJECTED'
                              ? 'Your verification was rejected. Please try again.'
                              : 'Upload a document to verify your seller account'}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {formData.sellerStatus === 'PENDING' ? (
                          <button
                            onClick={handleCancelSellerRequest}
                            disabled={loading}
                            className={`px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center`}
                          >
                            <X size={16} className="mr-1" />
                            Cancel Request
                          </button>
                        ) : formData.sellerStatus === 'REJECTED' ? (
                          <button
                            onClick={handleCancelSellerRequest}
                            disabled={loading}
                            className={`px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center`}
                          >
                            <X size={16} className="mr-1" />
                            Cancel Request
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSellerToggle}
                            disabled={loading}
                            className={`px-4 py-2 rounded-lg ${
                              formData.isSeller && formData.sellerStatus === 'APPROVED'
                                ? 'bg-red-600 hover:bg-red-700' 
                                : 'bg-blue-600 hover:bg-blue-700'
                            } text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {formData.isSeller && formData.sellerStatus === 'APPROVED' ? 'Disable Seller Mode' : 'Apply as Seller'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {formData.sellerStatus && (
                    <div className={`p-4 rounded-lg ${
                      formData.sellerStatus === 'PENDING' 
                        ? darkMode ? 'bg-amber-900/30' : 'bg-amber-50'
                        : formData.sellerStatus === 'APPROVED'
                        ? darkMode ? 'bg-green-900/30' : 'bg-green-50'
                        : darkMode ? 'bg-red-900/30' : 'bg-red-50'
                    } border ${
                      formData.sellerStatus === 'PENDING'
                        ? darkMode ? 'border-amber-800/30' : 'border-amber-200'
                        : formData.sellerStatus === 'APPROVED'
                        ? darkMode ? 'border-green-800/30' : 'border-green-200'
                        : darkMode ? 'border-red-800/30' : 'border-red-200'
                    }`}>
                      <div className="flex items-center">
                        {formData.sellerStatus === 'PENDING' ? (
                          <Clock className={`mr-2 ${darkMode ? 'text-amber-400' : 'text-amber-500'}`} />
                        ) : formData.sellerStatus === 'APPROVED' ? (
                          <CheckCircle className={`mr-2 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
                        ) : (
                          <XCircle className={`mr-2 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
                        )}
                        <span className={`text-sm font-medium ${
                          formData.sellerStatus === 'PENDING'
                            ? darkMode ? 'text-amber-300' : 'text-amber-700'
                            : formData.sellerStatus === 'APPROVED'
                            ? darkMode ? 'text-green-300' : 'text-green-700'
                            : darkMode ? 'text-red-300' : 'text-red-700'
                        }`}>
                          {formData.sellerStatus === 'PENDING' 
                            ? 'Verification Pending' 
                            : formData.sellerStatus === 'APPROVED'
                            ? 'Verification Approved'
                            : 'Verification Rejected'}
                        </span>
                      </div>
                      
                      <p className={`text-sm mt-2 ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {formData.sellerStatus === 'PENDING' 
                          ? 'Your verification document has been submitted and is being reviewed by our admin team. This process may take 1-2 business days.'
                          : formData.sellerStatus === 'APPROVED'
                          ? 'Your seller account has been verified. You can now add products to the marketplace.'
                          : 'Your verification document was not accepted. Please upload a new document or contact support for more information.'}
                      </p>
                    </div>
                  )}

                  {formData.sellerVerificationDoc && (
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileCheck className={darkMode ? 'text-blue-400' : 'text-blue-600'} size={22} />
                  <div>
                            <h3 className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                              Verification Document
                            </h3>
                            <p className={`text-sm truncate max-w-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {formData.sellerVerificationDoc.includes('/') 
                                ? formData.sellerVerificationDoc.split('/').pop() 
                                : formData.sellerVerificationDoc}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setShowDocViewer(true)}
                            className={`px-3 py-1 rounded-md ${
                              darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                            } text-white transition-colors duration-200 flex items-center`}
                          >
                            <FileCheck size={16} className="mr-1" />
                            View
                          </button>
                          {formData.sellerStatus === 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => {
                                // Create file input directly without confirmation dialog
                                const fileInput = document.createElement('input');
                                fileInput.type = 'file';
                                fileInput.accept = 'image/*';
                                fileInput.click();
                                
                                fileInput.onchange = async (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (!file) return;
                                  
                                  // Validate file type
                                  if (!file.type.startsWith('image/')) {
                                    toast.error('Please select an image file');
                                    return;
                                  }
                                  
                                  // Validate file size
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast.error('File size should be less than 5MB');
                                    return;
                                  }
                                  
                                  // Upload the file
                                  try {
                                    setLoading(true);
                                    setUploadProgress(0);
                                    
                                    const formData = new FormData();
                                    formData.append('document', file);
                                    
                                    const loadingToast = toast.loading('Uploading verification document...');
                                    
                                    const config = {
                                      headers: {
                                        'Content-Type': 'multipart/form-data',
                                      },
                                      onUploadProgress: (progressEvent: { loaded: number; total?: number }) => {
                                        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                                        setUploadProgress(percentCompleted);
                                      }
                                    };
                                    
                                    const response = await axiosInstance.post<UploadResponse>(
                                      '/api/users/seller-verification', 
                                      formData, 
                                      config
                                    );
                                    
                                    const docUrl = response.data.url;
                                    if (!docUrl) {
                                      throw new Error('No document URL in server response');
                                    }
                                    
                                    // Update form data
                                    setFormData(prev => ({
                                      ...prev,
                                      isSeller: true,
                                      sellerVerificationDoc: docUrl,
                                      sellerStatus: 'PENDING'
                                    }));
                                    
                                    // Update user context
                                    updateUser({
                                      isSeller: true,
                                      sellerVerificationDoc: docUrl,
                                      sellerStatus: 'PENDING'
                                    });
                                    
                                    toast.success('Verification document uploaded successfully! Waiting for admin approval.', {
                                      duration: 5000,
                                      id: loadingToast
                                    });
                                  } catch (err: any) {
                                    console.error('Document upload error:', err);
                                    const errorMessage = err.response?.data?.error || 'Failed to upload verification document';
                                    toast.error(errorMessage);
                                    setUploadProgress(null);
                                  } finally {
                                    setLoading(false);
                                  }
                                };
                              }}
                              className={`px-3 py-1 rounded-md ${
                                darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                              } text-white transition-colors duration-200 flex items-center`}
                            >
                              <Upload size={16} className="mr-1" />
                              Upload New
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Upload Progress */}
                      {uploadProgress !== null && (
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full" 
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Uploading: {uploadProgress}%
                          </p>
                  </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
                  </div>
                </div>
              </div>

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {showDocViewer && formData.sellerVerificationDoc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setShowDocViewer(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`relative max-w-3xl w-full max-h-[80vh] overflow-hidden rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 shadow-xl`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Verification Document
                </h3>
              <button
                  onClick={() => setShowDocViewer(false)}
                  className={`p-1.5 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
                >
                  <X size={20} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
                </button>
              </div>

              <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} pt-4`}>
                {isImageFile(formData.sellerVerificationDoc) ? (
                  <div className="flex items-center justify-center overflow-auto max-h-[60vh]">
                    <img 
                      src={getFullUrl(formData.sellerVerificationDoc)} 
                      alt="Verification Document"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        console.error("Failed to load document image:", formData.sellerVerificationDoc);
                        const target = e.target as HTMLImageElement;
                        target.onerror = null; // Prevent infinite error loop
                        
                        // Extract filename if present
                        const filename = formData.sellerVerificationDoc?.split('/').pop();
                        console.log("Trying to display document:", filename);
                        
                        // Use a placeholder image for the verification document
                        target.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE0IDJINiBhMiAyIDAgMCAwLTIgMiB2MTYgYTIgMiAwIDAgMCAyIDIgaDEyIGEyIDIgMCAwIDAgMi0yIFY4IHoiPjwvcGF0aD48cG9seWxpbmUgcG9pbnRzPSIxNCAyIDE0IDggMjAgOCI+PC9wb2x5bGluZT48L3N2Zz4=";
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <File size={64} className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <p className={`mb-4 text-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Unknown file type
                    </p>
                    <a
                      href={getFullUrl(formData.sellerVerificationDoc)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-4 py-2 rounded-lg flex items-center bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200`}
                    >
                      <Download size={16} className="mr-2" />
                      Download File
                    </a>
                  </div>
                )}
          </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EditProfile; 