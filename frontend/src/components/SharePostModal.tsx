import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Search, User, Send, Check, Users } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import axiosInstance from '../utils/axios';
import toast from 'react-hot-toast';

interface SharePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: number;
}

interface UserToShare {
  id: number;
  username: string;
  userImage: string | null;
  isSelected: boolean;
}

interface GroupChat {
  id: number;
  name: string;
  image: string | null;
  isSelected: boolean;
}

type TabType = 'users' | 'groups';

const SharePostModal: React.FC<SharePostModalProps> = ({ isOpen, onClose, postId }) => {
  const { darkMode } = useDarkMode();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserToShare[]>([]);
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserToShare[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<GroupChat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('users');
  
  // Fetch users the current user follows
  useEffect(() => {
    const fetchFollowing = async () => {
      if (!isOpen) return;
      
      try {
        setIsLoading(true);
        const { data } = await axiosInstance.get('/api/users/follows');
        
        // Map the following users to include a selection state
        const followingUsers = (data as { following: Array<{ id: number; username: string; userImage: string | null }> }).following.map(user => ({
          id: user.id,
          username: user.username,
          userImage: user.userImage,
          isSelected: false
        }));
        
        setUsers(followingUsers);
        setFilteredUsers(followingUsers);
      } catch (error) {
        console.error('Error fetching following:', error);
        toast.error('Failed to load users');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFollowing();
  }, [isOpen]);
  
  // Fetch group chats
  useEffect(() => {
    const fetchGroupChats = async () => {
      if (!isOpen || activeTab !== 'groups') return;
      
      try {
        setIsLoading(true);
        const { data } = await axiosInstance.get('/api/group-chats');
        
        // Map the group chats to include a selection state
        const groupChats = (data as Array<{ id: number; name: string; image: string | null }>).map(group => ({
          id: group.id,
          name: group.name,
          image: group.image,
          isSelected: false
        }));
        
        setGroups(groupChats);
        setFilteredGroups(groupChats);
      } catch (error) {
        console.error('Error fetching group chats:', error);
        toast.error('Failed to load group chats');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (activeTab === 'groups') {
      fetchGroupChats();
    }
  }, [isOpen, activeTab]);
  
  // Filter users based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      if (activeTab === 'users') {
        setFilteredUsers(users);
      } else {
        setFilteredGroups(groups);
      }
    } else {
      if (activeTab === 'users') {
        const filtered = users.filter(user => 
          user.username.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredUsers(filtered);
      } else {
        const filtered = groups.filter(group => 
          group.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredGroups(filtered);
      }
    }
  }, [searchQuery, users, groups, activeTab]);
  
  // Toggle user selection
  const toggleUserSelection = (userId: number) => {
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === userId 
          ? { ...user, isSelected: !user.isSelected } 
          : user
      )
    );
    
    setFilteredUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === userId 
          ? { ...user, isSelected: !user.isSelected } 
          : user
      )
    );
  };
  
  // Toggle group selection
  const toggleGroupSelection = (groupId: number) => {
    setGroups(prevGroups => 
      prevGroups.map(group => 
        group.id === groupId 
          ? { ...group, isSelected: !group.isSelected } 
          : group
      )
    );
    
    setFilteredGroups(prevGroups => 
      prevGroups.map(group => 
        group.id === groupId 
          ? { ...group, isSelected: !group.isSelected } 
          : group
      )
    );
  };
  
  // Send the post to selected users or groups
  const handleSend = async () => {
    if (activeTab === 'users') {
      const selectedUsers = users.filter(user => user.isSelected);
      
      if (selectedUsers.length === 0) {
        toast.error('Select at least one user to share with');
        return;
      }
      
      setIsSending(true);
      
      try {
        // For each selected user, send the post
        for (const user of selectedUsers) {
          await axiosInstance.post('/api/messages/share-post', {
            receiverId: user.id,
            postId
          });
        }
        
        toast.success(`Shared post with ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}`);
        onClose();
      } catch (error) {
        console.error('Error sharing post:', error);
        toast.error('Failed to share post');
      } finally {
        setIsSending(false);
      }
    } else {
      const selectedGroups = groups.filter(group => group.isSelected);
      
      if (selectedGroups.length === 0) {
        toast.error('Select at least one group to share with');
        return;
      }
      
      setIsSending(true);
      
      try {
        // For each selected group, send the post
        for (const group of selectedGroups) {
          await axiosInstance.post('/api/messages/share-post-group', {
            groupId: group.id,
            postId
          });
        }
        
        toast.success(`Shared post with ${selectedGroups.length} group${selectedGroups.length > 1 ? 's' : ''}`);
        onClose();
      } catch (error) {
        console.error('Error sharing post to groups:', error);
        toast.error('Failed to share post to groups');
      } finally {
        setIsSending(false);
      }
    }
  };
  
  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchQuery('');
  };
  
  // Handle modal backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  const getItemCount = () => {
    if (activeTab === 'users') {
      return users.filter(u => u.isSelected).length;
    } else {
      return groups.filter(g => g.isSelected).length;
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`relative w-full max-w-md p-4 rounded-xl shadow-lg ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Share Post</h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-full ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex mb-4">
          <button
            onClick={() => handleTabChange('users')}
            className={`flex-1 py-2 text-center rounded-l-lg ${
              activeTab === 'users'
                ? darkMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500 text-white'
                : darkMode
                ? 'bg-gray-700 text-gray-300'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            <User size={18} className="inline mr-2" />
            Users
          </button>
          <button
            onClick={() => handleTabChange('groups')}
            className={`flex-1 py-2 text-center rounded-r-lg ${
              activeTab === 'groups'
                ? darkMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500 text-white'
                : darkMode
                ? 'bg-gray-700 text-gray-300'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            <Users size={18} className="inline mr-2" />
            Group Chats
          </button>
        </div>
        
        {/* Search input */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder={activeTab === 'users' ? "Search users..." : "Search group chats..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg ${
              darkMode
                ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600'
                : 'bg-gray-100 text-gray-900 placeholder-gray-500 border-gray-200'
            } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        </div>
        
        {/* List (Users or Groups) */}
        <div className={`max-h-60 overflow-y-auto mb-4 ${
          darkMode ? 'scrollbar-dark' : 'scrollbar-light'
        }`}>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : activeTab === 'users' ? (
            filteredUsers.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {searchQuery.trim() ? 'No users found' : 'You are not following anyone yet'}
              </div>
            ) : (
              filteredUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => toggleUserSelection(user.id)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${
                    user.isSelected
                      ? darkMode
                        ? 'bg-blue-800/20'
                        : 'bg-blue-50'
                      : darkMode
                      ? 'hover:bg-gray-700'
                      : 'hover:bg-gray-100'
                  } transition-colors duration-200 mb-2`}
                >
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full overflow-hidden mr-3 ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      {user.userImage ? (
                        <img
                          src={user.userImage}
                          alt={user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User size={20} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                        </div>
                      )}
                    </div>
                    <span className="font-medium">{user.username}</span>
                  </div>
                  
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                    user.isSelected
                      ? darkMode
                        ? 'bg-blue-600 border-blue-500'
                        : 'bg-blue-500 border-blue-400'
                      : darkMode
                      ? 'border-gray-600'
                      : 'border-gray-300'
                  }`}>
                    {user.isSelected && <Check size={14} className="text-white" />}
                  </div>
                </div>
              ))
            )
          ) : (
            // Groups tab content
            filteredGroups.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {searchQuery.trim() ? 'No group chats found' : 'You have no group chats yet'}
              </div>
            ) : (
              filteredGroups.map(group => (
                <div
                  key={group.id}
                  onClick={() => toggleGroupSelection(group.id)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${
                    group.isSelected
                      ? darkMode
                        ? 'bg-blue-800/20'
                        : 'bg-blue-50'
                      : darkMode
                      ? 'hover:bg-gray-700'
                      : 'hover:bg-gray-100'
                  } transition-colors duration-200 mb-2`}
                >
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full overflow-hidden mr-3 ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      {group.image ? (
                        <img
                          src={group.image}
                          alt={group.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Users size={20} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                        </div>
                      )}
                    </div>
                    <span className="font-medium">{group.name}</span>
                  </div>
                  
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                    group.isSelected
                      ? darkMode
                        ? 'bg-blue-600 border-blue-500'
                        : 'bg-blue-500 border-blue-400'
                      : darkMode
                      ? 'border-gray-600'
                      : 'border-gray-300'
                  }`}>
                    {group.isSelected && <Check size={14} className="text-white" />}
                  </div>
                </div>
              ))
            )
          )}
        </div>
        
        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={isSending || getItemCount() === 0}
          className={`w-full py-2 rounded-lg flex items-center justify-center ${
            getItemCount() > 0
              ? darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              : darkMode
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-t-transparent border-current rounded-full animate-spin mx-2"></div>
          ) : (
            <>
              <Send size={18} className="mr-2" />
              Share Post
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default SharePostModal; 