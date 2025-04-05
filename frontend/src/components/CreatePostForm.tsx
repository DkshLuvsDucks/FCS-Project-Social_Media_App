import React, { useState, useRef } from 'react';
import { Send, Users, Image, X, Globe, Camera } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../utils/axios';
import { motion, AnimatePresence } from 'framer-motion';

interface CreatePostFormProps {
  onPostCreated?: () => void;
}

export const CreatePostForm: React.FC<CreatePostFormProps> = ({ onPostCreated }) => {
  const { darkMode } = useDarkMode();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Media handling
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUploadProgress, setMediaUploadProgress] = useState(0);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  
  // Use a ref for the file input to avoid duplicates
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Function to trigger file selection dialog
  const handleMediaButtonClick = () => {
    // Use the ref to get the input element and trigger a click
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaFile(file);
      
      // Set media type
      if (file.type.startsWith('image/')) {
        setMediaType('image');
      } else if (file.type.startsWith('video/')) {
        setMediaType('video');
      }
      
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    setMediaUploadProgress(0);
    // Reset the file input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mediaFile) {
      setError('Media is required for posts');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Set progress to show we're starting
      setMediaUploadProgress(10);
      
      const formData = new FormData();
      formData.append('content', content);
      formData.append('isPrivate', isPrivate ? 'true' : 'false');
      formData.append('media', mediaFile);
      
      // Debug log to check what value is being sent
      console.log('Creating post with isPrivate:', isPrivate);
      
      // Update progress to show form is being submitted
      setMediaUploadProgress(30);
      
      const response = await axiosInstance.post('/api/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Set progress to complete
      setMediaUploadProgress(100);
      
      console.log('Post created successfully:', response.data);
      
      setContent('');
      setIsPrivate(false);
      setMediaFile(null);
      setMediaPreview(null);
      setMediaType(null);
      setSuccess('Post created successfully!');
      
      // Call onPostCreated immediately without delay
      if (onPostCreated) {
        console.log('Calling onPostCreated callback to refresh posts');
        onPostCreated();
      }
    } catch (err: any) {
      console.error('Error creating post:', err);
      setError(err.response?.data?.error || 'Failed to create post');
    } finally {
      setIsLoading(false);
      
      // Reset progress after a delay
      setTimeout(() => {
        setMediaUploadProgress(0);
      }, 500);
    }
  };
  
  return (
    <div className={`rounded-xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md transition-all duration-200`}>
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {user?.userImage ? (
                <img 
                  src={user.userImage} 
                  alt={user.username} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '';
                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className={`text-lg font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
            </div>
            <div>
              <div className="font-semibold">{user?.username}</div>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`text-xs flex items-center ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  {isPrivate ? (
                    <>
                      <Users size={14} className="mr-1" />
                      <span>Followers only</span>
                    </>
                  ) : (
                    <>
                      <Globe size={14} className="mr-1" />
                      <span>Public</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Hidden file input - only one instance */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleMediaChange}
          className="hidden"
        />
        
        {/* Content Area */}
        <div className="p-4">
          {!mediaPreview ? (
            <div 
              className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer text-center ${
                darkMode 
                  ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700/80' 
                  : 'bg-gray-100/50 border-gray-300 hover:bg-gray-100/80'
              } min-h-[250px] transition-colors`}
              onClick={handleMediaButtonClick}
            >
              <Camera size={48} className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <p className="mb-2 font-medium">Add Photos or Videos</p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Share your moments with friends
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent double click events
                  handleMediaButtonClick();
                }}
                className={`mt-4 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                  darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <span className="flex items-center">
                  <Image size={16} className="mr-2" />
                  Select Media
                </span>
              </button>
            </div>
          ) : (
            <>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write a caption..."
                className={`w-full p-3 rounded-lg resize-none focus:outline-none focus:ring-2 ${
                  darkMode 
                    ? 'bg-gray-700 text-white focus:ring-blue-600/50 placeholder-gray-400'
                    : 'bg-gray-100 text-gray-900 focus:ring-blue-500/50 placeholder-gray-500'
                } min-h-[80px]`}
              />
              
              {/* Media Preview */}
              <AnimatePresence>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="relative mt-4 rounded-lg overflow-hidden"
                >
                  {mediaType === 'image' ? (
                    <img 
                      src={mediaPreview} 
                      alt="Media preview" 
                      className="w-full max-h-[350px] object-contain rounded-lg"
                    />
                  ) : mediaType === 'video' ? (
                    <video 
                      src={mediaPreview} 
                      controls
                      className="w-full max-h-[350px] rounded-lg"
                    />
                  ) : null}
                  
                  <button
                    type="button"
                    onClick={removeMedia}
                    className={`absolute top-2 right-2 p-1.5 rounded-full ${
                      darkMode ? 'bg-gray-800/80' : 'bg-white/80'
                    } hover:opacity-100 opacity-90 shadow-md`}
                  >
                    <X size={18} />
                  </button>
                  
                  {/* Upload Progress Bar */}
                  {isLoading && mediaUploadProgress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 py-1">
                      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${mediaUploadProgress}%` }} 
                        />
                      </div>
                      <div className="text-center text-white text-xs mt-1">
                        {mediaUploadProgress}%
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </>
          )}
          
          {/* Actions Bar */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex space-x-3">
              {!mediaPreview ? (
                <button
                  type="button"
                  onClick={handleMediaButtonClick}
                  className={`p-2 rounded-full cursor-pointer transition-colors flex items-center ${
                    darkMode ? 'hover:bg-gray-700 text-blue-400' : 'hover:bg-gray-200 text-blue-600'
                  }`}
                >
                  <Image size={20} className="mr-2" />
                  <span className="text-sm">Add Media</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`p-2 rounded-full transition-colors flex items-center ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  } ${
                    isPrivate 
                      ? darkMode ? 'text-yellow-400' : 'text-yellow-600' 
                      : darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {isPrivate ? (
                    <>
                      <Users size={20} className="mr-2" />
                      <span className="text-sm">Followers only</span>
                    </>
                  ) : (
                    <>
                      <Globe size={20} className="mr-2" />
                      <span className="text-sm">Public</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            <motion.button
              type="submit"
              disabled={isLoading || !mediaFile}
              whileTap={{ scale: 0.97 }}
              className={`px-4 py-2 rounded-lg flex items-center ${
                mediaFile
                  ? darkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                  : darkMode
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <span>Post</span>
                  <Send size={16} className="ml-2" />
                </>
              )}
            </motion.button>
          </div>
        </div>
        
        {/* Feedback Messages */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-3 ${darkMode ? 'bg-red-900/30 text-red-200' : 'bg-red-50 text-red-600'}`}
            >
              {error}
            </motion.div>
          )}
          
          {success && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-3 ${darkMode ? 'bg-green-900/30 text-green-200' : 'bg-green-50 text-green-600'}`}
            >
              {success}
            </motion.div>
          )}
          
          {isPrivate && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-3 text-sm ${darkMode ? 'bg-yellow-900/30 text-yellow-200' : 'bg-yellow-50 text-yellow-600'}`}
            >
              <p className="flex items-center">
                <Users size={14} className="mr-2" />
                This post will only be visible to your followers
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
};

export default CreatePostForm;