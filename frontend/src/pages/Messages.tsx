import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Send, User, UserPlus, Users, MoreVertical, Edit2, Trash2, Info, X, Crown, 
  AlertTriangle, AlertOctagon, LogOut, ArrowLeft, Camera, Paperclip, Smile, 
  ChevronLeft, Edit, Plus, Menu, Settings
} from 'lucide-react';
import DarkModeToggle from '../components/DarkModeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../utils/axios';
import { useNavigate, Link } from 'react-router-dom';
import CreateGroupChat from '../components/CreateGroupChat';
import UserChatInfoPanel from '../components/UserChatInfoPanel';
import GroupChatInfoEdit from '../components/GroupChatInfoPanel';

interface Conversation {
  otherUserId: number;
  otherUsername: string;
  otherUserImage: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface GroupChat {
  id: number;
  name: string;
  image: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isEnded?: boolean;
  members: Array<{
    id: number;
    username: string;
    userImage: string | null;
    isAdmin: boolean;
    isOwner: boolean;
  }>;
}

// Add new type to track message category
type MessageCategory = 'direct' | 'group';

interface Message {
  id: number;
  content: string;
  senderId: number;
  receiverId: number;
  sender: {
    id: number;
    username: string;
    userImage: string | null;
  };
  createdAt: string;
  updatedAt: string;
  read: boolean;
  isEdited: boolean;
  deletedForSender: boolean;
  deletedForReceiver: boolean;
  replyToId?: number;
  replyTo?: {
    id: number;
    content: string;
    sender: {
      id: number;
      username: string;
      userImage: string | null;
    };
  };
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  mediaEncrypted?: boolean;
  isSystem?: boolean; // Add isSystem flag for system messages
  sharedPostId?: number; // Add sharedPostId for shared posts
}

interface UpdatedMessage {
  id: number;
  content: string;
  senderId: number;
  receiverId: number;
  read: boolean;
  createdAt: string;
  sender: {
    id: number;
    username: string;
    userImage: string | null;
  };
}

interface SearchUser {
  id: number;
  username: string;
  userImage: string | null;
}

interface SuggestedUser {
  id: number;
  username: string;
  userImage: string | null;
  type: 'mutual' | 'pending';  // mutual = follows each other, pending = follow request sent
}

interface FollowData {
  followers: Array<{
    id: number;
    username: string;
    userImage: string | null;
  }>;
  following: Array<{
    id: number;
    username: string;
    userImage: string | null;
  }>;
}

// Add new interfaces for message options
type MessageOptions = {
  messageId: number | null;
  position: { x: number; y: number } | null;
  isSender: boolean;
} | null;

interface MessageInfo {
  id: number;
  sent: string;
  delivered: string;
  read: boolean;
  readAt: string | null;
  sender: {
    id: number;
    username: string;
    userImage: string | null;
  };
}

// Add info panel interface
interface ChatInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  chatType: 'direct' | 'group';
  chatData: {
    id: number;
    name: string;
    image: string | null;
    createdAt: string;
    // For direct messages
    username?: string;
    // For group chats
    description?: string;
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
}

// API response interface for conversations
interface ConversationResponse {
  id: number;
  otherUser: {
    id: number;
    username: string;
    userImage: string | null;
  };
  lastMessage: string | null;
  lastMessageTime?: string;
  unreadCount: number;
}

// API response interface for group chats
interface GroupChatResponse {
  id: number;
  name: string;
  description: string;
  groupImage: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId: number;
  unreadCount?: number;
  members: Array<{
    id: number;
    username: string;
    userImage: string | null;
    isAdmin: boolean;
    isOwner: boolean;
  }>;
  latestMessage?: {
    id: number;
    content: string;
    senderId: number;
    senderName: string;
    isSystem: boolean;
    createdAt: string;
  };
}

const Messages: React.FC = () => {
  const { darkMode } = useDarkMode();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [messageCategory, setMessageCategory] = useState<MessageCategory>('direct');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [messageOptions, setMessageOptions] = useState<MessageOptions>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: number; content: string } | null>(null);
  const [messageInfo, setMessageInfo] = useState<MessageInfo | null>(null);
  const [showError, setShowError] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    messageId: number | null;
    isSender: boolean;
    deleteOption: 'me' | 'all';
  } | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [visibleMessages, setVisibleMessages] = useState<Set<number>>(new Set());
  const [hasScrolledToFirstUnread, setHasScrolledToFirstUnread] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    id: number;
    content: string;
    sender: {
      id: number;
      username: string;
      userImage: string | null;
    };
  } | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Add state for the chat info panel
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [chatInfoData, setChatInfoData] = useState<ChatInfoPanelProps['chatData'] | null>(null);
  const [showGroupChatModal, setShowGroupChatModal] = useState(false);
  const [followingIds, setFollowingIds] = useState<number[]>([]);
  const [followLoading, setFollowLoading] = useState<number[]>([]);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data } = await axiosInstance.get<ConversationResponse[]>('/api/messages/conversations');
        console.log('Conversations:', data);
        
        // Map API response to client format
        const mappedConversations: Conversation[] = data.map(conv => ({
          otherUserId: conv.otherUser.id,
          otherUsername: conv.otherUser.username,
          otherUserImage: conv.otherUser.userImage,
          lastMessage: conv.lastMessage || 'No messages yet',
          lastMessageTime: conv.lastMessageTime || new Date().toISOString(),
          unreadCount: conv.unreadCount
        }));
        
        setConversations(mappedConversations);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        handleError('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  // Fetch messages for selected chat
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChat) {
        // Clear messages when no chat is selected
        setMessages([]);
        return;
      }

      try {
        if (messageCategory === 'direct') {
          // Fetch direct messages
          const { data } = await axiosInstance.get<Message[]>(`/api/messages/conversation/${selectedChat}`, {
            params: {
              includeReplies: true
            }
          });
          console.log('Direct messages:', data);
          setMessages(data);
        } else if (messageCategory === 'group') {
          // Fetch group messages
          try {
            // Verify this group chat exists in our list before fetching
            const groupExists = groupChats.some(group => group.id === selectedChat);
            if (!groupExists) {
              console.log(`Group ${selectedChat} not found in current group list, aborting fetch`);
              setMessages([]);
              return;
            }
            
            const { data } = await axiosInstance.get<Message[]>(`/api/group-messages/${selectedChat}`);
            console.log('Group messages:', data);
            setMessages(data);
          } catch (error: any) {
            if (error.response && error.response.status === 403) {
              // User is not a member of this group - handle gracefully
              console.log('User is not a member of this group.');
              handleError('You are not a member of this group chat.');
              
              // Remove this group from the list if we get a 403
              setGroupChats(prev => prev.filter(group => group.id !== selectedChat));
              setSelectedChat(null);
              
              // Don't automatically switch to direct message category
              // setMessageCategory('direct');
              
              return; // Stop further processing
            } else {
              console.error('Error fetching group messages:', error);
              handleError('Failed to load group chat messages. Please try again.');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
        handleError('Failed to load messages');
      }
    };

    // Reset messages when category changes but selectedChat is null
    if (!selectedChat) {
      setMessages([]);
      return;
    }
    
    fetchMessages();
  }, [selectedChat, messageCategory, groupChats]);

  // Fetch suggested users (top 3 most active mutuals)
  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      setLoadingSuggestions(true);
      console.log('Starting to fetch suggested users...');
      try {
        // Get current user's follows data
        console.log('Fetching follow data...');
        const { data: followData } = await axiosInstance.get<FollowData>('/api/users/follows');
        console.log('Follow data:', followData);
        
        // Initialize arrays with default empty arrays in case they're undefined
        const following = followData?.following || [];
        const followers = followData?.followers || [];
        
        // Save following IDs for later use
        setFollowingIds(following.map(f => f.id));
        
        // Filter users to show
        const mutualUsers = followers
          .filter(user => following.some(f => f.id === user.id))
          .map(user => ({
            id: user.id,
            username: user.username,
            userImage: user.userImage,
            type: 'mutual' as const
          }));
        
        // Add users that current user follows but don't follow back
        const pendingUsers = following
          .filter(user => !followers.some(f => f.id === user.id))
          .map(user => ({
            id: user.id,
            username: user.username,
            userImage: user.userImage,
            type: 'pending' as const
          }));
        
        // Combine and take first 5
        const combined = [...mutualUsers, ...pendingUsers];
        console.log('Suggested users created:', combined);
        setSuggestedUsers(combined.slice(0, 5));
        
      } catch (error) {
        console.error('Error fetching suggested users:', error);
        setSuggestedUsers([]);
        setFollowingIds([]); // Initialize with empty array on error
      } finally {
        setLoadingSuggestions(false);
      }
    };

    fetchSuggestedUsers();
  }, []);

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data } = await axiosInstance.get<SearchUser[]>(`/api/users/search?query=${encodeURIComponent(searchQuery)}`);
        // Filter out current user to prevent self-messaging
        const filteredResults = data.filter(searchedUser => searchedUser.id !== user?.id);
        setSearchResults(filteredResults);
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, user?.id]);

  // Function to mark messages as read
  const markMessagesAsRead = async (messageIds: number[]) => {
    if (!messageIds.length) return;
    
    try {
      await axiosInstance.post('/api/messages/read', {
        messageIds
      });
      
      // Update local message state
      setMessages(prev => prev.map(msg => 
        messageIds.includes(msg.id) ? { ...msg, read: true } : msg
      ));
      
      // Update conversations unread count
      setConversations(prev => prev.map(conv => 
        conv.otherUserId === selectedChat 
          ? { ...conv, unreadCount: Math.max(0, conv.unreadCount - messageIds.length) }
          : conv
      ));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Update the scroll to first unread message effect
  useEffect(() => {
    if (selectedChat && messages.length > 0 && !hasScrolledToFirstUnread) {
      // Find first unread message where current user is receiver
      const firstUnread = messages.filter(msg => !msg.read && msg.receiverId === user?.id)[0];
      const conversation = conversations.find(conv => conv.otherUserId === selectedChat);
      
      if (firstUnread) {
        // Add a small delay to ensure the message container is rendered
        setTimeout(() => {
          const element = document.getElementById(`message-${firstUnread.id}`);
          if (element) {
            element.scrollIntoView({ 
              behavior: "auto", 
              block: "start"
            });
            // Highlight the unread message briefly
            element.classList.add('bg-blue-500/10', 'dark:bg-blue-500/5');
            setTimeout(() => {
              element.classList.remove('bg-blue-500/10', 'dark:bg-blue-500/5');
            }, 2000);
            setHasScrolledToFirstUnread(true);
          }
        }, 100);
      } else {
        // If no unread messages, scroll to the most recent message
        setTimeout(() => {
          const container = messageContainerRef.current;
          if (container) {
            container.scrollTop = container.scrollHeight;
            setHasScrolledToFirstUnread(true);
          }
        }, 100);
      }
    }
  }, [selectedChat, messages, user?.id, hasScrolledToFirstUnread, conversations]);

  // Reset hasScrolledToFirstUnread when changing chats
  useEffect(() => {
    setHasScrolledToFirstUnread(false);
  }, [selectedChat]);

  // Add function to handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      handleError('Only images and videos are supported');
      return;
    }
    
    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      handleError('File size must be less than 10MB');
      return;
    }
    
    setMediaFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Function to cancel media upload
  const cancelMediaUpload = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Modify the handleSendMessage function to correctly send direct messages
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !mediaFile) || !selectedChat) return;

    const shouldScrollToBottom = messageContainerRef.current && 
      (messageContainerRef.current.scrollHeight - messageContainerRef.current.scrollTop - messageContainerRef.current.clientHeight < 100);

    try {
      setIsUploading(mediaFile != null);
      
      // If we have a media file, upload it first
      let mediaUrl = null;
      let mediaType = null;
      
      if (mediaFile) {
        const formData = new FormData();
        formData.append('media', mediaFile);
        
        // Use different endpoints for media upload based on message category
        let mediaUploadEndpoint = '/api/messages/upload-media';
        if (messageCategory === 'group') {
          mediaUploadEndpoint = '/api/group-messages/upload-media';
        }
        
        const { data: mediaData } = await axiosInstance.post<{
          url: string;
          type: 'image' | 'video';
          filename: string;
          originalName: string;
        }>(mediaUploadEndpoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        mediaUrl = mediaData.url;
        mediaType = mediaData.type;
      }

      // Include complete reply information and media info in the request
      const messageData: any = {
        replyToId: replyingTo?.id // Send the ID of the message being replied to
      };
      
      // Add content if it exists
      if (message.trim()) {
        messageData.content = message.trim();
      }
      
      // Add media info if it exists
      if (mediaUrl) {
        messageData.mediaUrl = mediaUrl;
        messageData.mediaType = mediaType;
      }

      let newMessage;

      console.log('Sending message:', messageCategory === 'direct' ? 'Direct Message' : 'Group Message');
      console.log('Message data:', messageData);
      console.log('Selected chat ID:', selectedChat);

      // Use different endpoints based on message category
      if (messageCategory === 'direct') {
        // For direct messages - Use the correct endpoint: /api/messages/direct/:userId
        console.log(`Sending direct message to user ID: ${selectedChat}`);
        
        try {
          const { data } = await axiosInstance.post<Message>(`/api/messages/direct/${selectedChat}`, messageData);
          newMessage = data;
          console.log('Message sent successfully:', data);
        } catch (error: any) {
          console.error('Error details:', error.response?.data);
          throw error;
        }
      } else {
        // For group messages
        const { data } = await axiosInstance.post<Message>(`/api/group-messages/${selectedChat}/send`, messageData);
        newMessage = data;
      }

      // Update messages with the new message
      setMessages(prev => [...prev, newMessage]);
      
      // Update the conversations list or group chat based on message category
      if (messageCategory === 'direct') {
        // Update direct message conversations
        setConversations(prev => {
          const updatedConversations = [...prev];
          const conversationIndex = updatedConversations.findIndex(
            conv => conv.otherUserId === selectedChat
          );
          
          if (conversationIndex !== -1) {
            // Create a descriptive last message depending on content type
            let lastMessageText = message.trim();
            if (!lastMessageText && mediaType) {
              lastMessageText = mediaType === 'image' ? '📷 Sent an image' : '📹 Sent a video';
            }
            
            updatedConversations[conversationIndex] = {
              ...updatedConversations[conversationIndex],
              lastMessage: lastMessageText,
              lastMessageTime: new Date().toISOString(),
            };
            // Move the conversation to the top
            const [conversation] = updatedConversations.splice(conversationIndex, 1);
            updatedConversations.unshift(conversation);
          }
          
          return updatedConversations;
        });
        
        // Persist the update to the server to make it available after refresh
        try {
          const messageContent = message.trim() || (mediaType === 'image' ? '📷 Sent an image' : '📹 Sent a video');
          
          // Include senderId in the update request to help the server
          // create a proper message that will show up in latestMessage
          await axiosInstance.post(`/api/group-chats/${selectedChat}/update-last-message`, {
            content: messageContent,
            senderId: user?.id,
            timestamp: new Date().toISOString()
          });
          
          // Schedule two refreshes for the group chats - one immediate and one delayed
          // to ensure the server has time to process everything
          console.log("Scheduling group chat refresh after sending message");
          
          // Immediate refresh to update the UI right away
          fetchGroupChats();
          
          // Delayed refresh to ensure server changes are reflected
          setTimeout(() => {
            console.log("Executing delayed group chat refresh");
            fetchGroupChats();
          }, 2000); // Longer delay to ensure server has processed everything
        } catch (error) {
          console.error('Failed to update last message on server:', error);
        }
      } else {
        // Update group chat conversations
        setGroupChats(prev => {
          const updatedGroupChats = [...prev];
          const groupChatIndex = updatedGroupChats.findIndex(
            group => group.id === selectedChat
          );
          
          if (groupChatIndex !== -1) {
            // Create a descriptive last message depending on content type
            let lastMessageText = message.trim();
            if (!lastMessageText && mediaType) {
              lastMessageText = mediaType === 'image' ? '📷 Sent an image' : '📹 Sent a video';
            }
            
            updatedGroupChats[groupChatIndex] = {
              ...updatedGroupChats[groupChatIndex],
              lastMessage: lastMessageText,
              lastMessageTime: new Date().toISOString(),
              unreadCount: 0 // Reset unread count since we're the sender
            };
            
            // Move this group chat to the top (most recent)
            const [groupChat] = updatedGroupChats.splice(groupChatIndex, 1);
            updatedGroupChats.unshift(groupChat);
          }
          
          return updatedGroupChats;
        });
        
        // Persist the update to the server to make it available after refresh
        try {
          const messageContent = message.trim() || (mediaType === 'image' ? '📷 Sent an image' : '📹 Sent a video');
          
          console.log(`Sending update-last-message request to server for group ${selectedChat}`);
          console.log('  Content:', messageContent);
          console.log('  Sender ID:', user?.id);
          
          // Include senderId in the update request to help the server
          // create a proper message that will show up in latestMessage
          await axiosInstance.post(`/api/group-chats/${selectedChat}/update-last-message`, {
            content: messageContent,
            senderId: user?.id,
            timestamp: new Date().toISOString()
          });
          
          // Schedule two refreshes for the group chats - one immediate and one delayed
          // to ensure the server has time to process everything
          console.log("Scheduling group chat refresh after sending message");
          
          // Immediate refresh to update the UI right away
          console.log("Executing immediate group chat refresh");
          fetchGroupChats();
          
          // Delayed refresh to ensure server changes are reflected
          setTimeout(() => {
            console.log("Executing delayed group chat refresh");
            fetchGroupChats();
          }, 2000); // Longer delay to ensure server has processed everything
        } catch (error) {
          console.error('Failed to update last message on server:', error);
        }
      }
      
      setMessage('');
      setReplyingTo(null);
      setMediaFile(null);
      setMediaPreview(null);
      setIsUploading(false);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Only scroll to bottom if we were already near the bottom
      if (shouldScrollToBottom) {
        requestAnimationFrame(() => {
          const container = messageContainerRef.current;
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
      handleError('Failed to send message. Please try again.');
      setIsUploading(false);
    }
  };

  // Update the intersection observer setup
  useEffect(() => {
    if (!selectedChat || !user?.id) return;

    const options = {
      root: messageContainerRef.current,
      threshold: 0.8, // Message must be 80% visible to be marked as read
      rootMargin: '0px' // Only mark messages as read when they're in the viewport
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      const messagesToMark: number[] = [];

      entries.forEach(entry => {
        const messageId = parseInt(entry.target.id.replace('message-', ''));
        const message = messages.find(m => m.id === messageId);

        // Only mark messages as read if they're:
        // 1. Currently visible (intersecting)
        // 2. From the other user (receiverId matches current user)
        // 3. Not already read
        if (entry.isIntersecting && message && 
            message.receiverId === user.id && 
            !message.read) {
          messagesToMark.push(messageId);
        }
      });

      if (messagesToMark.length > 0) {
        markMessagesAsRead(messagesToMark);
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersection, options);

    // Only observe unread messages where the current user is the receiver
    const unreadMessages = document.querySelectorAll('[id^="message-"]');
    unreadMessages.forEach(element => {
      const messageId = parseInt(element.id.replace('message-', ''));
      const message = messages.find(m => m.id === messageId);
      if (message && message.receiverId === user.id && !message.read) {
        observerRef.current?.observe(element);
      }
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [selectedChat, messages, user?.id]);

  // Clean up observer when component unmounts
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Fix the startConversation function
  const startConversation = async (userId: number) => {
    try {
      // Check if conversation already exists
      const existingConversation = conversations.find(
        (conv) => conv.otherUserId === userId
      );

      if (existingConversation) {
        // If it exists, just select it
        handleSelectChat(userId, 'direct');
        setSearchQuery('');
        setSearchResults([]);
        return;
      }

      // First, create conversation
      const { data: conversationData } = await axiosInstance.post<Conversation>('/api/messages/conversations', {
        userId
      });
      
      // Create a new conversation locally
      const newConversation: Conversation = {
        otherUserId: userId,
        otherUsername: conversationData.otherUsername,
        otherUserImage: conversationData.otherUserImage,
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0
      };
      
      // Add the conversation to state
      setConversations(prev => [newConversation, ...prev]);
      
      // Send initial greeting message
      const messageContent = "👋 Hello!";
      await axiosInstance.post('/api/messages/send', {
        content: messageContent,
        receiverId: userId
      });
      
      // Update conversation with greeting message
      setConversations(prev => prev.map(conv => 
        conv.otherUserId === userId ? {
          ...conv,
        lastMessage: messageContent,
          lastMessageTime: new Date().toISOString()
        } : conv
      ));
      
      // Fetch messages to include the greeting
      if (selectedChat === userId) {
        const { data: messagesData } = await axiosInstance.get<Message[]>(`/api/messages/conversations/${userId}`);
        setMessages(messagesData);
      }
      
      // Select the new chat
      handleSelectChat(userId, 'direct');
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error starting conversation:', error);
      handleError('Failed to start conversation. Please try again.');
    }
  };

  // Update the handleMessageOptions function
  const handleMessageOptions = (e: React.MouseEvent, messageId: number) => {
    e.preventDefault();
    e.stopPropagation();
    const position = {
      x: e.clientX,
      y: e.clientY
    };

    const menuWidth = 200;
    const menuHeight = 144;
    
    if (position.x + menuWidth > window.innerWidth) {
      position.x = window.innerWidth - menuWidth - 16;
    }
    
    if (position.y + menuHeight > window.innerHeight) {
      position.y = window.innerHeight - menuHeight - 16;
    }

    setMessageOptions({
      messageId,
      position,
      isSender: false
    });
  };

  const handleEditMessage = async (messageId: number) => {
    const message = messages.find(msg => msg.id === messageId);
    if (!message) return;
    
    // Check if message is within 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const messageDate = new Date(message.createdAt);
    
    if (messageDate < fifteenMinutesAgo) {
      handleError('Messages can only be edited within 15 minutes of sending');
      return;
    }
    
    setEditingMessage({ id: messageId, content: message.content });
    setMessageOptions(null);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage) return;
    
    try {
      // Check if message is still within 15 minutes
      const message = messages.find(msg => msg.id === editingMessage.id);
      if (!message) return;
      
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const messageDate = new Date(message.createdAt);
      
      if (messageDate < fifteenMinutesAgo) {
        handleError('Messages can only be edited within 15 minutes of sending');
        setEditingMessage(null);
        return;
      }

      const { data } = await axiosInstance.put<UpdatedMessage>(`/api/messages/${editingMessage.id}`, {
        content: editingMessage.content
      });
      
      setMessages(prev => prev.map(msg => 
        msg.id === editingMessage.id ? { ...msg, content: data.content, isEdited: true } : msg
      ));
      
      // Update conversations list if it was the last message
      setConversations(prev => prev.map(conv => {
        if (conv.otherUserId === selectedChat) {
          return {
            ...conv,
            lastMessage: data.content,
            lastMessageTime: new Date().toISOString()
          };
        }
        return conv;
      }));
      
      setEditingMessage(null);
      setError(null);
    } catch (error: any) {
      console.error('Error updating message:', error);
      if (error.response?.status === 403) {
        handleError('Messages can only be edited within 15 minutes of sending');
      } else {
        handleError('Failed to update message');
      }
    }
  };

  const handleDeleteMessage = async (messageId: number, deleteFor: 'me' | 'all') => {
    try {
      await axiosInstance.delete(`/api/messages/${messageId}${deleteFor === 'all' ? '?deleteFor=all' : ''}`);
      
      // Remove the message from the messages list
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      // Update conversations list if it was the last message
      setConversations(prev => prev.map(conv => {
        if (conv.otherUserId === selectedChat) {
          const lastMessage = messages
            .filter(msg => msg.id !== messageId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
          
          return {
            ...conv,
            lastMessage: lastMessage?.content || '',
            lastMessageTime: lastMessage?.createdAt || conv.lastMessageTime
          };
        }
        return conv;
      }));
      
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      handleError('Failed to delete message');
    }
  };

  const handleMessageInfo = async (messageId: number) => {
    try {
      const { data } = await axiosInstance.get<MessageInfo>(`/api/messages/${messageId}/info`);
      setMessageInfo(data);
      setMessageOptions(null);
    } catch (error) {
      handleError('Failed to fetch message info');
    }
  };

  // Add close message info modal function
  const closeMessageInfo = () => {
    setMessageInfo(null);
  };

  // Function to handle errors consistently
  const handleError = (errorMessage: string, duration = 3000) => {
    // Clear any existing timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    
    setError(errorMessage);
    setShowError(true);
    
    // Auto-hide error after duration
    errorTimeoutRef.current = setTimeout(() => {
      setShowError(false);
      errorTimeoutRef.current = null;
    }, duration);
  };

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (messageOptions && messageOptions.messageId && messageOptions.position) {
        const target = event.target as HTMLElement;
        if (!target.closest('.message-options')) {
          setMessageOptions(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [messageOptions]);

  // Update the message list rendering in the sidebar
  const renderMessagePreview = (message: string, mediaType?: 'image' | 'video') => {
    // Check if this is a shared post message
    if (message && message.startsWith('Shared a post by @')) {
      // Extract the username if possible
      const usernameMatch = message.match(/Shared a post by @(\w+)/);
      if (usernameMatch && usernameMatch[1]) {
        return `Sent a post by @${usernameMatch[1]}`;
      }
      return 'Sent a post';
    }
    
    if (mediaType === 'image') {
      return 'Sent an image';
    } else if (mediaType === 'video') {
      return 'Sent a video';
    }
    
    if (!message) return '';
    return message.length > 30 ? `${message.substring(0, 30)}...` : message;
  };

  // Update the message rendering to include a blue vertical line for replies
  const renderMessage = (msg: Message) => {
    // Get the original message for the reply
    const originalMessage = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;
    
    // If it's a system message, render it differently
    if (msg.isSystem) {
      return (
        <motion.div
          key={msg.id}
          id={`message-${msg.id}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex justify-center w-full my-2"
        >
          <div className={`px-4 py-1.5 rounded-full text-xs font-medium inline-flex items-center ${
            darkMode 
              ? 'bg-gray-800 text-gray-300 border border-gray-700' 
              : 'bg-gray-100 text-gray-600 border border-gray-200'
          }`}>
            <span className="mx-1">{msg.content}</span>
          </div>
        </motion.div>
      );
    }
    
    return (
      <motion.div
        key={msg.id}
        id={`message-${msg.id}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className={`flex ${msg.sender.id === user?.id ? 'justify-end' : 'justify-start'} group w-full`}
      >
        <div className={`flex items-end space-x-2 ${msg.sender.id === user?.id ? 'max-w-[65%]' : 'max-w-[70%]'}`}>
          {msg.sender.id !== user?.id && (
            <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mb-1 ${
              darkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              {msg.sender.userImage ? (
                <img
                  src={msg.sender.userImage.startsWith('http') ? msg.sender.userImage : `https://localhost:3000${msg.sender.userImage}`}
                  alt={msg.sender.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className={darkMode ? 'text-gray-400' : 'text-gray-500'} size={16} />
                </div>
              )}
            </div>
          )}
          <div className="flex flex-col space-y-1 relative group min-w-[60px] max-w-full">
            {/* Reply preview - Show if this message is a reply to another */}
            {originalMessage && (
              <div 
                className={`flex items-center space-x-2 pl-3 py-1.5 pr-4 rounded-lg mb-1 cursor-pointer relative border-l-2 border-blue-500 ${
                  darkMode 
                    ? 'bg-gray-800/50 hover:bg-gray-800/70' 
                    : 'bg-gray-100/80 hover:bg-gray-200/80'
                }`}
                onClick={() => {
                  const element = document.getElementById(`message-${originalMessage.id}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('bg-blue-500/10', 'dark:bg-blue-500/5');
                    setTimeout(() => {
                      element.classList.remove('bg-blue-500/10', 'dark:bg-blue-500/5');
                    }, 2000);
                  }
                }}
              >
                <div className={`w-4 h-4 rounded-full overflow-hidden flex-shrink-0 ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  {originalMessage.sender.userImage ? (
                    <img
                      src={originalMessage.sender.userImage.startsWith('http') 
                        ? originalMessage.sender.userImage 
                        : `https://localhost:3000${originalMessage.sender.userImage}`}
                      alt={originalMessage.sender.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className={darkMode ? 'text-gray-500' : 'text-gray-400'} size={10} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {originalMessage.sender.username}
                  </span>
                  <p className={`text-xs truncate ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {originalMessage.content}
                  </p>
                </div>
              </div>
            )}
            
            <div
              onContextMenu={(e) => {
                e.preventDefault();
                handleMessageOptions(e, msg.id);
              }}
              className={`rounded-2xl px-4 py-2 break-words relative shadow-sm hover:shadow-md transition-shadow duration-200 group ${
                msg.sender.id === user?.id
                  ? `${darkMode ? 'bg-[rgb(37,99,235)] hover:bg-[rgb(29,78,216)]' : 'bg-[rgb(59,130,246)] hover:bg-[rgb(37,99,235)]'} text-white rounded-br-none`
                  : darkMode
                  ? 'bg-[rgb(31,41,55)] hover:bg-[rgb(55,65,81)] rounded-bl-none'
                  : 'bg-[rgb(229,231,235)] hover:bg-[rgb(209,213,219)] rounded-bl-none'
              } ${msg.content === '[Encrypted Message]' ? 'italic opacity-75' : ''}`}
            >
              <div className={`absolute ${msg.sender.id === user?.id ? '-left-8' : '-right-8'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <button
                  onClick={(e) => handleMessageOptions(e, msg.id)}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors duration-200"
                >
                  <MoreVertical size={16} />
                </button>
              </div>
              <div className="relative">
                {editingMessage?.id === msg.id ? (
                  <div className="flex flex-col space-y-2">
                    <textarea
                      value={editingMessage.content}
                      onChange={(e) => setEditingMessage({ ...editingMessage, content: e.target.value })}
                      className={`w-full p-2 rounded bg-transparent border ${
                        darkMode ? 'border-gray-600 focus:border-gray-500' : 'border-gray-300 focus:border-gray-400'
                      } focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none`}
                      rows={2}
                      autoFocus
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingMessage(null)}
                        className="px-2 py-1 text-xs rounded hover:bg-gray-700/20"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-2 py-1 text-xs font-semibold rounded bg-blue-500/20 hover:bg-blue-500/30"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Check if this is a shared post message */}
                    {msg.content && msg.content.startsWith('Shared a post by @') ? (
                      <SharedPostPreview message={msg} darkMode={darkMode} />
                    ) : (
                      <>
                        {/* Media content */}
                        {msg.mediaUrl && (
                          <div className="mb-2 max-w-full overflow-hidden rounded-lg">
                            {msg.mediaType === 'image' ? (
                              <img 
                                src={msg.mediaUrl.startsWith('http') ? msg.mediaUrl : `https://localhost:3000${msg.mediaUrl}`}
                                alt="Image message"
                                className="max-w-full h-auto rounded-lg object-contain max-h-[300px]"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const parent = (e.target as HTMLImageElement).parentElement;
                                  if (parent) {
                                    const errorDiv = document.createElement('div');
                                    errorDiv.className = 'p-2 text-center text-sm text-red-500';
                                    errorDiv.innerText = 'Failed to load image';
                                    parent.appendChild(errorDiv);
                                  }
                                }}
                              />
                            ) : msg.mediaType === 'video' ? (
                              <video 
                                controls
                                className="max-w-full h-auto rounded-lg max-h-[300px]"
                                preload="metadata"
                              >
                                <source src={msg.mediaUrl.startsWith('http') ? msg.mediaUrl : `https://localhost:3000${msg.mediaUrl}`} />
                                Your browser does not support video playback.
                              </video>
                            ) : null}
                          </div>
                        )}
                        
                        {/* Text content */}
                        {msg.content && (
                          <p className="whitespace-pre-wrap text-[15px] break-words leading-relaxed"
                             style={{ 
                               overflowWrap: 'break-word',
                               wordBreak: 'break-word',
                               hyphens: 'auto',
                               minWidth: '60px'
                             }}
                          >
                            {msg.content}
                          </p>
                        )}
                      </>
                    )}
                    
                    <div className={`flex items-center justify-end mt-1 space-x-1.5 text-[11px] ${
                      msg.sender.id === user?.id 
                        ? 'text-white/70' 
                        : darkMode 
                          ? 'text-gray-400' 
                          : 'text-gray-500'
                    }`}>
                      {msg.isEdited && (
                        <span className="italic">(edited)</span>
                      )}
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                      })}</span>
                      {msg.sender.id === user?.id && (
                        <span className="flex items-center">
                          {msg.read ? (
                            <svg viewBox="0 0 16 15" fill="currentColor" className="w-4 h-4">
                              <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                            </svg>
                          ) : (
                            <svg viewBox="0 0 16 15" fill="currentColor" className="w-4 h-4">
                              <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Update message options menu to include reply option
  const handleReplyToMessage = (messageId: number) => {
    const message = messages.find(msg => msg.id === messageId);
    if (message) {
      console.log('Set replying to message:', message.id, message.content);
      setReplyingTo({
        id: message.id,
        content: message.content,
        sender: message.sender
      });
      setMessageOptions(null);
    }
  };

  // Add function to fetch and open chat info panel
  const handleOpenChatInfo = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent event bubbling which could close the chat
      console.log('Chat info icon clicked, prevented default and stopped propagation');
    }
    
    if (!selectedChat) {
      console.log('No selected chat found');
      return;
    }
    
    try {
      console.log('Opening chat info for', messageCategory, 'chat with ID', selectedChat);
      
      // For direct messages
      if (messageCategory === 'direct') {
        const selectedChatData = conversations.find(c => c.otherUserId === selectedChat);
        if (!selectedChatData) {
          console.error('Chat not found in conversations list');
          handleError('Chat not found');
          return;
        }
        
        console.log('Setting chat info data for direct message');
          setChatInfoData({
            id: selectedChat,
            name: selectedChatData.otherUsername,
            image: selectedChatData.otherUserImage,
            username: selectedChatData.otherUsername,
          createdAt: new Date().toISOString()
        });
      } else {
        // For group chats
        const selectedGroupData = groupChats.find(g => g.id === selectedChat);
        if (!selectedGroupData) {
          console.error('Group chat not found in group chats list');
          handleError('Group chat not found');
          return;
        }
        
        console.log('Setting chat info data for group chat');
          setChatInfoData({
            id: selectedChat,
            name: selectedGroupData.name,
            image: selectedGroupData.image,
            createdAt: new Date().toISOString(),
          members: selectedGroupData.members || [],
          ownerId: selectedGroupData.members?.find(m => m.isOwner)?.id,
          isEnded: selectedGroupData.isEnded
          });
      }
      
      // Toggle chat info panel
      console.log('Toggling chat info panel');
      setShowChatInfo(true); // Always set to true instead of toggling
      console.log('showChatInfo set to true');
    } catch (error) {
      console.error('Error preparing chat info:', error);
      handleError('Failed to load chat information');
    }
  };

  // Add function to handle blocking user
  const handleBlockUser = async (userId: number) => {
    try {
      await axiosInstance.post(`/api/users/${userId}/block`);
      handleError('User has been blocked successfully');
      // Optionally close the chat or refresh data
    } catch (error) {
      console.error('Error blocking user:', error);
      handleError('Failed to block user');
    }
  };

  // Add function to handle reporting user
  const handleReportUser = async (userId: number) => {
    try {
      await axiosInstance.post(`/api/users/${userId}/report`, {
        reason: 'User reported from messages' // You might want to add a reason input in the UI
      });
      handleError('User has been reported successfully');
    } catch (error) {
      console.error('Error reporting user:', error);
      handleError('Failed to report user');
    }
  };

  // Update the handleSelectChat function to close the info panel when changing chats
  const handleSelectChat = (id: number, category: MessageCategory) => {
    // Close chat info panel when changing chats
    if (showChatInfo) {
      setShowChatInfo(false);
    }
    
    // First check if we're switching categories
    if (messageCategory !== category) {
      // Reset selected chat and messages first
      setSelectedChat(null);
      setMessages([]);
      
      // Then update the category
      setMessageCategory(category);
      
      // Then set the selected chat after category has changed
      setTimeout(() => {
        // Verify the ID is still valid
        if (category === 'group') {
          const groupExists = groupChats.some(group => group.id === id);
          if (groupExists) {
            setSelectedChat(id);
          }
        } else {
          setSelectedChat(id);
        }
      }, 50); // A little more delay for safety
    } else {
      // Same category, just update the selected chat
      setSelectedChat(id);
    }
    
    // Reset states related to chat
    setReplyingTo(null);
    setMediaFile(null);
    setMediaPreview(null);
    setMessage(''); // Clear message input when changing chats
  };

  // Add function to handle deleting all messages
  const handleDeleteAllMessages = async (chatId: number) => {
    try {
      // Update endpoint to match the expected backend route
      await axiosInstance.delete(`/api/messages/conversation/${chatId}/all`);
      
      // Clear messages locally
      setMessages([]);
      // Update the conversation
      setConversations(prev => prev.map(conv => 
        conv.otherUserId === chatId 
          ? { ...conv, lastMessage: '', lastMessageTime: new Date().toISOString() }
          : conv
      ));
      setShowChatInfo(false);
      handleError('All messages have been deleted');
    } catch (error) {
      console.error('Error deleting messages:', error);
      handleError('Failed to delete messages');
    }
  };

  // Add a function to properly get the unread count
  useEffect(() => {
    if (selectedChat) {
      // Reset unread count when chat is selected
      setConversations(prev => prev.map(conv => 
        conv.otherUserId === selectedChat
          ? { ...conv, unreadCount: 0 }
          : conv
      ));
    }
  }, [selectedChat]);

  // Handle group creation
  const handleGroupCreated = (groupId: number) => {
    console.log('Group created, refreshing group chats and selecting new group:', groupId);
    
    // Use the main fetchGroupChats function to get updated data
    fetchGroupChats().then(() => {
      // After refreshing, select the new group
      setSelectedChat(groupId);
      setMessageCategory('group');
    }).catch(error => {
      console.error('Error refreshing group chats after creation:', error);
      
      // If fetching fails, create a temporary entry
      const temporaryGroup: GroupChat = {
        id: groupId,
        name: 'New Group',
        image: null,
        lastMessage: 'No messages yet',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        members: []
      };
      
      // Add temporary group to the list
      setGroupChats(prev => [temporaryGroup, ...prev]);
      setSelectedChat(groupId);
      setMessageCategory('group');
    });
  };

  // Modify fetchGroupChats to properly use the API response format
  const fetchGroupChats = async () => {
    try {
      console.log("Refreshing group chats data");
      const { data } = await axiosInstance.get<GroupChatResponse[]>('/api/group-chats');
      console.log('Raw group chats data from API:', data);
      
      if (!data || !Array.isArray(data)) {
        console.error('Invalid group chats data received:', data);
        return; // Don't update state with invalid data
      }
      
      // Process the data to ensure correct formatting for empty messages
      const processedData = data.map((group: GroupChatResponse) => {
        // Extract last message from latestMessage field
        const lastMessageContent = group.latestMessage ? group.latestMessage.content : 'No messages yet';
        const lastMessageTime = group.latestMessage ? group.latestMessage.createdAt : group.createdAt;
        
        // Get unread count if available in the API response
        const unreadCount = group.unreadCount || 0;
        
        console.log(`Group ${group.id} "${group.name}" ===== Processing Group Data =====`);
        console.log('  Has latestMessage:', !!group.latestMessage);
        console.log('  latestMessage:', group.latestMessage);
        console.log('  Using lastMessageContent:', lastMessageContent);
        console.log('  Using lastMessageTime:', lastMessageTime);
        console.log('  Unread count:', unreadCount);
        
        return {
          id: group.id,
          name: group.name,
          image: group.groupImage,
          lastMessage: lastMessageContent,
          lastMessageTime: lastMessageTime,
          unreadCount: unreadCount,
          isEnded: false, // Set default or get from API if available
          members: group.members.map(member => ({
            id: member.id,
            username: member.username,
            userImage: member.userImage,
            isAdmin: member.isAdmin,
            isOwner: member.id === group.ownerId
          }))
        };
      });
      
      // Sort by most recent message
      const sortedGroupChats = processedData.sort((a: GroupChat, b: GroupChat) => {
        const dateA = new Date(a.lastMessageTime);
        const dateB = new Date(b.lastMessageTime);
        return dateB.getTime() - dateA.getTime(); // Most recent first
      });
      
      console.log('Processed and sorted group chats:', sortedGroupChats);
      
      // Log lastMessage for each group before setting state
      sortedGroupChats.forEach(group => {
        console.log(`Group ${group.id} ${group.name} - Final lastMessage: "${group.lastMessage}"`);
      });
      
      setGroupChats(sortedGroupChats);
      console.log('Group chats state updated');
      
      // After a slight delay, verify what's in the state
      setTimeout(() => {
        console.log("Current group chats in state:", JSON.parse(JSON.stringify(groupChats)));
      }, 100);
    } catch (err) {
      console.error('Error fetching group chats:', err);
      // Don't set empty array here as it would clear existing data
      // Only set empty if there's truly no data to show
    }
  };

  // Add function to handle leaving a group chat
  const handleLeaveGroup = async (groupId: number) => {
    try {
      await axiosInstance.delete(`/api/group-chats/${groupId}/members/${user?.id}`);
      
      // Remove the group from the list
      setGroupChats(prev => prev.filter(group => group.id !== groupId));
      
      // If this was the selected chat, reset selection but stay in group category
      if (selectedChat === groupId) {
        setSelectedChat(null);
        // Removed: setMessageCategory('direct');
      }
      
      // Close the chat info panel if open
      setShowChatInfo(false);
      
      handleError('You have left the group');
    } catch (error) {
      console.error('Error leaving group:', error);
      handleError('Failed to leave group');
    }
  };

  // Add a function to render grouped messages in chat
  const renderGroupedMessages = () => {
    // Group messages by sender and sequential blocks
    const groupedMessages: { sender: number; messages: Message[]; }[] = [];
    
    messages.forEach((message) => {
      // If system message, add it as its own group
      if (message.isSystem) {
        groupedMessages.push({ sender: 0, messages: [message] });
        return;
      }
      
      const lastGroup = groupedMessages[groupedMessages.length - 1];
      
      // Check if this message should be part of the last group
      if (lastGroup && lastGroup.sender === message.sender.id) {
        lastGroup.messages.push(message);
      } else {
        // Start a new group
        groupedMessages.push({ sender: message.sender.id, messages: [message] });
      }
    });
    
    // Render each group
    return groupedMessages.map((group, groupIndex) => {
      // For system messages
      if (group.sender === 0 && group.messages[0].isSystem) {
        return renderMessage(group.messages[0]);
      }
      
      const isCurrentUser = group.sender === user?.id;
      
      return (
        <div key={`group-${groupIndex}`} className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} mb-8`}>
          {/* Render each message in the group */}
          {group.messages.map((msg, msgIndex) => {
            const isFirstInGroup = msgIndex === 0;
            const isLastInGroup = msgIndex === group.messages.length - 1;
            
            return (
              <div key={msg.id} className="flex" style={{ marginBottom: isLastInGroup ? 0 : '6px' }}>
                <div className={`flex items-end ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} space-x-3 ${isCurrentUser ? 'space-x-reverse' : ''}`}>
                  {/* Profile picture - only show on the last message for non-current user */}
                  {!isCurrentUser && isLastInGroup && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${msg.sender.username}`);
                      }}
                      className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mb-1 cursor-pointer ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}
                    >
                      {msg.sender.userImage ? (
                        <img
                          src={msg.sender.userImage.startsWith('http') ? msg.sender.userImage : `https://localhost:3000${msg.sender.userImage}`}
                          alt={msg.sender.username}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className={darkMode ? 'text-gray-400' : 'text-gray-500'} size={16} />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Empty div to maintain spacing when no profile picture */}
                  {!isCurrentUser && !isLastInGroup && (
                    <div className="w-8 flex-shrink-0"></div>
                  )}
                  
                  <div className="flex flex-col">
                    {/* Username above first message in group for non-current user */}
                    {!isCurrentUser && isFirstInGroup && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${msg.sender.username}`);
                        }}
                        className={`text-xs font-medium mb-1 ml-1 cursor-pointer hover:underline ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
                      >
                        {msg.sender.username}
                      </div>
                    )}
                    
                    <motion.div
                      id={`message-${msg.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col"
                    >
                      {/* Reply content if this is a reply */}
                      {msg.replyToId && (
                        <ReplyPreview message={msg} messages={messages} darkMode={darkMode} />
                      )}
                      
                      {/* Message bubble */}
                      <div
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleMessageOptions(e, msg.id);
                        }}
                        className={`rounded-2xl px-4 py-2 break-words relative shadow-sm hover:shadow-md transition-shadow duration-200 group ${
                          isCurrentUser
                            ? `${darkMode ? 'bg-[rgb(37,99,235)] hover:bg-[rgb(29,78,216)]' : 'bg-[rgb(59,130,246)] hover:bg-[rgb(37,99,235)]'} text-white ${isLastInGroup ? 'rounded-br-none' : ''}`
                            : darkMode
                            ? `bg-[rgb(31,41,55)] hover:bg-[rgb(55,65,81)] ${isLastInGroup ? 'rounded-bl-none' : ''}`
                            : `bg-[rgb(229,231,235)] hover:bg-[rgb(209,213,219)] ${isLastInGroup ? 'rounded-bl-none' : ''}`
                        } ${msg.content === '[Encrypted Message]' ? 'italic opacity-75' : ''}`}
                      >
                        <div className={`absolute ${isCurrentUser ? '-left-8' : '-right-8'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          <button
                            onClick={(e) => handleMessageOptions(e, msg.id)}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors duration-200"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                        
                        {/* Media content */}
                        {msg.mediaUrl && (
                          <div className="mb-2 max-w-full overflow-hidden rounded-lg">
                            {msg.mediaType === 'image' ? (
                              <img 
                                src={msg.mediaUrl.startsWith('http') ? msg.mediaUrl : `https://localhost:3000${msg.mediaUrl}`}
                                alt="Image message"
                                className="max-w-full h-auto rounded-lg object-contain max-h-[300px]"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const parent = (e.target as HTMLImageElement).parentElement;
                                  if (parent) {
                                    const errorDiv = document.createElement('div');
                                    errorDiv.className = 'p-2 text-center text-sm text-red-500';
                                    errorDiv.innerText = 'Failed to load image';
                                    parent.appendChild(errorDiv);
                                  }
                                }}
                              />
                            ) : msg.mediaType === 'video' ? (
                              <video 
                                controls
                                className="max-w-full h-auto rounded-lg max-h-[300px]"
                                preload="metadata"
                              >
                                <source src={msg.mediaUrl.startsWith('http') ? msg.mediaUrl : `https://localhost:3000${msg.mediaUrl}`} />
                                Your browser does not support video playback.
                              </video>
                            ) : null}
                          </div>
                        )}
                        
                        {editingMessage?.id === msg.id ? (
                          <EditMessageForm 
                            editingMessage={editingMessage}
                            setEditingMessage={setEditingMessage}
                            handleSaveEdit={handleSaveEdit}
                            darkMode={darkMode}
                          />
                        ) : (
                          msg.content && (
                            <p className={`whitespace-pre-wrap ${msg.isEdited ? 'group-hover:pr-10' : ''}`}>
                              {msg.content}
                              {msg.isEdited && (
                                <span className={`ml-1.5 text-xs opacity-70 ${isCurrentUser ? 'text-white/80' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  (edited)
                                </span>
                              )}
                            </p>
                          )
                        )}
                        
                        {/* Time and read status */}
                        <div className={`flex items-center justify-end mt-1 space-x-1.5 text-[11px] ${
                          isCurrentUser ? 'text-white/70' : darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {msg.isEdited && !editingMessage?.id && (
                            <span className="italic">(edited)</span>
                          )}
                          <span>{formatTime(new Date(msg.createdAt))}</span>
                          {isCurrentUser && (
                            <span className="flex items-center">
                              {msg.read ? (
                                <svg viewBox="0 0 16 15" fill="currentColor" className="w-4 h-4">
                                  <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                                </svg>
                              ) : (
                                <svg viewBox="0 0 16 15" fill="currentColor" className="w-4 h-4">
                                  <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                                </svg>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    });
  };

  // Helper component for reply previews
  const ReplyPreview = ({ message, messages, darkMode }: { message: Message, messages: Message[], darkMode: boolean }) => {
    const originalMessage = message.replyToId ? messages.find(m => m.id === message.replyToId) : null;
    
    if (!originalMessage) return null;
    
    return (
      <div 
        className={`flex items-center space-x-2 pl-3 py-1.5 pr-4 rounded-lg mb-1 cursor-pointer relative border-l-2 border-blue-500 ${
          darkMode 
            ? 'bg-gray-800/50 hover:bg-gray-800/70' 
            : 'bg-gray-100/80 hover:bg-gray-200/80'
        }`}
        onClick={() => {
          const element = document.getElementById(`message-${originalMessage.id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('bg-blue-500/10', 'dark:bg-blue-500/5');
            setTimeout(() => {
              element.classList.remove('bg-blue-500/10', 'dark:bg-blue-500/5');
            }, 2000);
          }
        }}
      >
        <div className={`w-4 h-4 rounded-full overflow-hidden flex-shrink-0 ${
          darkMode ? 'bg-gray-700' : 'bg-gray-200'
        }`}>
          {originalMessage.sender.userImage ? (
            <img
              src={originalMessage.sender.userImage.startsWith('http') 
                ? originalMessage.sender.userImage 
                : `https://localhost:3000${originalMessage.sender.userImage}`}
              alt={originalMessage.sender.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className={darkMode ? 'text-gray-500' : 'text-gray-400'} size={10} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-xs font-medium ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {originalMessage.sender.username}
          </span>
          <p className={`text-xs truncate ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {originalMessage.content}
          </p>
        </div>
      </div>
    );
  };

  // Helper component for editing messages
  const EditMessageForm = ({ 
    editingMessage, 
    setEditingMessage, 
    handleSaveEdit,
    darkMode
  }: { 
    editingMessage: { id: number; content: string },
    setEditingMessage: React.Dispatch<React.SetStateAction<{ id: number; content: string } | null>>,
    handleSaveEdit: () => Promise<void>,
    darkMode: boolean
  }) => {
    return (
      <div className="flex flex-col space-y-2">
        <textarea
          value={editingMessage.content}
          onChange={(e) => setEditingMessage({ ...editingMessage, content: e.target.value })}
          className={`w-full p-2 rounded bg-transparent border ${
            darkMode ? 'border-gray-600 focus:border-gray-500' : 'border-gray-300 focus:border-gray-400'
          } focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none`}
          rows={2}
          autoFocus
        />
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => setEditingMessage(null)}
            className="px-2 py-1 text-xs rounded hover:bg-gray-700/20"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveEdit}
            className="px-2 py-1 text-xs font-semibold rounded bg-blue-500/20 hover:bg-blue-500/30"
          >
            Save
          </button>
        </div>
      </div>
    );
  };

  // Helper function to format time
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Add an effect to handle category switching
  useEffect(() => {
    // Close chat info panel when changing message categories
    if (showChatInfo) {
      setShowChatInfo(false);
    }

    // Clear selected chat when switching categories to prevent errors
    setSelectedChat(null);
    setMessages([]);
    
    // If switching to group chat category, refresh group chats data
    if (messageCategory === 'group') {
      // Fetch and refresh group chats data using the main fetchGroupChats function
      console.log('Refreshing group chats after category switch');
      fetchGroupChats();
    }
  }, [messageCategory, showChatInfo]);

  // Add effect to handle outside clicks for search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const searchContainer = document.querySelector('.search-container');
      if (searchContainer && !searchContainer.contains(event.target as Node)) {
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear search when switching category
  useEffect(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, [messageCategory]);

  // Add function to highlight matching text in search results
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className={`${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
          {part}
        </span>
      ) : part
    );
  };

  const handleFollowUser = async (userId: number) => {
    try {
      setFollowLoading(prev => [...prev, userId]);
      
      if (followingIds.includes(userId)) {
        // Unfollow the user
        await axiosInstance.delete(`/api/users/follow/${userId}`);
        setFollowingIds(prev => prev.filter(id => id !== userId));
      } else {
        // Follow the user
        await axiosInstance.post(`/api/users/follow/${userId}`);
        setFollowingIds(prev => [...prev, userId]);
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setFollowLoading(prev => prev.filter(id => id !== userId));
    }
  };

  // Fetch group chats
  useEffect(() => {
    fetchGroupChats();
  }, []);

  // Add a function to refresh group chats (useful after sending messages)
  const refreshGroupChats = async () => {
    try {
      await fetchGroupChats();
    } catch (error) {
      console.error('Failed to refresh group chats:', error);
    }
  };

  // Function to handle messages being sent in group chats
  const handleGroupMessageSent = (groupId: number, message: string, mediaType?: 'image' | 'video') => {
    // Update the group chat in the list with the new message
    setGroupChats(prevChats => {
      const updatedChats = prevChats.map(chat => {
        if (chat.id === groupId) {
          let lastMessageText = message.trim();
          if (!lastMessageText && mediaType) {
            lastMessageText = mediaType === 'image' ? '📷 Sent an image' : '📹 Sent a video';
          }
          
          return {
            ...chat,
            lastMessage: lastMessageText,
            lastMessageTime: new Date().toISOString(),
            unreadCount: 0 // Reset unread count since this is a message we just sent
          };
        }
        return chat;
      });
      
      // Sort by most recent message
      return updatedChats.sort((a, b) => {
        const dateA = new Date(a.lastMessageTime);
        const dateB = new Date(b.lastMessageTime);
        return dateB.getTime() - dateA.getTime(); // Most recent first
      });
    });
  };

  // Component to display shared posts in messages
  const SharedPostPreview: React.FC<{ message: Message, darkMode: boolean }> = ({ message, darkMode }) => {
    interface PostDetails {
      id: number;
      content: string | null;
      mediaUrl: string | null;
      author: {
        username: string;
        userImage: string | null;
      };
    }
    
    const [postDetails, setPostDetails] = useState<PostDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const navigate = useNavigate();
    
    useEffect(() => {
      if (!message.sharedPostId || isError) return;
      
      const fetchPostDetails = async () => {
        try {
          setIsLoading(true);
          const { data } = await axiosInstance.get(`/api/posts/${message.sharedPostId}`);
          setPostDetails(data as PostDetails);
        } catch (error) {
          console.error('Error fetching shared post:', error);
          setIsError(true);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchPostDetails();
    }, [message.sharedPostId, isError]);
    
    const handlePostClick = () => {
      if (postDetails) {
        navigate(`/post/${postDetails.id}`);
      }
    };
    
    if (isLoading) {
      return (
        <div 
          className={`mt-2 p-3 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2 animate-pulse">
            <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
            <div className="flex-1">
              <div className={`h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-1/4 mb-2`}></div>
              <div className={`h-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-3/4`}></div>
            </div>
          </div>
        </div>
      );
    }
    
    if (isError || !postDetails) {
      return (
        <div 
          className={`mt-2 p-3 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-500'
          }`}
        >
          <div className="flex items-center">
            <AlertTriangle size={18} className="mr-2 text-yellow-500" />
            <span>This post is no longer available</span>
          </div>
        </div>
      );
    }
    
    return (
      <div 
        className={`mt-2 p-3 rounded-lg border cursor-pointer transition-colors ${
          darkMode 
            ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
            : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
        }`}
        onClick={handlePostClick}
      >
        <div className="flex items-center space-x-2 mb-2">
          <div className={`w-6 h-6 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}>
            {postDetails.author.userImage ? (
              <img 
                src={postDetails.author.userImage} 
                alt={postDetails.author.username} 
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={16} className="w-full h-full p-1" />
            )}
          </div>
          <div className="font-medium text-sm">@{postDetails.author.username}</div>
        </div>
        
        {postDetails.content && (
          <div className={`text-sm mb-2 line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {postDetails.content}
          </div>
        )}
        
        {postDetails.mediaUrl && (
          <div className="relative w-full h-32 rounded-lg overflow-hidden bg-gray-200">
            <img 
              src={postDetails.mediaUrl} 
              alt="Post attachment" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    );
  };

  // Add monitoring for group chats state changes
  useEffect(() => {
    if (groupChats.length > 0) {
      console.log("Group chats state changed, current values:");
      groupChats.forEach(group => {
        console.log(`Group ${group.id} (${group.name}) - lastMessage: "${group.lastMessage}" at ${group.lastMessageTime}`);
      });
    }
  }, [groupChats]);

  return (
    <div className={`min-h-screen flex flex-col h-screen relative ${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"}`}>
      {/* Error Toast - Fixed Position */}
      <AnimatePresence>
        {showError && error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2"
            style={{ 
              backgroundColor: darkMode ? 'rgba(220, 38, 38, 0.9)' : 'rgba(239, 68, 68, 0.9)',
              backdropFilter: 'blur(8px)',
              maxWidth: '90%',
              width: 'auto'
            }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-white text-sm font-medium">{error}</p>
            <button 
              onClick={() => setShowError(false)}
              className="text-white opacity-70 hover:opacity-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group Chat Modal */}
      <CreateGroupChat 
        isOpen={showGroupChatModal}
        onClose={() => setShowGroupChatModal(false)}
        onGroupCreated={handleGroupCreated}
      />

      {/* Message Info Modal */}
      <AnimatePresence>
        {messageInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={closeMessageInfo}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className={`w-full max-w-md rounded-xl shadow-2xl ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              } overflow-hidden`}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Info size={20} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                    Message Info
                  </h3>
                  <button
                    onClick={closeMessageInfo}
                    className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Sender Info */}
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full overflow-hidden border ${
                    darkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    {messageInfo.sender.userImage ? (
                      <img
                        src={messageInfo.sender.userImage.startsWith('http') 
                          ? messageInfo.sender.userImage 
                          : `https://localhost:3000${messageInfo.sender.userImage}`}
                        alt={messageInfo.sender.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        <User className={darkMode ? 'text-gray-400' : 'text-gray-500'} size={24} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-base">{messageInfo.sender.username}</p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Message Sender</p>
                  </div>
                </div>

                {/* Timeline */}
                <div className={`space-y-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <Send size={16} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Sent</p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(messageInfo.sent).toLocaleString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <svg viewBox="0 0 16 15" fill="currentColor" className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Delivered</p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(messageInfo.delivered).toLocaleString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {messageInfo.read && (
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <svg viewBox="0 0 16 15" fill="currentColor" className="w-4 h-4 text-blue-500">
                          <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">Read</p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(messageInfo.readAt!).toLocaleString(undefined, {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Current Status */}
                <div className={`flex items-center justify-between p-4 rounded-lg ${
                  darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                  <span className="text-sm font-medium">Current Status</span>
                  <div className="flex items-center gap-2">
                    {messageInfo.read ? (
                      <>
                        <span className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Read</span>
                        <svg viewBox="0 0 16 15" fill="currentColor" className="w-5 h-5 text-blue-500">
                          <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                        </svg>
                      </>
                    ) : (
                      <>
                        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Delivered</span>
                        <svg viewBox="0 0 16 15" fill="currentColor" className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                        </svg>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dark Mode Toggle - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <DarkModeToggle />
      </div>

      <div className="flex flex-1 h-full overflow-hidden">
        <Sidebar forceCollapsed={true} />
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-1 ml-16 h-full overflow-hidden"
        >
          {/* Chat List */}
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={`w-80 border-r flex-shrink-0 flex flex-col h-full ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}
          >
            {/* Search and Dark Mode Toggle */}
            <div className={`p-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Messages</h2>
              </div>
              
              {/* Category Tabs */}
              <div className="flex mb-4 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setMessageCategory('direct')}
                  className={`flex-1 py-2 text-center font-medium text-sm relative ${
                    messageCategory === 'direct' 
                      ? (darkMode ? 'text-blue-400' : 'text-blue-600') 
                      : (darkMode ? 'text-gray-400' : 'text-gray-500')
                  }`}
                >
                  Direct Messages
                  {messageCategory === 'direct' && (
                    <div className={`absolute bottom-0 left-0 w-full h-0.5 ${darkMode ? 'bg-blue-400' : 'bg-blue-600'}`}></div>
                  )}
                </button>
                <button
                  onClick={() => setMessageCategory('group')}
                  className={`flex-1 py-2 text-center font-medium text-sm relative ${
                    messageCategory === 'group' 
                      ? (darkMode ? 'text-blue-400' : 'text-blue-600') 
                      : (darkMode ? 'text-gray-400' : 'text-gray-500')
                  }`}
                >
                  Group Chats
                  {messageCategory === 'group' && (
                    <div className={`absolute bottom-0 left-0 w-full h-0.5 ${darkMode ? 'bg-blue-400' : 'bg-blue-600'}`}></div>
                  )}
                </button>
              </div>
              
              {/* Search Bar - Only show for Direct Messages */}
              {messageCategory === 'direct' && (
                <div className="relative w-full search-container">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users to message..."
                    className={`w-full p-2 pl-10 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' 
                        : 'bg-white border-gray-200'
                    }`}
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />

                  {/* Search Results Dropdown - Only show when there's a search query */}
                  {searchQuery && (
                    <div className={`absolute mt-2 w-full rounded-lg shadow-lg z-50 ${
                      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    } border`}>
                      {isSearching ? (
                        <div className="p-4 text-center text-gray-500">Searching...</div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map(user => (
                          <div
                            key={user.id}
                            onClick={() => startConversation(user.id)}
                            className={`flex items-center space-x-3 py-2 px-4 cursor-pointer ${
                              darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100/80'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full overflow-hidden border flex-shrink-0 ${
                              darkMode ? 'border-gray-700' : 'border-gray-200'
                            }`}>
                              {user.userImage ? (
                                <img
                                  src={user.userImage}
                                  alt={user.username}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                  }}
                                />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center ${
                                  darkMode ? 'bg-gray-700' : 'bg-gray-100'
                                }`}>
                                  <User className={darkMode ? 'text-gray-400' : 'text-gray-500'} size={20} />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">
                                {highlightMatch(user.username, searchQuery)}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">No users found</div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Create New Group Button - Only display in Group Chats tab */}
              {messageCategory === 'group' && (
                <button
                  onClick={() => setShowGroupChatModal(true)}
                  className={`w-full py-2 px-4 rounded-lg flex items-center justify-center ${
                    darkMode 
                      ? 'bg-blue-600/80 hover:bg-blue-600 text-white border border-blue-500' 
                      : 'bg-blue-600/80 hover:bg-blue-600 text-white border border-blue-500'
                  } transition-colors duration-200`}
                >
                  <Users size={16} className="mr-2" />
                  Create New Group
                </button>
              )}
                    
              {/* Suggested Users Section - Show when no search query and in Direct Messages tab */}
              {!searchQuery && messageCategory === 'direct' && (
                <div className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <h3 className="px-4 text-sm font-medium mb-2">Suggested</h3>
                  <div className="space-y-1">
                    {loadingSuggestions ? (
                      <div className="px-4 py-2 text-sm text-gray-500">Loading suggestions...</div>
                    ) : suggestedUsers.length > 0 ? (
                      suggestedUsers.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => startConversation(user.id)}
                          className={`px-4 py-2 flex items-center space-x-3 cursor-pointer ${
                            darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full overflow-hidden border ${
                            darkMode ? 'border-gray-700' : 'border-gray-200'
                          }`}>
                            {user.userImage ? (
                              <img
                                src={user.userImage.startsWith('http') ? user.userImage : `https://localhost:3000${user.userImage}`}
                                alt={user.username}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                }}
                              />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center ${
                                darkMode ? 'bg-gray-700' : 'bg-gray-100'
                              }`}>
                                <User className={darkMode ? 'text-gray-400' : 'text-gray-500'} size={20} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{user.username}</div>
                            <div className="text-xs flex items-center space-x-1">
                              {user.type === 'mutual' ? (
                                <>
                                  <Users size={12} className="text-green-500" />
                                  <span className="text-green-500">Follows you</span>
                                </>
                              ) : (
                                <>
                                  <UserPlus size={12} className="text-blue-500" />
                                  <span className="text-blue-500">Follow requested</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-500">
                        No suggestions available. Try following more users!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Chat List - Scrollable */}
            <div className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-blue-600 [&::-webkit-scrollbar-track]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-blue-500 dark:[&::-webkit-scrollbar-track]:bg-gray-700">
              <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-4 text-center"
                    >
                      Loading conversations...
                    </motion.div>
                  ) : messageCategory === 'direct' ? (
                    conversations.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-4 text-center"
                      >
                        No conversations yet. Search for users to start chatting!
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-300'}`}
                      >
                        {conversations.map((chat) => (
                          <motion.div
                            key={chat.otherUserId}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{ backgroundColor: darkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(243, 244, 246, 0.5)' }}
                            onClick={() => handleSelectChat(chat.otherUserId, 'direct')}
                            className={`p-4 cursor-pointer ${
                              selectedChat === chat.otherUserId
                                ? (darkMode ? 'bg-gray-800' : 'bg-gray-100')
                                : ''
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border ${
                                darkMode ? 'border-gray-700' : 'border-gray-200'
                              }`}>
                                {chat.otherUserImage ? (
                                  <img
                                    src={chat.otherUserImage.startsWith('http') ? chat.otherUserImage : `https://localhost:3000${chat.otherUserImage}`}
                                    alt={chat.otherUsername}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                    }}
                                  />
                                ) : (
                                  <div className={`w-full h-full flex items-center justify-center ${
                                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                                  }`}>
                                    <User className={darkMode ? 'text-gray-400' : 'text-gray-500'} size={24} />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <h2 
                                    className="font-semibold cursor-pointer hover:underline" 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const username = chat.otherUsername;
                                      if (username) navigate(`/profile/${username}`);
                                    }}
                                  >
                                    {chat.otherUsername}
                                  </h2>
                                </div>
                                <p className={`text-sm truncate flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {chat.lastMessage && chat.lastMessage.includes('📷') && <span className="text-base">📷</span>}
                                  {chat.lastMessage && chat.lastMessage.includes('📹') && <span className="text-base">📹</span>}
                                  {renderMessagePreview(
                                    chat.lastMessage || '', 
                                    (chat.lastMessage && chat.lastMessage.includes('📷')) ? 'image' : 
                                    (chat.lastMessage && chat.lastMessage.includes('📹')) ? 'video' : 
                                    undefined
                                  )}
                                </p>
                              </div>
                              <div className="flex flex-col items-end space-y-1">
                                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {new Date(chat.lastMessageTime).toLocaleDateString()}
                                </p>
                                {chat.unreadCount > 0 && (
                                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs bg-blue-500 text-white rounded-full">
                                    {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )
                  ) : (
                    // Group chats display
                    groupChats.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-4 text-center"
                      >
                        No group chats yet. Create a new group to start chatting!
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-300'}`}
                      >
                        {groupChats.map((group) => (
                          <motion.div
                            key={group.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{ backgroundColor: darkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(243, 244, 246, 0.5)' }}
                            onClick={() => {
                              console.log(`Selecting group ${group.id} with lastMessage: "${group.lastMessage}"`);
                              handleSelectChat(group.id, 'group');
                            }}
                            className={`p-4 cursor-pointer ${
                              selectedChat === group.id
                                ? (darkMode ? 'bg-gray-800' : 'bg-gray-100')
                                : ''
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border ${
                                darkMode ? 'border-gray-700' : 'border-gray-200'
                              }`}>
                                {group.image ? (
                                  <img
                                    src={group.image.startsWith('http') ? group.image : `https://localhost:3000${group.image}`}
                                    alt={group.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                    }}
                                  />
                                ) : (
                                  <div className={`w-full h-full flex items-center justify-center ${
                                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                                  }`}>
                                    <Users className={darkMode ? 'text-gray-400' : 'text-gray-500'} size={24} />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <h2 
                                    className="font-semibold cursor-pointer hover:underline"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleOpenChatInfo(e);
                                    }}
                                  >
                                    {group.name}
                                  </h2>
                                </div>
                                <p className={`text-sm truncate flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {(() => {
                                    console.log(`Rendering preview for group ${group.id}: lastMessage="${group.lastMessage}"`);
                                    return null;
                                  })()}
                                  {group.lastMessage && group.lastMessage.includes('📷') && <span className="text-base">📷</span>}
                                  {group.lastMessage && group.lastMessage.includes('📹') && <span className="text-base">📹</span>}
                                  {renderMessagePreview(
                                    group.lastMessage || '', 
                                    (group.lastMessage && group.lastMessage.includes('📷')) ? 'image' : 
                                    (group.lastMessage && group.lastMessage.includes('📹')) ? 'video' : 
                                    undefined
                                  )}
                                </p>
                              </div>
                              <div className="flex flex-col items-end space-y-1">
                                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {group.lastMessageTime ? new Date(group.lastMessageTime).toLocaleDateString() : 'No messages'}
                                </p>
                                {group.unreadCount > 0 && (
                                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs bg-blue-500 text-white rounded-full">
                                    {group.unreadCount > 99 ? '99+' : group.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )
                  )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Chat Window */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col h-full overflow-hidden relative"
          >
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <motion.div 
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className={`p-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'} bg-inherit z-10`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {messageCategory === 'direct' ? (
                        // Direct Message Header
                        <>
                          <div 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const username = conversations.find(chat => chat.otherUserId === selectedChat)?.otherUsername;
                              if (username) navigate(`/profile/${username}`);
                            }}
                            className={`w-10 h-10 rounded-full overflow-hidden border cursor-pointer ${
                              darkMode ? 'border-gray-700' : 'border-gray-200'
                            }`}
                          >
                            {conversations.find(chat => chat.otherUserId === selectedChat)?.otherUserImage ? (
                              <img
                                src={conversations.find(chat => chat.otherUserId === selectedChat)?.otherUserImage?.startsWith('http') 
                                  ? conversations.find(chat => chat.otherUserId === selectedChat)?.otherUserImage!
                                  : `https://localhost:3000${conversations.find(chat => chat.otherUserId === selectedChat)?.otherUserImage}`
                                }
                                alt={conversations.find(chat => chat.otherUserId === selectedChat)?.otherUsername}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                }}
                              />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center ${
                                darkMode ? 'bg-gray-700' : 'bg-gray-100'
                              }`}>
                                <User className={darkMode ? 'text-gray-400' : 'text-gray-500'} size={20} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h2 
                                className="font-semibold cursor-pointer hover:underline" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                const username = conversations.find(chat => chat.otherUserId === selectedChat)?.otherUsername;
                                if (username) navigate(`/profile/${username}`);
                                }}
                              >
                                {conversations.find(chat => chat.otherUserId === selectedChat)?.otherUsername}
                              </h2>
                            </div>
                          </div>
                        </>
                      ) : (
                        // Group Chat Header
                        <>
                          <div 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleOpenChatInfo(e);
                            }}
                            className={`w-10 h-10 rounded-full overflow-hidden border cursor-pointer ${
                              darkMode ? 'border-gray-700' : 'border-gray-200'
                            }`}
                          >
                            {groupChats.find(group => group.id === selectedChat)?.image ? (
                              <img
                                src={groupChats.find(group => group.id === selectedChat)?.image?.startsWith('http') 
                                  ? groupChats.find(group => group.id === selectedChat)?.image!
                                  : `https://localhost:3000${groupChats.find(group => group.id === selectedChat)?.image}`
                                }
                                alt={groupChats.find(group => group.id === selectedChat)?.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                }}
                              />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center ${
                                darkMode ? 'bg-gray-700' : 'bg-gray-100'
                              }`}>
                                <Users className={darkMode ? 'text-gray-400' : 'text-gray-500'} size={20} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h2 
                                className="font-semibold cursor-pointer hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleOpenChatInfo(e);
                                }}
                              >
                                {groupChats.find(group => group.id === selectedChat)?.name}
                              </h2>
                            </div>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {groupChats.find(group => group.id === selectedChat)?.members?.length || 0} members
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Info button removed from here since it's now next to the username */}
                    </div>
                  </div>
                </motion.div>

                {/* Messages - Scrollable */}
                <motion.div 
                  ref={messageContainerRef}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-blue-600 [&::-webkit-scrollbar-track]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-blue-500 dark:[&::-webkit-scrollbar-track]:bg-gray-700"
                >
                  <AnimatePresence mode="sync">
                    {messageCategory === 'direct' 
                      ? messages.map((msg) => renderMessage(msg))
                      : renderGroupedMessages()}
                  </AnimatePresence>
                </motion.div>

                {/* Message Options Menu */}
                {messageOptions && messageOptions.messageId && messageOptions.position && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`fixed z-[100] message-options w-48 ${
                      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    } border rounded-lg shadow-xl py-1`}
                    style={{
                      left: messageOptions.position.x,
                      top: messageOptions.position.y,
                    }}
                  >
                    {(() => {
                      const message = messages.find(msg => msg.id === messageOptions.messageId);
                      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
                      const messageDate = new Date(message?.createdAt || '');
                      const canEdit = message?.senderId === user?.id && messageDate > fifteenMinutesAgo;
                      const isSender = message?.senderId === user?.id;

                      return (
                        <>
                      <button
                            onClick={() => handleReplyToMessage(messageOptions.messageId!)}
                            className={`w-full px-3 py-2 text-left flex items-center space-x-2 text-sm ${
                              darkMode ? 'hover:bg-gray-700/70' : 'hover:bg-gray-100'
                            }`}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                            <span>Reply</span>
                      </button>
                          {canEdit && (
                      <button
                              onClick={() => handleEditMessage(messageOptions.messageId!)}
                              className={`w-full px-3 py-2 text-left flex items-center space-x-2 text-sm ${
                                darkMode ? 'hover:bg-gray-700/70' : 'hover:bg-gray-100'
                              }`}
                            >
                              <Edit2 size={14} />
                              <span>Edit Message</span>
                      </button>
                          )}
                        <button
                            onClick={() => {
                              setDeleteConfirmation({
                                messageId: messageOptions.messageId!,
                                isSender: isSender,
                                deleteOption: 'me'
                              });
                              setMessageOptions(null);
                            }}
                            className={`w-full px-3 py-2 text-left flex items-center space-x-2 text-sm text-red-500 ${
                              darkMode ? 'hover:bg-gray-700/70' : 'hover:bg-gray-100'
                            }`}
                          >
                            <Trash2 size={14} />
                            <span>Delete Message</span>
                          </button>
                          <button
                            onClick={() => handleMessageInfo(messageOptions.messageId!)}
                            className={`w-full px-3 py-2 text-left flex items-center space-x-2 text-sm ${
                              darkMode ? 'hover:bg-gray-700/70' : 'hover:bg-gray-100'
                            }`}
                          >
                            <Info size={14} />
                            <span>Message Info</span>
                        </button>
                        </>
                      );
                    })()}
                  </motion.div>
                )}

                {/* Delete Confirmation Modal */}
                {deleteConfirmation && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => setDeleteConfirmation(null)}
                  >
                    <motion.div
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.95 }}
                      className={`w-full max-w-sm rounded-xl shadow-lg ${
                        darkMode ? 'bg-gray-800' : 'bg-white'
                      } overflow-hidden`}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className={`p-2 rounded-full ${darkMode ? 'bg-red-500/10' : 'bg-red-50'}`}>
                            <Trash2 className="w-5 h-5 text-red-500" />
                          </div>
                          <h3 className="text-lg font-semibold">Delete message?</h3>
                        </div>
                        
                        {deleteConfirmation.isSender ? (
                          <>
                            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Choose how you want to delete this message:
                            </p>
                            <div className="space-y-3">
                              <label 
                                className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                                  deleteConfirmation.deleteOption === 'me'
                                    ? (darkMode ? 'bg-gray-700/50' : 'bg-gray-100')
                                    : ''
                                }`}
                              >
                        <input
                                  type="radio"
                                  checked={deleteConfirmation.deleteOption === 'me'}
                                  onChange={() => setDeleteConfirmation(prev => prev ? { ...prev, deleteOption: 'me' } : null)}
                          className="hidden"
                        />
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  darkMode ? 'border-gray-600' : 'border-gray-300'
                                }`}>
                                  {deleteConfirmation.deleteOption === 'me' && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                  )}
                    </div>
                                <div className="ml-3">
                                  <p className={`font-medium text-sm ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                    Delete for me
                                  </p>
                                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Remove this message only for you
                                  </p>
                                </div>
                              </label>

                              <label 
                                className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                                  deleteConfirmation.deleteOption === 'all'
                                    ? (darkMode ? 'bg-gray-700/50' : 'bg-gray-100')
                                    : ''
                                }`}
                              >
                                <input
                                  type="radio"
                                  checked={deleteConfirmation.deleteOption === 'all'}
                                  onChange={() => setDeleteConfirmation(prev => prev ? { ...prev, deleteOption: 'all' } : null)}
                                  className="hidden"
                                />
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  darkMode ? 'border-gray-600' : 'border-gray-300'
                                }`}>
                                  {deleteConfirmation.deleteOption === 'all' && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      )}
                    </div>
                                <div className="ml-3">
                                  <p className={`font-medium text-sm ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                    Delete for everyone
                                  </p>
                                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Remove this message for all chat members
                      </p>
                    </div>
                              </label>
                            </div>
                          </>
                        ) : (
                          <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            This message will be removed from your chat history.
                          </p>
                        )}

                        <div className="flex space-x-3 mt-6">
                    <button
                            onClick={() => setDeleteConfirmation(null)}
                            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium ${
                              darkMode 
                                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            } transition-colors duration-200`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(deleteConfirmation.messageId!, deleteConfirmation.deleteOption)}
                            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors duration-200"
                          >
                            Delete
                    </button>
                        </div>
                  </div>
                </motion.div>
                  </motion.div>
                )}

                {/* Message Input */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className={`p-4 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'} bg-inherit`}
                >
                  {replyingTo && (
                    <div className={`mb-2 p-2 pl-3 rounded-lg flex items-center justify-between relative border-l-2 border-blue-500 ${
                      darkMode ? 'bg-gray-800/50' : 'bg-gray-50'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <div className={`w-6 h-6 rounded-full overflow-hidden ${
                          darkMode ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                          {replyingTo.sender.userImage ? (
                            <img
                              src={replyingTo.sender.userImage.startsWith('http') ? replyingTo.sender.userImage : `https://localhost:3000${replyingTo.sender.userImage}`}
                              alt={replyingTo.sender.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className={darkMode ? 'text-gray-400' : 'text-gray-500'} size={12} />
                            </div>
                          )}
                        </div>
                        <div className="text-sm">
                          <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {replyingTo.sender.username}
                          </span>
                          <span className={`mx-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>•</span>
                          <span className={`truncate max-w-[200px] inline-block ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {replyingTo.content}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className={`p-1 rounded-full hover:bg-gray-700/20 transition-colors`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  
                  {/* Media preview */}
                  {mediaPreview && (
                    <div className={`mb-2 p-2 rounded-lg relative ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                      <button
                        onClick={cancelMediaUpload}
                        className={`absolute top-1 right-1 p-1 bg-red-500 rounded-full z-10 text-white`}
                        aria-label="Cancel upload"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      
                      {mediaFile?.type.startsWith('image/') ? (
                        <img
                          src={mediaPreview}
                          alt="Upload preview"
                          className="h-[150px] rounded-lg object-contain mx-auto"
                        />
                      ) : mediaFile?.type.startsWith('video/') ? (
                        <video
                          src={mediaPreview}
                          className="h-[150px] rounded-lg mx-auto"
                          controls
                        />
                      ) : null}
                    </div>
                  )}
                  
                  <form onSubmit={handleSendMessage} className="flex flex-col space-y-2">
                    <div className="flex space-x-2">
                      <div className="flex-1 relative">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className={`absolute left-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full ${
                            darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                          } text-gray-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed z-10`}
                        >
                          <svg 
                            className="w-5 h-5" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" 
                            />
                          </svg>
                        </button>
                        
                        <input
                          type="text"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Type a message..."
                          disabled={isUploading}
                          className={`w-full p-2 pl-10 rounded-lg border ${
                            darkMode 
                              ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' 
                              : 'bg-white border-gray-200'
                          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                        
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          accept="image/*, video/mp4, video/webm, video/quicktime"
                          className="hidden"
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={(!message.trim() && !mediaFile) || isUploading}
                        className={`p-2 rounded-lg ${
                          darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                        } text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isUploading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send size={20} />
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>

                {/* Chat Info Panel */}
                  {showChatInfo && chatInfoData && (
                  <div 
                    className="fixed inset-0 z-[9999]"
                    style={{
                      position: 'fixed',
                      top: 0,
                      right: 0,
                      bottom: 0,
                      left: 0,
                      zIndex: 9999,
                      pointerEvents: 'auto',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                                {messageCategory === 'direct' ? (
                      <UserChatInfoPanel
                        isOpen={true}
                        onClose={() => {
                          console.log("Closing user chat info panel");
                          setShowChatInfo(false);
                        }}
                        userData={{
                          id: chatInfoData.id,
                          username: chatInfoData.username || chatInfoData.name,
                          userImage: chatInfoData.image,
                          createdAt: chatInfoData.createdAt
                        }}
                        onDeleteAllMessages={handleDeleteAllMessages}
                                        />
                                      ) : (
                      <GroupChatInfoEdit
                        isOpen={true}
                        onClose={() => {
                          console.log("Closing group chat info panel");
                          setShowChatInfo(false);
                        }}
                        groupData={{
                          id: chatInfoData.id,
                          name: chatInfoData.name,
                          description: chatInfoData.description,
                          image: chatInfoData.image,
                          ownerId: chatInfoData.ownerId,
                          isEnded: chatInfoData.isEnded,
                          members: chatInfoData.members
                        }}
                        onUpdate={() => {
                          console.log('Group info updated, refreshing group chats');
                          // Use the main fetchGroupChats function instead of creating a duplicate
                          fetchGroupChats();
                        }}
                      />
                    )}
                        </div>
                  )}
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex items-center justify-center"
              >
                <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Select a chat or search for users to start messaging
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Messages;