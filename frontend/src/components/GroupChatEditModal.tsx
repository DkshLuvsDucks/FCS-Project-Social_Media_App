import React, { useState, useRef, useEffect } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { X, Camera, Save, ArrowLeft, Users, User, Check, Crown, Trash2, Search, Plus, AlertTriangle } from 'lucide-react';
import axiosInstance from '../utils/axios';

interface GroupChatEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupData: {
    id: number;
    name: string;
    description?: string;
    image?: string | null;
    ownerId?: number;
    isEnded?: boolean;
    members?: Array<{
      id: number;
      username: string;
      userImage: string | null;
      isAdmin?: boolean;
      isOwner?: boolean;
    }>;
  };
  onUpdate: () => void;
  initialView?: 'general' | 'members';
}

// Types for API responses
interface UserSearchResult {
  id: number;
  username: string;
  userImage: string | null;
}

interface MemberData {
  id: number;
  username: string;
  userImage: string | null;
  isAdmin?: boolean;
  isOwner?: boolean;
}

interface AdminStatusResponse {
  isAdmin: boolean;
}

type EditView = 'general' | 'members';

const GroupChatEditModal: React.FC<GroupChatEditModalProps> = ({ 
  isOpen, 
  onClose, 
  groupData, 
  onUpdate,
  initialView = 'general'
}) => {
  const { darkMode } = useDarkMode();
  const { user } = useAuth();
  const [view, setView] = useState<EditView>(initialView);
  const [name, setName] = useState(groupData.name || '');
  const [description, setDescription] = useState(groupData.description || '');
  const [image, setImage] = useState<string | null>(groupData.image || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [members, setMembers] = useState<MemberData[]>(groupData.members || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [confirmEndGroup, setConfirmEndGroup] = useState(false);
  const MAX_GROUP_NAME_LENGTH = 32;

  // Set view based on initialView prop
  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const isOwner = user?.id === groupData.ownerId;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Create a preview URL
    const previewUrl = URL.createObjectURL(file);
    setImage(previewUrl);
    setImageFile(file);
    setError(null);
  };

  const handleImageRemove = () => {
    setImage(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data } = await axiosInstance.get<UserSearchResult[]>(`/api/users/search?query=${encodeURIComponent(query)}`);
      
      // Filter out users who are already members
      const filteredResults = data.filter(
        (user: { id: number }) => !members.some(member => member.id === user.id)
      );
      
      setSearchResults(filteredResults);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search for users');
    } finally {
      setIsSearching(false);
    }
  };

  const addMember = async (userId: number) => {
    try {
      setLoading(true);
      
      // Call API to add member
      const { data } = await axiosInstance.post<MemberData>(`/api/groups/${groupData.id}/members`, {
        memberId: userId
      });
      
      // Update local state
      setMembers(prev => [...prev, data]);
      setSearchQuery('');
      setSearchResults([]);
      setSuccess('Member added successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error adding member:', err);
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (userId: number, isCurrentlyAdmin: boolean) => {
    try {
      setLoading(true);
      
      // Call API to toggle admin status
      const { data } = await axiosInstance.put<AdminStatusResponse>(`/api/groups/${groupData.id}/members/${userId}/admin`, {
        isAdmin: !isCurrentlyAdmin
      });
      
      // Update local state
      setMembers(prev => prev.map(member => 
        member.id === userId ? { ...member, isAdmin: data.isAdmin } : member
      ));
      
      setSuccess(`User is ${data.isAdmin ? 'now an admin' : 'no longer an admin'}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating admin status:', err);
      setError(err.response?.data?.message || 'Failed to update admin status');
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (userId: number) => {
    try {
      setLoading(true);
      
      // Call API to remove member
      await axiosInstance.delete(`/api/groups/${groupData.id}/members/${userId}`);
      
      // Update local state
      setMembers(prev => prev.filter(member => member.id !== userId));
      setSuccess('Member removed successfully');
      setTimeout(() => setSuccess(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleEndGroup = async () => {
    try {
      setLoading(true);
      
      // Call API to end the group
      await axiosInstance.delete(`/api/groups/${groupData.id}`);
      
      setSuccess('Group ended successfully');
      setTimeout(() => {
        setSuccess(null);
        onUpdate();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error ending group:', err);
      setError(err.response?.data?.message || 'Failed to end group');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneralInfo = async () => {
    // Validate name
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    if (name.length > MAX_GROUP_NAME_LENGTH) {
      setError(`Group name cannot exceed ${MAX_GROUP_NAME_LENGTH} characters`);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const updateData: { name: string; description?: string; image?: File } = {
        name: name.trim()
      };
      
      if (description !== groupData.description) {
        updateData.description = description.trim();
      }
      
      if (imageFile) {
        updateData.image = imageFile;
      }
      
      // Create form data for the image upload (if any)
      const formData = new FormData();
      formData.append('name', name.trim());
      
      if (description !== undefined) {
        formData.append('description', description.trim());
      }
      
      if (imageFile) {
        formData.append('image', imageFile);
      }
      
      // Make the API call to update the group data
      await axiosInstance.put(`/api/group-chats/${groupData.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setSuccess('Group information updated successfully');
      setTimeout(() => setSuccess(null), 3000);
      onUpdate();
    } catch (err: any) {
      console.error('Error updating group:', err);
      setError(err.response?.data?.message || 'Failed to update group information');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (confirmEndGroup) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={() => setConfirmEndGroup(false)}
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
            <h3 className="text-xl font-bold mb-2">End Group Chat</h3>
            <p className={`text-center ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              This will permanently close the group chat. All members will no longer be able to send messages.
              <br /><br />
              This action cannot be undone.
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setConfirmEndGroup(false)}
              className={`flex-1 py-2.5 rounded-lg font-medium ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleEndGroup}
              className={`flex-1 py-2.5 rounded-lg font-medium ${
                darkMode 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'End Group'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-lg rounded-xl overflow-hidden shadow-2xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center">
            {view === 'members' ? (
              <button 
                onClick={() => setView('general')}
                className="mr-3"
              >
                <ArrowLeft size={18} />
              </button>
            ) : null}
            
            <h2 className="text-lg font-semibold">
              {view === 'general' ? 'Edit Group' : 'Manage Members'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Status Messages */}
        {error && (
          <div className={`mx-6 mt-4 p-3 rounded-lg ${
            darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'
          }`}>
            {error}
          </div>
        )}
        
        {success && (
          <div className={`mx-6 mt-4 p-3 rounded-lg ${
            darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-600'
          }`}>
            {success}
          </div>
        )}
        
        {/* Tabs */}
        <div className={`px-6 py-3 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex space-x-4">
            <button
              onClick={() => setView('general')}
              className={`py-2 px-1 font-medium border-b-2 transition-colors ${
                view === 'general'
                  ? (darkMode ? 'border-blue-500 text-blue-400' : 'border-blue-500 text-blue-600')
                  : (darkMode ? 'border-transparent text-gray-400' : 'border-transparent text-gray-500')
              }`}
            >
              General
            </button>
            <button
              onClick={() => setView('members')}
              className={`py-2 px-1 font-medium border-b-2 transition-colors ${
                view === 'members'
                  ? (darkMode ? 'border-blue-500 text-blue-400' : 'border-blue-500 text-blue-600')
                  : (darkMode ? 'border-transparent text-gray-400' : 'border-transparent text-gray-500')
              }`}
            >
              Members
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {view === 'general' ? (
            <div className="space-y-6">
              {/* Group Image */}
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className={`w-32 h-32 rounded-full border-4 ${
                    darkMode ? 'border-gray-800 bg-gray-700' : 'border-white bg-gray-100'
                  } flex items-center justify-center overflow-hidden shadow-lg`}>
                    {image ? (
                      <img 
                        src={image}
                        alt={name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Image failed to load:', image);
                          setImage(null);
                        }}
                      />
                    ) : (
                      <Users size={64} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                    )}
                  </div>
                  
                  {/* Remove button at top-left */}
                  {image && (
                    <button
                      onClick={handleImageRemove}
                      disabled={loading}
                      className={`absolute top-1 left-1 p-1.5 rounded-full ${
                        darkMode 
                          ? 'bg-gray-800 hover:bg-red-900/90 border-gray-700 hover:border-red-500/50' 
                          : 'bg-white hover:bg-red-50 border-gray-200 hover:border-red-200'
                      } shadow-md border transition-all duration-200 group`}
                      title="Remove group picture"
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
                    } shadow-md cursor-pointer border-2 ${
                      darkMode ? 'border-gray-800' : 'border-white'
                    } transition-all duration-200`}
                    title="Change group picture"
                  >
                    <Camera size={20} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageSelect}
                      disabled={loading}
                      ref={fileInputRef}
                    />
                  </label>
                </div>
                <span className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {loading ? 'Uploading...' : 'Click to upload a new image'}
                </span>
              </div>
              
              {/* Group Name */}
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Group Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-black focus:border-blue-500'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  placeholder="Enter group name"
                  maxLength={MAX_GROUP_NAME_LENGTH}
                  disabled={loading}
                />
              </div>
              
              {/* Group Description */}
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-black focus:border-blue-500'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none`}
                  placeholder="Add group description"
                  rows={3}
                  disabled={loading}
                />
              </div>
              
              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveGeneralInfo}
                  disabled={loading || !name.trim()}
                  className={`flex items-center px-6 py-2 rounded-lg ${
                    darkMode 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                >
                  <Save size={18} className="mr-2" />
                  Save Changes
                </button>
              </div>
              
              {/* End Group Button (Owner only) */}
              {isOwner && (
                <div className="mt-8 pt-6 border-t border-gray-700">
                  <button
                    onClick={() => setConfirmEndGroup(true)}
                    className={`w-full py-2.5 rounded-lg font-medium ${
                      darkMode 
                        ? 'bg-red-900/30 hover:bg-red-900/40 text-red-400' 
                        : 'bg-red-50 hover:bg-red-100 text-red-600'
                    } transition-colors`}
                  >
                    End Group Chat
                  </button>
                  <p className={`text-center mt-2 text-xs ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    This will permanently end the group chat for all members.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Search Members */}
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Add Members
                </label>
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-black focus:border-blue-500'
                    } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    placeholder="Search users to add"
                    disabled={loading}
                  />
                </div>
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className={`border rounded-lg max-h-36 overflow-y-auto ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  {searchResults.map(user => (
                    <div 
                      key={user.id}
                      className={`flex items-center justify-between p-3 ${
                        darkMode 
                          ? 'border-b border-gray-700 hover:bg-gray-700' 
                          : 'border-b border-gray-200 hover:bg-gray-50'
                      } last:border-b-0 cursor-pointer`}
                      onClick={() => addMember(user.id)}
                    >
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full overflow-hidden ${
                          darkMode ? 'bg-gray-600' : 'bg-gray-100'
                        } mr-3`}>
                          {user.userImage ? (
                            <img
                              src={user.userImage.startsWith('http') ? user.userImage : `https://localhost:3000${user.userImage}`}
                              alt={user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User size={16} className="m-auto" />
                          )}
                        </div>
                        <div className="font-medium">{user.username}</div>
                      </div>
                      <button className="text-blue-500">
                        <Plus size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Current Members */}
              <div className="space-y-2">
                <h3 className={`text-sm font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Current Members ({members.length})
                </h3>
                <div className={`border rounded-lg overflow-hidden ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  {members.map(member => (
                    <div 
                      key={member.id}
                      className={`flex items-center justify-between p-3 ${
                        darkMode 
                          ? 'border-b border-gray-700' 
                          : 'border-b border-gray-200'
                      } last:border-b-0`}
                    >
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full overflow-hidden ${
                          darkMode ? 'bg-gray-600' : 'bg-gray-100'
                        } mr-3`}>
                          {member.userImage ? (
                            <img
                              src={member.userImage.startsWith('http') ? member.userImage : `https://localhost:3000${member.userImage}`}
                              alt={member.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User size={16} className="m-auto" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium flex items-center">
                            {member.username}
                            {member.isOwner && (
                              <Crown 
                                size={14} 
                                className={`ml-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`}
                              />
                            )}
                          </div>
                          {member.isOwner && <div className="text-xs text-gray-500">Owner</div>}
                          {member.isAdmin && !member.isOwner && <div className="text-xs text-gray-500">Admin</div>}
                        </div>
                      </div>
                      
                      {/* Member Actions (for admins) */}
                      {isOwner && member.id !== user?.id && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleAdminStatus(member.id, !!member.isAdmin)}
                            disabled={loading}
                            className={`p-1.5 rounded ${
                              member.isAdmin 
                                ? (darkMode ? 'text-blue-400' : 'text-blue-600')
                                : (darkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600')
                            }`}
                            title={member.isAdmin ? 'Remove admin status' : 'Make admin'}
                          >
                            <Check size={16} />
                          </button>
                          
                          <button
                            onClick={() => removeMember(member.id)}
                            disabled={loading}
                            className={`p-1.5 rounded ${
                              darkMode 
                                ? 'text-gray-400 hover:text-red-400' 
                                : 'text-gray-600 hover:text-red-600'
                            }`}
                            title="Remove from group"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                      
                      {/* Non-owners can only remove non-admin members */}
                      {!isOwner && member.id !== user?.id && member.id !== groupData.ownerId && !member.isAdmin && (
                        <button
                          onClick={() => removeMember(member.id)}
                          disabled={loading}
                          className={`p-1.5 rounded ${
                            darkMode 
                              ? 'text-gray-400 hover:text-red-400' 
                              : 'text-gray-600 hover:text-red-600'
                          }`}
                          title="Remove from group"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GroupChatEditModal; 