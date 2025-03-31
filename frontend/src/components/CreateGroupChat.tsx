import React, { useState, useEffect } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, User, Plus, Users, Check, Crown } from 'lucide-react';
import axiosInstance from '../utils/axios';

interface CreateGroupChatProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (groupId: number) => void;
}

interface SearchUser {
  id: number;
  username: string;
  userImage: string | null;
}

const CreateGroupChat: React.FC<CreateGroupChatProps> = ({ isOpen, onClose, onGroupCreated }) => {
  const { darkMode } = useDarkMode();
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add current user to the group by default
  useEffect(() => {
    if (user && isOpen) {
      // Add the current user as the first member (group creator)
      const currentUser: SearchUser = {
        id: user.id,
        username: user.username,
        userImage: user.userImage
      };
      
      // Clear previous selections and add current user
      setSelectedUsers([currentUser]);
    }
  }, [user, isOpen]);

  // Handle search for users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data } = await axiosInstance.get<SearchUser[]>(`/api/users/search?query=${encodeURIComponent(searchQuery)}`);
        // Filter out already selected users and current user
        const filteredResults = data.filter(
          searchedUser => 
            !selectedUsers.some(selected => selected.id === searchedUser.id) && 
            searchedUser.id !== user?.id
        );
        setSearchResults(filteredResults);
      } catch (err) {
        console.error('Error searching users:', err);
        setError('Failed to search for users');
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, selectedUsers, user?.id]);

  // Add a user to the group
  const addUser = (user: SearchUser) => {
    if (selectedUsers.length >= 8) {
      setError('Maximum 8 members allowed in a group');
      return;
    }
    setSelectedUsers(prev => [...prev, user]);
    setSearchQuery('');
  };

  // Remove a user from the group
  const removeUser = (userId: number) => {
    // Prevent removing the current user (group creator)
    if (userId === user?.id) {
      setError('You cannot remove yourself from the group');
      return;
    }
    setSelectedUsers(prev => prev.filter(user => user.id !== userId));
  };

  // Create the group chat
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    if (selectedUsers.length === 0) {
      setError('Please add at least one member to the group');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Use the correct endpoint
      const { data } = await axiosInstance.post<{ id: number }>('/api/group-chats', {
        name: groupName.trim(),
        description: groupDescription.trim() || null,
        members: selectedUsers.map(user => user.id)
      });

      onGroupCreated(data.id);
      onClose();
    } catch (err: any) {
      console.error('Error creating group:', err);
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  // Reset form on close
  const handleClose = () => {
    setGroupName('');
    setGroupDescription('');
    setSearchQuery('');
    setSelectedUsers([]);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`w-full max-w-md rounded-xl shadow-2xl overflow-hidden ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`px-5 py-4 border-b flex items-center justify-between ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <h3 className="text-lg font-semibold flex items-center">
              <Users className="mr-2" size={20} />
              Create New Group
            </h3>
            <button
              onClick={handleClose}
              className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <div className="p-5 space-y-4">
            {/* Error message */}
            {error && (
              <div className={`p-3 rounded-lg ${
                darkMode ? 'bg-red-900/30 text-red-200' : 'bg-red-100 text-red-700'
              }`}>
                {error}
              </div>
            )}

            {/* Group name */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Group Name*
              </label>
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Enter group name"
                maxLength={50}
                className={`w-full p-2.5 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 placeholder-gray-500'
                } focus:outline-none focus:ring-2 ${
                  darkMode ? 'focus:ring-blue-500' : 'focus:ring-blue-500'
                }`}
              />
            </div>

            {/* Group description */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Group Description (optional)
              </label>
              <textarea
                value={groupDescription}
                onChange={e => setGroupDescription(e.target.value)}
                placeholder="Enter group description"
                rows={2}
                className={`w-full p-2.5 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 placeholder-gray-500'
                } focus:outline-none focus:ring-2 ${
                  darkMode ? 'focus:ring-blue-500' : 'focus:ring-blue-500'
                } resize-none`}
              />
            </div>

            {/* Add members */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Add Members* ({selectedUsers.length}/8)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search for users to add"
                  className={`w-full p-2.5 pl-10 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 ${
                    darkMode ? 'focus:ring-blue-500' : 'focus:ring-blue-500'
                  }`}
                  disabled={selectedUsers.length >= 8}
                />
                <Search 
                  className={`absolute left-3 top-3 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} 
                  size={18} 
                />
              </div>

              {/* Search results */}
              {searchQuery.trim() && (
                <div className={`mt-2 rounded-lg border overflow-hidden max-h-48 overflow-y-auto ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  {isSearching ? (
                    <div className={`p-3 text-center ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Searching...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className={`p-3 text-center ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      No users found
                    </div>
                  ) : (
                    searchResults.map(user => (
                      <div 
                        key={user.id}
                        onClick={() => addUser(user)}
                        className={`flex items-center p-3 cursor-pointer ${
                          darkMode 
                            ? 'hover:bg-gray-700 border-b border-gray-700' 
                            : 'hover:bg-gray-50 border-b border-gray-200'
                        } last:border-b-0`}
                      >
                        <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ${
                          darkMode ? 'bg-gray-600' : 'bg-gray-200'
                        }`}>
                          {user.userImage ? (
                            <img
                              src={user.userImage.startsWith('http') ? user.userImage : `https://localhost:3000${user.userImage}`}
                              alt={user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User size={16} />
                            </div>
                          )}
                        </div>
                        <span className="ml-3 flex-1">{user.username}</span>
                        <Plus size={18} className="text-blue-500" />
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Selected users */}
              {selectedUsers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedUsers.map(selectedUser => (
                    <div
                      key={selectedUser.id}
                      className={`flex items-center space-x-1 py-1 px-2 rounded-full text-sm ${
                        selectedUser.id === user?.id
                          ? (darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800')
                          : (darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-800')
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full overflow-hidden ${
                        darkMode ? 'bg-gray-600' : 'bg-gray-300'
                      }`}>
                        {selectedUser.userImage ? (
                          <img
                            src={selectedUser.userImage.startsWith('http') ? selectedUser.userImage : `https://localhost:3000${selectedUser.userImage}`}
                            alt={selectedUser.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User size={10} />
                          </div>
                        )}
                      </div>
                      <span>{selectedUser.username}</span>
                      {selectedUser.id === user?.id ? (
                        <Crown size={12} className={darkMode ? 'text-yellow-400' : 'text-yellow-600'} />
                      ) : (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeUser(selectedUser.id);
                          }}
                          className="hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={`px-5 py-4 border-t ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className={`px-4 py-2 rounded-lg ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                } transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={isCreating || !groupName.trim() || selectedUsers.length === 0}
                className={`px-4 py-2 rounded-lg flex items-center ${
                  darkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                } transition-colors ${
                  (isCreating || !groupName.trim() || selectedUsers.length === 0) 
                    ? 'opacity-50 cursor-not-allowed' 
                    : ''
                }`}
              >
                {isCreating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    Creating...
                  </>
                ) : (
                  <>
                    <Check size={18} className="mr-1" />
                    Create Group
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateGroupChat; 