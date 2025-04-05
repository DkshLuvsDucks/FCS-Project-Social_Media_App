import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Trash2, AlertTriangle, AlertOctagon, Calendar, MessageSquare } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axios';

interface UserChatInfoProps {
  isOpen: boolean;
  onClose: () => void;
  userData: {
    id: number;
    username: string;
    userImage: string | null;
    createdAt: string;
  };
  onDeleteAllMessages: (userId: number) => void;
}

const UserChatInfoPanel: React.FC<UserChatInfoProps> = ({ 
  isOpen, 
  onClose, 
  userData, 
  onDeleteAllMessages 
}) => {
  const { darkMode } = useDarkMode();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (!isOpen) return null;

  const handleBlockUser = async () => {
    try {
      await axiosInstance.post(`/api/users/${userData.id}/block`);
      setSuccess('User has been blocked successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error blocking user:', error);
      setError('Failed to block user');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleReportUser = async () => {
    try {
      await axiosInstance.post(`/api/users/${userData.id}/report`, {
        reason: 'User reported from messages'
      });
      setSuccess('User has been reported successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error reporting user:', error);
      setError('Failed to report user');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleViewProfile = () => {
    navigate(`/profile/${userData.username}`);
  };

  const handleDeleteAllMessages = () => {
    onDeleteAllMessages(userData.id);
    setShowConfirmDelete(false);
  };

  // Confirmation dialog for deleting all messages
  if (showConfirmDelete) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={() => setShowConfirmDelete(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={e => e.stopPropagation()}
          className={`w-full max-w-md rounded-xl overflow-hidden shadow-2xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } p-6`}
        >
          <div className="flex flex-col items-center mb-6">
            <div className={`w-16 h-16 flex items-center justify-center rounded-full ${
              darkMode ? 'bg-red-900/20' : 'bg-red-100'
            } mb-4`}>
              <AlertTriangle size={32} className={darkMode ? 'text-red-400' : 'text-red-500'} />
            </div>
            <h3 className="text-xl font-bold mb-2">Delete All Messages</h3>
            <p className={`text-center ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              This will permanently delete all messages between you and {userData.username}.
              <br /><br />
              This action cannot be undone.
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowConfirmDelete(false)}
              className={`flex-1 py-2.5 rounded-lg font-medium ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAllMessages}
              className={`flex-1 py-2.5 rounded-lg font-medium ${
                darkMode 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              Delete All
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`fixed right-0 top-0 h-full w-full sm:w-80 md:w-96 ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
      } border-l ${
        darkMode ? 'border-gray-700' : 'border-gray-200'
      } shadow-lg z-50 overflow-y-auto`}
    >
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${
        darkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <h2 className="text-lg font-semibold">User Information</h2>
        <button
          onClick={onClose}
          className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700`}
        >
          <X size={20} />
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className={`mx-4 my-3 p-3 rounded-lg ${
          darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'
        }`}>
          {error}
        </div>
      )}
      
      {success && (
        <div className={`mx-4 my-3 p-3 rounded-lg ${
          darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-600'
        }`}>
          {success}
        </div>
      )}

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* User Image and Basic Info */}
        <div className="flex flex-col items-center text-center">
          <div className={`w-24 h-24 rounded-full overflow-hidden border-4 mb-3 ${
            darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-100 bg-gray-100'
          }`}>
            {userData.userImage ? (
              <img
                src={userData.userImage.startsWith('http') ? userData.userImage : `https://localhost:3000${userData.userImage}`}
                alt={userData.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User size={40} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold">{userData.username}</h2>
          
          {/* Show when conversation started */}
          <div className={`mt-2 flex items-center justify-center text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <Calendar size={16} className="mr-2" />
            <span>Chatting since {new Date(userData.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Additional User Info */}
        <div className={`rounded-lg border p-4 ${
          darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
        }`}>
          <h3 className={`text-md font-semibold mb-2 ${
            darkMode ? 'text-gray-200' : 'text-gray-800'
          }`}>
            Conversation Stats
          </h3>
          <div className="flex items-center mb-2">
            <MessageSquare size={18} className={`mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
              Messages are end-to-end encrypted
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleViewProfile}
            className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-center ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-blue-300' 
                : 'bg-gray-100 hover:bg-gray-200 text-blue-600'
            } transition-colors duration-200 font-medium`}
          >
            <User size={16} className="mr-2" />
            View Profile
          </button>
          
          <button
            onClick={handleBlockUser}
            className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-center ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-red-300' 
                : 'bg-gray-100 hover:bg-gray-200 text-red-600'
            } transition-colors duration-200 font-medium`}
          >
            <AlertTriangle size={16} className="mr-2" />
            Block User
          </button>
          
          <button
            onClick={handleReportUser}
            className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-center ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-red-300' 
                : 'bg-gray-100 hover:bg-gray-200 text-red-600'
            } transition-colors duration-200 font-medium`}
          >
            <AlertOctagon size={16} className="mr-2" />
            Report User
          </button>
        </div>

        {/* Delete All Messages */}
        <div className={`pt-4 mt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={() => setShowConfirmDelete(true)}
            className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-center ${
              darkMode 
                ? 'bg-red-900/30 hover:bg-red-900/40 text-red-400' 
                : 'bg-red-50 hover:bg-red-100 text-red-600'
            } transition-colors duration-200 font-medium`}
          >
            <Trash2 size={16} className="mr-2" />
            Delete All Messages
          </button>
          <p className={`text-center mt-2 text-xs ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            This will permanently delete all messages in this conversation.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default UserChatInfoPanel; 