import React, { useState, useRef } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import { X, Users, User, Edit, UserPlus, Info, Camera, PenTool, LogOut, AlertOctagon } from 'lucide-react';
import GroupChatInfoEdit from './GroupChatInfoPanel';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface GroupChatInfoProps {
  isOpen: boolean;
  onClose: () => void;
  chatData: {
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
    createdAt?: string;
  };
  onUpdate: () => void;
  onLeaveGroup: (groupId: number) => void;
}

const GroupChatInfo: React.FC<GroupChatInfoProps> = ({ 
  isOpen, 
  onClose, 
  chatData, 
  onUpdate,
  onLeaveGroup
}) => {
  const { darkMode } = useDarkMode();
  const { user } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editView, setEditView] = useState<'general' | 'members'>('general');
  const [isEndingGroup, setIsEndingGroup] = useState(false);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isOwnerOrAdmin = chatData.members?.some(
    member => member.id === user?.id && (member.isOwner || member.isAdmin)
  );

  const isOwner = chatData.members?.some(
    member => member.id === user?.id && member.isOwner
  );

  const createdDate = chatData.createdAt 
    ? new Date(chatData.createdAt).toLocaleDateString()
    : 'Unknown date';

  // Function to handle direct image upload without opening edit modal
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
      setImageLoading(true);
      const formData = new FormData();
      formData.append('image', file);

      await axios.post(`/api/group-chats/${chatData.id}/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Group image updated successfully');
      onUpdate(); // Refresh chat data
    } catch (error) {
      console.error('Error uploading group image:', error);
      toast.error('Failed to update group image');
    } finally {
      setImageLoading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Function to remove group image
  const handleRemoveImage = async () => {
    if (!chatData.image) return;
    
    try {
      setImageLoading(true);
      await axios.delete(`/api/group-chats/${chatData.id}/image`);
      toast.success('Group image removed');
      onUpdate(); // Refresh chat data
    } catch (error) {
      console.error('Error removing group image:', error);
      toast.error('Failed to remove group image');
    } finally {
      setImageLoading(false);
    }
  };

  const endGroupChat = async () => {
    try {
      setIsEndingGroup(true);
      await axios.delete(`/api/group-chats/${chatData.id}`);
      toast.success('Group chat has been ended');
      onUpdate();
      setShowEndConfirmation(false);
    } catch (error) {
      console.error('Error ending group chat:', error);
      toast.error('Failed to end group chat');
    } finally {
      setIsEndingGroup(false);
    }
  };

  // Open edit modal with specific view
  const openEditModal = (view: 'general' | 'members') => {
    setEditView(view);
    setShowEditModal(true);
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed right-0 top-0 h-full w-full sm:w-80 md:w-96 ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
      } border-l ${
        darkMode ? 'border-gray-700' : 'border-gray-200'
      } shadow-lg z-40 overflow-y-auto transition-transform transform ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${
        darkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center">
          <Info size={18} className="mr-2" />
          <h2 className="text-lg font-semibold">Group Info</h2>
        </div>
        <button
          onClick={onClose}
          className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700`}
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Group Profile */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            <div className={`w-24 h-24 rounded-full overflow-hidden ${
              darkMode ? 'bg-gray-700' : 'bg-gray-100'
            } flex items-center justify-center mb-2`}>
              {chatData.image ? (
                <img 
                  src={chatData.image}
                  alt={chatData.name || 'Group'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users
                  size={32}
                  className={darkMode ? 'text-gray-500' : 'text-gray-400'}
                />
              )}
            </div>

            {/* Remove image button (if image exists) */}
            {isOwnerOrAdmin && chatData.image && !chatData.isEnded && (
              <button
                onClick={handleRemoveImage}
                disabled={imageLoading}
                className={`absolute top-0 left-0 p-1.5 rounded-full ${
                  darkMode 
                    ? 'bg-gray-800 hover:bg-red-900/90 border-gray-700' 
                    : 'bg-white hover:bg-red-50 border-gray-200'
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

            {/* Change image button */}
            {isOwnerOrAdmin && !chatData.isEnded && (
              <label
                className={`absolute bottom-2 right-0 p-2 rounded-full ${
                  darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'
                } shadow-md transition-colors duration-200 cursor-pointer`}
                title="Change group picture"
              >
                <Camera size={14} className={darkMode ? 'text-white' : 'text-gray-700'} />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={imageLoading}
                  ref={fileInputRef}
                />
              </label>
            )}
          </div>
          
          <div className="mt-2 flex flex-col items-center">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold">{chatData.name}</h3>
              {isOwnerOrAdmin && !chatData.isEnded && (
                <button
                  onClick={() => openEditModal('general')}
                  className={`p-1 rounded ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                  title="Edit group name"
                >
                  <PenTool size={14} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                </button>
              )}
            </div>
            
            {chatData.isEnded && (
              <div className={`flex items-center gap-1 px-2 py-1 my-1 rounded ${
                darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'
              }`}>
                <AlertOctagon size={14} />
                <span className="text-sm">This group chat has ended</span>
              </div>
            )}
            
            <div className="flex items-start gap-2 max-w-full mt-2">
              <div className="flex-1 text-center">
                {chatData.description ? (
                  <p className={`text-sm max-w-full ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  } mb-2`}>
                    {chatData.description}
                  </p>
                ) : (
                  <p className={`text-sm italic ${
                    darkMode ? 'text-gray-500' : 'text-gray-400'
                  } mb-2`}>
                    No description
                  </p>
                )}
              </div>
              
              {isOwnerOrAdmin && !chatData.isEnded && (
                <button
                  onClick={() => openEditModal('general')}
                  className={`p-1 rounded flex-shrink-0 ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                  title="Edit group description"
                >
                  <PenTool size={14} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                </button>
              )}
            </div>
          </div>
          
          <p className={`text-xs ${
            darkMode ? 'text-gray-500' : 'text-gray-500'
          }`}>
            Created on {createdDate}
          </p>
        </div>

        {/* Action Buttons */}
        {isOwnerOrAdmin && !chatData.isEnded && (
          <div className="mb-6">
            <button
              onClick={() => openEditModal('general')}
              className={`w-full py-2 rounded-lg flex items-center justify-center ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              } transition-colors font-medium mb-2`}
            >
              <Edit size={16} className="mr-2" />
              Edit Group
            </button>
            
            {isOwner && (
              <button
                onClick={() => setShowEndConfirmation(true)}
                className={`w-full py-2 rounded-lg flex items-center justify-center ${
                  darkMode 
                    ? 'bg-red-900/30 hover:bg-red-900/40 text-red-300' 
                    : 'bg-red-50 hover:bg-red-100 text-red-600'
                } transition-colors font-medium mb-2`}
              >
                <AlertOctagon size={16} className="mr-2" />
                End Group Chat
              </button>
            )}
          </div>
        )}

        {/* Members Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-semibold ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Members ({chatData.members?.length || 0})
            </h3>
            {isOwnerOrAdmin && !chatData.isEnded && (
              <button
                onClick={() => openEditModal('members')}
                className={`flex items-center text-sm ${
                  darkMode ? 'text-blue-400' : 'text-blue-600'
                } hover:underline`}
              >
                <UserPlus size={14} className="mr-1" />
                Add
              </button>
            )}
          </div>

          <div className={`rounded-lg border ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            {chatData.members?.map(member => (
              <div
                key={member.id}
                className={`flex items-center p-3 ${
                  darkMode 
                    ? 'border-b border-gray-700' 
                    : 'border-b border-gray-200'
                } last:border-b-0`}
              >
                <div className={`w-8 h-8 rounded-full overflow-hidden ${
                  darkMode ? 'bg-gray-600' : 'bg-gray-200'
                } mr-3 flex-shrink-0`}>
                  {member.userImage ? (
                    <img
                      src={member.userImage.startsWith('http') ? member.userImage : `https://localhost:3000${member.userImage}`}
                      alt={member.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={16} className={`m-auto ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{member.username}</div>
                  <div className="flex items-center space-x-1">
                    {member.isOwner && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        darkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        Owner
                      </span>
                    )}
                    {member.isAdmin && !member.isOwner && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                      }`}>
                        Admin
                      </span>
                    )}
                    {member.id === user?.id && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}>
                        You
                      </span>
                    )}
                  </div>
                </div>
                
                {isOwnerOrAdmin && !chatData.isEnded && member.id !== user?.id && !member.isOwner && (
                  <button
                    onClick={() => openEditModal('members')}
                    className={`p-1.5 rounded ${
                      darkMode 
                        ? 'text-gray-400 hover:text-gray-300' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="Manage member"
                  >
                    <Edit size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Leave Group Button */}
        {user?.id !== chatData.ownerId && !chatData.isEnded && (
          <button
            onClick={() => onLeaveGroup(chatData.id)}
            className={`w-full py-2 rounded-lg ${
              darkMode 
                ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30' 
                : 'bg-red-50 text-red-600 hover:bg-red-100'
            } transition-colors font-medium mt-4`}
          >
            Leave Group
          </button>
        )}
      </div>

      {/* End Group Confirmation Modal */}
      {showEndConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-80 p-6 rounded-lg shadow-lg ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className="text-lg font-bold mb-2">End Group Chat</h3>
            <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              This will permanently end the group chat. No new messages can be sent, but members can still view the chat history.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEndConfirmation(false)}
                className={`px-4 py-2 rounded ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
                disabled={isEndingGroup}
              >
                Cancel
              </button>
              <button
                onClick={endGroupChat}
                className={`px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white`}
                disabled={isEndingGroup}
              >
                {isEndingGroup ? 'Ending...' : 'End Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <GroupChatInfoEdit
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          groupData={chatData}
          onUpdate={() => {
            onUpdate();
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
};

export default GroupChatInfo; 