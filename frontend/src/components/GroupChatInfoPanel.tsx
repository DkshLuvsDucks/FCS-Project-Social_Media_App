import React, { useState, useRef, useEffect } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Users, User, Edit, UserPlus, Info, Camera, 
  PenTool, LogOut, AlertOctagon, Calendar, MessageSquare, 
  Crown, Trash2, CheckCircle, XCircle, Loader, Search, Plus, UserMinus
} from 'lucide-react';
import axiosInstance from '../utils/axios';

interface GroupChatInfoPanelProps {
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
    createdAt?: string;
  };
  onUpdate: () => void;
  onLeftGroup?: (groupId: number) => void;
}

const GroupChatInfoPanel: React.FC<GroupChatInfoPanelProps> = ({ 
  isOpen, 
  onClose, 
  groupData, 
  onUpdate,
  onLeftGroup
}) => {
  const { darkMode } = useDarkMode();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editedName, setEditedName] = useState(groupData.name);
  const [editedDesc, setEditedDesc] = useState(groupData.description || '');
  const [imageLoading, setImageLoading] = useState(false);
  const [localGroupImage, setLocalGroupImage] = useState<string | null>(groupData.image || null);
  const [showPromoteConfirm, setShowPromoteConfirm] = useState<number | null>(null);
  const [showDemoteConfirm, setShowDemoteConfirm] = useState<number | null>(null);
  const [showKickConfirm, setShowKickConfirm] = useState<number | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [localGroupName, setLocalGroupName] = useState(groupData.name);
  const [localGroupDesc, setLocalGroupDesc] = useState<string>(groupData.description || '');
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // New states for add member functionality
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    id: number;
    username: string;
    userImage: string | null;
    isFollowing?: boolean;
    isSelected?: boolean;
  }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Array<{
    id: number;
    username: string;
    userImage: string | null;
  }>>([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const MAX_GROUP_NAME_LENGTH = 32; // Changed from 50 to 32 characters
  
  // Add a ref for handling click outside
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Add utility function to highlight matched text in search results
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>;
    
    try {
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = text.split(regex);
      
      return (
        <>
          {parts.map((part, i) => 
            regex.test(part) ? (
              <span key={i} className={darkMode ? "text-blue-400 font-medium" : "text-blue-600 font-medium"}>
                {part}
              </span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </>
      );
    } catch (e) {
      // Fallback in case of regex error
      return <span>{text}</span>;
    }
  };
  
  // Add click outside handler to close panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Function to get full image URL
  const getFullImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    
    // If the image path already includes the base URL, return it as is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Otherwise, prepend the base URL to the image path
    return `https://localhost:3000${imagePath}`;
  };

  // Instead of fetching, just use the data passed in props
  useEffect(() => {
    if (isOpen && groupData) {
      const description = groupData.description !== undefined && groupData.description !== null 
        ? groupData.description 
        : '';
      
      // Update local state for description - this happens when the panel opens
      setLocalGroupDesc(description);
      setEditedDesc(description);
    }
  }, [isOpen, groupData]);

  // Only update when group data changes while the component is mounted
  useEffect(() => {
    // Basic updates for other fields
    setEditedName(groupData.name);
    setLocalGroupName(groupData.name);
    setLocalGroupImage(groupData.image ? getFullImageUrl(groupData.image) : null);
    
    // Get the most up-to-date description from props
    const description = groupData.description !== undefined && groupData.description !== null
      ? groupData.description 
      : '';
    
    // Always update description state to match props
    setEditedDesc(description);
    setLocalGroupDesc(description);
  }, [groupData]);

  // Debugging effect to check local state updates
  useEffect(() => {
    console.log("LocalGroupDesc updated:", localGroupDesc);
  }, [localGroupDesc]);

  // Ensure UI shows correct member count when we update members internally
  useEffect(() => {
    console.log("Members updated:", groupData.members?.length);
  }, [forceUpdate, groupData.members]);

  const isOwner = groupData.members?.some(
    member => member.id === user?.id && member.isOwner
  );

  const isAdmin = groupData.members?.some(
    member => member.id === user?.id && member.isAdmin && !member.isOwner
  );

  const isRegularMember = groupData.members?.some(
    member => member.id === user?.id && !member.isAdmin && !member.isOwner
  );

  const createdDate = groupData.createdAt 
    ? new Date(groupData.createdAt).toLocaleDateString()
    : 'Unknown date';

  const handleLeaveGroup = async () => {
    try {
      setIsLeaving(true);
      setError(null);
      
      // Use the member removal endpoint with current user's ID
      // This will handle ownership transfer if the user is the owner
      await axiosInstance.delete(`/api/group-chats/${groupData.id}/members/${user?.id}`);
      
      setSuccess('You have left the group');
      
      // Notify parent component that user has left the group
      if (onLeftGroup) {
        onLeftGroup(groupData.id);
      }
      
      // Small delay before closing and updating UI
      setTimeout(() => {
        onUpdate(); // This should refresh the group list and remove this group
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error leaving group:', err);
      setError(err.response?.data?.error || 'Failed to leave group');
      setIsLeaving(false);
      setShowLeaveConfirmation(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    try {
      setImageLoading(true);
      setError(null);
      
      const localImageUrl = URL.createObjectURL(file);
      setLocalGroupImage(localImageUrl);
      
      const formData = new FormData();
      formData.append('image', file);

      const response = await axiosInstance.post<{ url: string }>(`/api/group-chats/${groupData.id}/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.url) {
        // Use the full URL for the image
        setLocalGroupImage(getFullImageUrl(response.data.url));
        onUpdate();
        setSuccess('Group picture updated successfully');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setLocalGroupImage(groupData.image ? getFullImageUrl(groupData.image) : null);
      setError(err.response?.data?.message || 'Failed to upload image');
      setTimeout(() => setError(null), 3000);
    } finally {
      setImageLoading(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      setImageLoading(true);
      setError(null);
      
      setLocalGroupImage(null);
      
      await axiosInstance.delete(`/api/group-chats/${groupData.id}/image`);
      onUpdate();
      setSuccess('Group picture removed successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setLocalGroupImage(groupData.image ? getFullImageUrl(groupData.image) : null);
      setError(err.response?.data?.message || 'Failed to remove image');
      setTimeout(() => setError(null), 3000);
    } finally {
      setImageLoading(false);
    }
  };

  const handleNameUpdate = async () => {
    // Validate name length
    if (editedName.trim().length === 0) {
      setError("Group name cannot be empty");
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    if (editedName.length > MAX_GROUP_NAME_LENGTH) {
      setError(`Group name cannot exceed ${MAX_GROUP_NAME_LENGTH} characters`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setLoading(true);
      await axiosInstance.put(`/api/group-chats/${groupData.id}`, {
        name: editedName,
      });
      // Update local state immediately
      setLocalGroupName(editedName);
      onUpdate();
      setIsEditingName(false);
      setSuccess('Group name updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update group name');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Handle description update with careful state management
  const handleDescUpdate = async () => {
    try {
      setLoading(true);
      
      // Store the description we're submitting for later comparison
      const descriptionToUpdate = editedDesc;
      
      // Make the API call with explicit description value
      await axiosInstance.put(`/api/group-chats/${groupData.id}`, {
        description: descriptionToUpdate
      });
      
      // Update local state to show the change immediately
      setLocalGroupDesc(descriptionToUpdate);
      
      // Notify parent to refresh data
      onUpdate();
      
      setIsEditingDesc(false);
      setSuccess('Group description updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error updating description:", err);
      setError(err.response?.data?.message || 'Failed to update group description');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteMember = async (memberId: number) => {
    try {
      setLoading(true);
      await axiosInstance.put(`/api/group-chats/${groupData.id}/promote/${memberId}`);
      
      // Update local state immediately
      if (groupData.members) {
        groupData.members = groupData.members.map(member => 
          member.id === memberId 
            ? { ...member, isAdmin: true } 
            : member
        );
        // Force a re-render
        setForceUpdate(prev => prev + 1);
      }
      
      onUpdate();
      setShowPromoteConfirm(null);
      setSuccess('Member promoted to admin successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to promote member');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoteMember = async (memberId: number) => {
    try {
      setLoading(true);
      await axiosInstance.put(`/api/group-chats/${groupData.id}/demote/${memberId}`);
      
      // Update local state immediately
      if (groupData.members) {
        groupData.members = groupData.members.map(member => 
          member.id === memberId 
            ? { ...member, isAdmin: false } 
            : member
        );
        // Force a re-render
        setForceUpdate(prev => prev + 1);
      }
      
      onUpdate();
      setShowDemoteConfirm(null);
      setSuccess('Member demoted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to demote member');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleKickMember = async (memberId: number) => {
    try {
      setLoading(true);
      await axiosInstance.delete(`/api/group-chats/${groupData.id}/members/${memberId}`);
      
      // Update local state immediately to reflect the removal
      if (groupData.members) {
        groupData.members = groupData.members.filter(member => member.id !== memberId);
        // Force a re-render
        setForceUpdate(prev => prev + 1);
      }
      
      onUpdate();
      setShowKickConfirm(null);
      setSuccess('Member removed from group successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove member');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleEndGroupChat = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Show a progress message while deleting
      setSuccess('Ending group chat and removing all members...');
      
      // Call the backend endpoint to end the group chat
      await axiosInstance.put(`/api/group-chats/${groupData.id}/end`);
      
      // Clear any old progress/success message
      setSuccess('Group chat has been permanently deleted');
      
      // Notify parent component that the group has been ended (which should close the chat area)
      if (onLeftGroup) {
        onLeftGroup(groupData.id);
      }
      
      // Update the group list
      onUpdate();
      
      // Close the confirmation dialog
      setShowEndConfirm(false);
      
      // Wait 1.5 seconds before closing the panel
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error ending group chat:', err);
      setError(err.response?.data?.error || 'Failed to end group chat');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // New function to handle user search
  const handleUserSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      setSearchLoading(true);
      const response = await axiosInstance.get<Array<{
        id: number;
        username: string;
        userImage: string | null;
        isFollowing?: boolean;
      }>>(`/api/users/search?query=${encodeURIComponent(searchQuery)}`);
      
      const { data } = response;
      
      // Filter out users already in the group
      const filteredResults = data.filter(user => {
        return !groupData.members?.some(member => member.id === user.id);
      });
      
      setSearchResults(filteredResults.map(user => ({
        ...user,
        isSelected: selectedUsers.some(selectedUser => selectedUser.id === user.id)
      })));
    } catch (err: any) {
      console.error('Error searching users:', err);
      setError('Failed to search for users');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSearchLoading(false);
    }
  };

  // Effect to trigger search on query change
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery) {
        handleUserSearch();
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Function to toggle user selection
  const toggleUserSelection = (user: {
    id: number;
    username: string;
    userImage: string | null;
    isFollowing?: boolean;
    isSelected?: boolean;
  }) => {
    if (selectedUsers.some(selectedUser => selectedUser.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(selectedUser => selectedUser.id !== user.id));
      setSearchResults(searchResults.map(result => 
        result.id === user.id ? { ...result, isSelected: false } : result
      ));
    } else {
      setSelectedUsers([...selectedUsers, user]);
      setSearchResults(searchResults.map(result => 
        result.id === user.id ? { ...result, isSelected: true } : result
      ));
    }
  };

  // Function to add selected members
  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    try {
      setAddingMembers(true);
      setError(null);
      
      // Add members one by one using the correct endpoint format
      let successCount = 0;
      const errors = [];
      const newlyAddedMembers = [];
      
      for (const user of selectedUsers) {
        try {
          // Use the correct API endpoint from groupChatRoutes.ts
          // POST /api/group-chats/:groupId/members with memberId in the body
          const response = await axiosInstance.post(`/api/group-chats/${groupData.id}/members`, {
            memberId: user.id
          });
          
          // Store the successfully added member with admin/owner flags
          newlyAddedMembers.push({
            id: user.id,
            username: user.username,
            userImage: user.userImage,
            isAdmin: false,
            isOwner: false
          });
          
          successCount++;
        } catch (error: any) {
          console.error(`Failed to add user ${user.username}:`, error);
          errors.push(`${user.username}: ${error.response?.data?.error || 'Unknown error'}`);
        }
      }
      
      if (successCount > 0) {
        setSuccess(`Added ${successCount} member${successCount > 1 ? 's' : ''} to the group`);
        setTimeout(() => setSuccess(null), 3000);
        
        // Update local members array immediately to reflect changes in UI
        const updatedMembers = [...(groupData.members || []), ...newlyAddedMembers];
        
        // Update the groupData with new members
        if (groupData.members) {
          groupData.members = updatedMembers;
        }
        
        // Force a re-render to show the updated members list
        setForceUpdate(prev => prev + 1);
        
        // Clear states
        setSelectedUsers([]);
        setSearchQuery('');
        setSearchResults([]);
        setShowAddMemberModal(false);
        
        // Update parent component
        onUpdate();
      } else {
        setError(errors.length > 0 ? 
          `Failed to add members: ${errors.slice(0, 2).join(', ')}${errors.length > 2 ? '...' : ''}` : 
          'Failed to add members to the group');
      }
    } catch (err: any) {
      console.error('Error adding members:', err);
      setError(err.response?.data?.message || 'Failed to add members');
      setTimeout(() => setError(null), 3000);
    } finally {
      setAddingMembers(false);
    }
  };

  if (!isOpen) return null;

  // Render confirmation modals
  if (showPromoteConfirm !== null || showDemoteConfirm !== null || showKickConfirm !== null || showEndConfirm || showLeaveConfirmation) {
    const modalContent = () => {
      if (showPromoteConfirm !== null) {
        const member = groupData.members?.find(m => m.id === showPromoteConfirm);
        return {
          title: 'Promote to Admin',
          message: `Are you sure you want to promote ${member?.username} to admin? They will have additional privileges in the group.`,
          icon: <Crown size={32} className={darkMode ? 'text-yellow-400' : 'text-yellow-500'} />,
          confirmText: 'Promote',
          onConfirm: () => handlePromoteMember(showPromoteConfirm),
          onCancel: () => setShowPromoteConfirm(null),
          confirmClass: darkMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-yellow-500 hover:bg-yellow-600'
        };
      }
      if (showDemoteConfirm !== null) {
        const member = groupData.members?.find(m => m.id === showDemoteConfirm);
        return {
          title: 'Demote Admin',
          message: `Are you sure you want to demote ${member?.username} from admin? They will lose their administrative privileges.`,
          icon: <Crown size={32} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />,
          confirmText: 'Demote',
          onConfirm: () => handleDemoteMember(showDemoteConfirm),
          onCancel: () => setShowDemoteConfirm(null),
          confirmClass: darkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-500 hover:bg-gray-600'
        };
      }
      if (showKickConfirm !== null) {
        const member = groupData.members?.find(m => m.id === showKickConfirm);
        return {
          title: 'Remove Member',
          message: `Are you sure you want to remove ${member?.username} from the group? This action cannot be undone.`,
          icon: <UserMinus size={32} className={darkMode ? 'text-red-400' : 'text-red-500'} />,
          confirmText: 'Remove',
          onConfirm: () => handleKickMember(showKickConfirm),
          onCancel: () => setShowKickConfirm(null),
          confirmClass: darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'
        };
      }
      if (showEndConfirm) {
        return {
          title: 'End Group Chat',
          message: 'Are you sure you want to end this group chat? This action is permanent and cannot be undone. All members will be removed and all group data will be deleted.',
          icon: <AlertOctagon size={32} className={darkMode ? 'text-red-400' : 'text-red-500'} />,
          confirmText: loading ? 'Processing...' : 'End Group Chat',
          onConfirm: handleEndGroupChat,
          onCancel: () => setShowEndConfirm(false),
          confirmClass: darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600',
          disabled: loading
        };
      }
      if (showLeaveConfirmation) {
        return {
          title: 'Leave Group Chat',
          message: isOwner ? 
            'Are you sure you want to leave this group chat? Since you are the owner, ownership will be transferred to another member.' : 
            'Are you sure you want to leave this group chat? You will no longer receive messages from this group.',
          icon: <LogOut size={32} className={darkMode ? 'text-red-400' : 'text-red-500'} />,
          confirmText: isLeaving ? 'Leaving...' : 'Leave Group',
          onConfirm: handleLeaveGroup,
          onCancel: () => setShowLeaveConfirmation(false),
          confirmClass: darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600',
          disabled: isLeaving
        };
      }
    };

    const content = modalContent();
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={() => content?.onCancel()}
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
              darkMode ? 'bg-gray-700' : 'bg-gray-100'
            } mb-4`}>
              {content?.icon}
            </div>
            <h3 className="text-xl font-bold mb-2">{content?.title}</h3>
            <p className={`text-center ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {content?.message}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={content?.onCancel}
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
              onClick={content?.onConfirm}
              className={`flex-1 py-2.5 rounded-lg font-medium text-white ${content?.confirmClass} ${
                content?.disabled ? 'opacity-60 cursor-not-allowed' : ''
              }`}
              disabled={content?.disabled || loading}
            >
              {loading ? 'Processing...' : content?.confirmText}
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
      ref={panelRef}
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

      {/* Status Messages */}
      {error && (
        <div className={`mx-4 my-3 p-3 rounded-lg flex items-center ${
          darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'
        }`}>
          <XCircle size={18} className="mr-2" />
          {error}
        </div>
      )}
      
      {success && (
        <div className={`mx-4 my-3 p-3 rounded-lg flex items-center ${
          darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-600'
        }`}>
          <CheckCircle size={18} className="mr-2" />
          {success}
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Group Profile */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            <div className={`w-24 h-24 rounded-full border-4 ${
              darkMode ? 'border-gray-800 bg-gray-700' : 'border-white bg-gray-100'
            } flex items-center justify-center overflow-hidden shadow-lg`}>
              {imageLoading ? (
                <div className="flex items-center justify-center w-full h-full">
                  <Loader size={32} className={`animate-spin ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
              ) : localGroupImage ? (
                <img 
                  src={localGroupImage}
                  alt={groupData.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users size={32} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
              )}
            </div>
            {/* Remove button - only visible to owner */}
            {isOwner && localGroupImage && !imageLoading && (
              <button
                onClick={handleRemoveImage}
                disabled={imageLoading}
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
            {/* Upload button - only visible to owner */}
            {isOwner && !imageLoading && (
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
                  onChange={handleImageUpload}
                  disabled={imageLoading}
                />
              </label>
            )}
          </div>
          
          <div className="mt-4 flex flex-col items-center w-full">
            {isEditingName ? (
              <div className="flex items-center w-full gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  maxLength={MAX_GROUP_NAME_LENGTH}
                  className={`px-2 py-1 rounded w-full ${
                    darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
                  } border ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}
                />
                <div className="flex flex-shrink-0">
                  <button
                    onClick={handleNameUpdate}
                    disabled={loading}
                    className={`p-1 rounded ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <CheckCircle size={18} className="text-green-500" />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingName(false);
                      setEditedName(groupData.name);
                    }}
                    className={`p-1 rounded ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <XCircle size={18} className="text-red-500" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full px-4 mb-2">
                <div className="flex items-center justify-center text-center">
                  <h3 className="text-xl font-bold break-all" style={{ wordBreak: 'break-word' }}>
                    {localGroupName}
                  </h3>
                  {/* Only owner can edit name */}
                  {isOwner && (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className={`p-1 rounded ml-2 flex-shrink-0 ${
                        darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                      title="Edit group name"
                    >
                      <Edit size={14} className={`${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Description Label */}
            <div className="flex items-center justify-between w-full mt-4 mb-1">
              <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Description
              </span>
              {/* Only owner can edit description */}
              {isOwner && !isEditingDesc && (
                <button
                  onClick={() => setIsEditingDesc(true)}
                  className={`p-1 rounded ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                  title="Edit description"
                >
                  <Edit size={14} className={`${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                </button>
              )}
            </div>

            {/* Description Content */}
            {isEditingDesc ? (
              <div className="w-full flex items-start gap-2">
                <textarea
                  value={editedDesc}
                  onChange={(e) => setEditedDesc(e.target.value)}
                  placeholder="Add a group description"
                  className={`w-full min-w-0 px-3 py-2 rounded ${
                    darkMode ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-400'
                  } border ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}
                  rows={3}
                  style={{
                    wordBreak: 'break-all',
                    overflowWrap: 'break-word'
                  }}
                />
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={handleDescUpdate}
                    disabled={loading}
                    className={`p-1.5 rounded ${
                      darkMode ? 'hover:bg-gray-700 bg-gray-800' : 'hover:bg-gray-100 bg-gray-50'
                    }`}
                    title="Save description"
                  >
                    <CheckCircle size={18} className="text-green-500" />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingDesc(false);
                      setEditedDesc(localGroupDesc || '');
                    }}
                    className={`p-1.5 rounded ${
                      darkMode ? 'hover:bg-gray-700 bg-gray-800' : 'hover:bg-gray-100 bg-gray-50'
                    }`}
                    title="Cancel"
                  >
                    <XCircle size={18} className="text-red-500" />
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className={`w-full rounded-lg ${
                  darkMode ? 'bg-gray-800/50' : 'bg-gray-50'
                } border ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                } p-3 overflow-hidden`}
              >
                {localGroupDesc !== undefined && localGroupDesc !== null && localGroupDesc.trim() !== '' ? (
                  <div 
                    className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} break-all`}
                    style={{
                      maxWidth: '100%',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {localGroupDesc}
                  </div>
                ) : (
                  <p className={`text-sm italic ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {isOwner ? 
                      'Add a group description...' : 
                      'No description'
                    }
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Created Date - Improved UI */}
          <div className="mt-4 mb-1 flex justify-center">
            <div className={`flex items-center space-x-2 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <Calendar size={15} className={`${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
              <span className="text-sm font-medium">Created on {createdDate}</span>
            </div>
          </div>
        </div>

        {/* Group Stats */}
        <div className={`rounded-lg border mt-3 py-3 px-4 ${
          darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
        }`}>
          <h3 className={`text-md font-semibold mb-2 ${
            darkMode ? 'text-gray-200' : 'text-gray-800'
          }`}>
            Group Statistics
          </h3>
          <div className="flex items-center mb-2">
            <Users size={18} className={`mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
              {groupData.members?.length || 0} members
            </span>
          </div>
          <div className="flex items-center">
            <MessageSquare size={18} className={`mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
              Messages are end-to-end encrypted
            </span>
          </div>
        </div>

        {/* Members Section with Add Member Button */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-semibold ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Members ({groupData.members?.length || 0})
            </h3>
            {/* Both owner and admin can add members */}
            {(isOwner || isAdmin) && !groupData.isEnded && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                className={`p-1.5 rounded-full ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-blue-400' 
                    : 'bg-gray-100 hover:bg-gray-200 text-blue-500'
                } transition-colors`}
                title="Add Members"
              >
                <Users size={18} />
              </button>
            )}
          </div>

          <div className={`rounded-lg border ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          } max-h-60 overflow-y-auto`}>
            {groupData.members?.map(member => (
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
                } mr-3 flex-shrink-0 flex items-center justify-center`}>
                  {member.userImage ? (
                    <img
                      src={member.userImage}
                      alt={member.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={16} className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate flex items-center space-x-2">
                    <span>{member.username}</span>
                    {member.isOwner && (
                      <Crown 
                        size={14} 
                        className={darkMode ? 'text-yellow-400' : 'text-yellow-500'}
                      />
                    )}
                    {member.id === user?.id && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                      }`}>
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    {member.isOwner && (
                      <span className={`text-xs ${
                        darkMode ? 'text-yellow-400/80' : 'text-yellow-600/80'
                      }`}>
                        Owner
                      </span>
                    )}
                    {member.isAdmin && !member.isOwner && (
                      <span className={`text-xs ${
                        darkMode ? 'text-blue-400/80' : 'text-blue-600/80'
                      }`}>
                        Admin
                      </span>
                    )}
                  </div>
                </div>
                {/* Action buttons - with appropriate permissions */}
                {!member.isOwner && member.id !== user?.id && (
                  <div className="flex items-center space-x-2">
                    {/* Only owner can promote/demote */}
                    {isOwner && (
                      member.isAdmin ? (
                        <button
                          onClick={() => setShowDemoteConfirm(member.id)}
                          className={`p-1.5 rounded-full ${
                            darkMode 
                              ? 'hover:bg-gray-700 text-gray-400' 
                              : 'hover:bg-gray-100 text-gray-500'
                          }`}
                          title="Demote from Admin"
                        >
                          <Crown size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowPromoteConfirm(member.id)}
                          className={`p-1.5 rounded-full ${
                            darkMode 
                              ? 'hover:bg-gray-700 text-yellow-400' 
                              : 'hover:bg-gray-100 text-yellow-500'
                          }`}
                          title="Promote to Admin"
                        >
                          <Crown size={16} />
                        </button>
                      )
                    )}
                    {/* Both owner and admin can remove members */}
                    {(isOwner || isAdmin) && (
                      <button
                        onClick={() => setShowKickConfirm(member.id)}
                        className={`p-1.5 rounded-full ${
                          darkMode 
                            ? 'hover:bg-gray-700 text-red-400' 
                            : 'hover:bg-gray-100 text-red-500'
                        }`}
                        title="Remove from Group"
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Buttons */}
        {!groupData.isEnded && (
          <div className="mt-6 space-y-3">
            {/* All members can leave */}
            <button
              onClick={() => setShowLeaveConfirmation(true)}
              className={`w-full py-2.5 rounded-lg ${
                darkMode 
                  ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30' 
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              } transition-colors font-medium`}
            >
              <LogOut size={16} className="mr-2 inline" />
              Leave Group
            </button>
            {/* Only owner can end the group chat */}
            {isOwner && (
              <button
                onClick={() => setShowEndConfirm(true)}
                className={`w-full py-2.5 rounded-lg ${
                  darkMode 
                    ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30' 
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                } transition-colors font-medium`}
              >
                <AlertOctagon size={16} className="mr-2 inline" />
                End Group Chat
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Member Modal - Available to both owner and admin */}
      <AnimatePresence>
        {showAddMemberModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowAddMemberModal(false);
              setSearchQuery('');
              setSearchResults([]);
              setSelectedUsers([]);
            }}
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
              {/* Header - Updated to match CreateGroupChat style */}
              <div className={`px-5 py-4 border-b flex items-center justify-between ${
                darkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <h3 className="text-lg font-semibold flex items-center">
                  <Users className="mr-2" size={20} />
                  Add Group Members
                </h3>
                <button
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setSearchQuery('');
                    setSearchResults([]);
                    setSelectedUsers([]);
                  }}
                  className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-5 space-y-4">
                {/* Error message */}
                {error && (
                  <div className={`p-3 rounded-lg ${
                    darkMode ? 'bg-red-900/30 text-red-200' : 'bg-red-100 text-red-700'
                  }`}>
                    {error}
                  </div>
                )}
                
                {/* Search input */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Add Members ({selectedUsers.length}/8)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
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
                </div>
                
                {/* Search results */}
                {searchQuery.trim() && (
                  <div className={`rounded-lg border overflow-hidden max-h-48 overflow-y-auto ${
                    darkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    {searchLoading ? (
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
                          onClick={() => toggleUserSelection(user)}
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
                          <span className="ml-3 flex-1">{highlightMatch(user.username, searchQuery)}</span>
                          {user.isSelected ? (
                            <CheckCircle size={18} className="text-blue-500" />
                          ) : (
                            <Plus size={18} className="text-blue-500" />
                          )}
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
                          darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-800'
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
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleUserSelection(selectedUser);
                          }}
                          className="hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className={`px-5 py-4 border-t ${
                darkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowAddMemberModal(false);
                      setSearchQuery('');
                      setSearchResults([]);
                      setSelectedUsers([]);
                    }}
                    className={`px-4 py-2 rounded-lg ${
                      darkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    } transition-colors`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMembers}
                    disabled={addingMembers || selectedUsers.length === 0}
                    className={`px-4 py-2 rounded-lg flex items-center ${
                      darkMode 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    } transition-colors ${
                      (addingMembers || selectedUsers.length === 0) 
                        ? 'opacity-50 cursor-not-allowed' 
                        : ''
                    }`}
                  >
                    {addingMembers ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                        Adding...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} className="mr-1" />
                        Add Members
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default GroupChatInfoPanel; 