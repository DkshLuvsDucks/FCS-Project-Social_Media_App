import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Send, User, UserPlus, Users, MoreVertical, Edit2, Trash2, Info, X, Crown, 
  AlertTriangle, AlertOctagon, LogOut, ArrowLeft, Camera, Paperclip, 
  ChevronLeft, Edit, Plus, Menu, Settings, Heart, Eye, CheckCheck, Clock, Image, Film
} from 'lucide-react';
import DarkModeToggle from '../components/DarkModeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../utils/axios';
import { useNavigate, Link } from 'react-router-dom';
import CreateGroupChat from '../components/CreateGroupChat';
import UserChatInfoPanel from '../components/UserChatInfoPanel';
import GroupChatInfoPanel from '../components/GroupChatInfoPanel';
import axios from 'axios';

// Add type declaration for window.editingContentOverride at the top of the file
declare global {
  interface Window {
    editingContentOverride?: string;
  }
}

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
  description?: string;
  image: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isEnded?: boolean;
  createdAt: string; // Add createdAt field
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
  editedAt?: string;
  updatedAt?: string;
  senderId: number;
  receiverId: number;
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

interface SearchUser {
  id: number;
  username: string;
  userImage: string | null;
  email?: string;  // Add email as optional field
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
  position: { x: number; y: number };
  isSender: boolean;
  canEdit?: boolean;
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

// Add interface for group message read status
interface GroupMessageReadStatus {
  userId: number;
  username: string;
  userImage: string | null;
  hasRead: boolean;
  readAt: string | null;
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
  unreadCount: number; // Add unreadCount field
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

// Add a useDebounce hook
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Create a memoized formatTime function
const formatTimeFunc = (date: Date) => {
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};

const Messages = () => {
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const debouncedMessage = useMemo(() => message, [message]); // Use useMemo instead of useDebounce
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
  const messageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Add state for the chat info panel
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [chatInfoData, setChatInfoData] = useState<ChatInfoPanelProps['chatData'] | null>(null);
  const [showGroupChatModal, setShowGroupChatModal] = useState(false);
  const [followingIds, setFollowingIds] = useState<number[]>([]);
  const [followLoading, setFollowLoading] = useState<number[]>([]);
  const [groupMessageInfo, setGroupMessageInfo] = useState<{ message: Message | null, readStatus: GroupMessageReadStatus[] | null }>(
    { message: null, readStatus: null }
  );
  // Update state variables for info panels
  const [showUserInfoPanel, setShowUserInfoPanel] = useState(false);
  const [showGroupInfoPanel, setShowGroupInfoPanel] = useState(false);
  const [selectedUserData, setSelectedUserData] = useState<{
    id: number;
    username: string;
    userImage: string | null;
    createdAt: string;
  } | null>(null);
  const [selectedGroupData, setSelectedGroupData] = useState<{
    id: number;
    name: string;
    description?: string;
    image?: string | null;
    ownerId?: number;
    isEnded?: boolean;
    createdAt?: string; // Add createdAt field
    members?: Array<{
      id: number;
      username: string;
      userImage: string | null;
      isAdmin?: boolean;
      isOwner?: boolean;
    }>;
  } | null>(null);

  // Add API call tracking to prevent duplicate calls
  const apiCallInProgress = useRef<Record<string, boolean>>({});

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

  // Helper function to properly format media URLs
  const getMessageMediaUrl = useCallback((url: string | undefined, msg?: Message): string | undefined => {
    if (!url) return undefined;
    
    // Base URL for API calls
    const baseUrl = import.meta.env.VITE_API_URL || 'https://localhost:3000';
    
    // Extract filename from url
    const filename = url.split('/').pop();
    if (!filename) return undefined;
    
    // Only use the decryption endpoint if the media is explicitly marked as encrypted
    if (msg?.mediaEncrypted && msg?.senderId && msg?.receiverId) {
      return `${baseUrl}/api/messages/media/${filename}?senderId=${msg.senderId}&receiverId=${msg.receiverId}`;
    }
    
    // For unencrypted media, use the direct URL
    return url.startsWith('http') ? url : `${baseUrl}${url}`;
  }, []);

  // Helper function to format user images
  const getImageUrl = (url: string | null): string => {
    if (!url) return ''; // Return empty string instead of null
    return url.startsWith('http') ? url : `https://localhost:3000${url}`;
  };

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // Optimize fetchConversations function using useCallback to prevent recreating on every render
  const fetchConversations = useCallback(async () => {
    // Skip if already fetching
    if (apiCallInProgress.current['conversations']) return;
    
    apiCallInProgress.current['conversations'] = true;
    
    try {
      const controller = new AbortController();
      const { data } = await axiosInstance.get<ConversationResponse[]>(
        '/api/messages/conversations',
        { 
          params: {},
          // @ts-ignore - ignore TypeScript error for signal parameter
          signal: controller.signal
        }
      );
        
        // Map API response to client format
        const mappedConversations: Conversation[] = data.map(conv => ({
          otherUserId: conv.otherUser.id,
          otherUsername: conv.otherUser.username,
          otherUserImage: conv.otherUser.userImage,
          lastMessage: conv.lastMessage || 'No messages yet',
          lastMessageTime: conv.lastMessageTime || new Date().toISOString(),
          unreadCount: conv.unreadCount
        }));
      
      // Sort by date and userId for stability
      mappedConversations.sort((a, b) => {
        const dateA = new Date(a.lastMessageTime).getTime();
        const dateB = new Date(b.lastMessageTime).getTime();
        
        // Primary sort by date
        if (dateB !== dateA) {
          return dateB - dateA; // Most recent first
        }
        
        // Secondary sort by user ID for stability
        return a.otherUserId - b.otherUserId;
      });
        
        setConversations(mappedConversations);
      } catch (err) {
      // @ts-ignore - ignore TypeScript error for axios.isCancel
      if (!(axios.isCancel && axios.isCancel(err))) {
        console.error('Error fetching conversations:', err);
        handleError('Failed to load conversations');
      }
      } finally {
        setLoading(false);
      apiCallInProgress.current['conversations'] = false;
    }
  }, []);
  
  // Optimize fetchGroupChats function
  const fetchGroupChats = useCallback(async () => {
    // Skip if already fetching
    if (apiCallInProgress.current['groupChats']) return;
    
    apiCallInProgress.current['groupChats'] = true;
    
    try {
      const controller = new AbortController();
      const { data } = await axiosInstance.get<GroupChatResponse[]>(
        '/api/group-chats',
        { 
          params: {},
          // @ts-ignore - ignore TypeScript error for signal parameter
          signal: controller.signal
        }
      );
      
      if (!data || !Array.isArray(data)) {
        console.error('Invalid group chats data received:', data);
        apiCallInProgress.current['groupChats'] = false;
        return;
      }
      
      // Process the data to ensure correct formatting for empty messages
      const processedData = data.map((group: GroupChatResponse) => {
        // Extract last message from latestMessage field
        const lastMessageContent = group.latestMessage ? group.latestMessage.content : 'No messages yet';
        const lastMessageTime = group.latestMessage ? group.latestMessage.createdAt : group.createdAt;
        
        // Get unread count from API response
        const unreadCount = typeof group.unreadCount === 'number' ? group.unreadCount : 0;
        
        return {
          id: group.id,
          name: group.name,
          description: group.description,
          image: group.groupImage,
          lastMessage: lastMessageContent,
          lastMessageTime: lastMessageTime,
          unreadCount: unreadCount,
          isEnded: false,
          createdAt: group.createdAt,
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
        const timestampA = new Date(a.lastMessageTime).getTime();
        const timestampB = new Date(b.lastMessageTime).getTime();
        
        // Primary sort by date
        if (timestampB !== timestampA) {
          return timestampB - timestampA; // Most recent first
        }
        
        // Secondary sort by group ID for stability
        return a.id - b.id;
      });
      
      // Set the state with the sorted chats
      setGroupChats(sortedGroupChats);
      
      // If a group chat is currently selected, reset its unread count to 0
      if (messageCategory === 'group' && selectedChat) {
        setGroupChats(prev => prev.map(group => 
          group.id === selectedChat ? { ...group, unreadCount: 0 } : group
        ));
      }
    } catch (err) {
      // @ts-ignore - ignore TypeScript error for axios.isCancel
      if (!(axios.isCancel && axios.isCancel(err))) {
        console.error('Error fetching group chats:', err);
      }
    } finally {
      apiCallInProgress.current['groupChats'] = false;
    }
  }, [messageCategory, selectedChat]);

  // Combine conversations and group chats fetching in a single useEffect
  useEffect(() => {
    const controller = new AbortController();
    
    // Initial data fetch
    fetchConversations();
    fetchGroupChats();
    
    // Set up polling with a longer interval (15s instead of 5s)
    const pollTimer = setInterval(() => {
      if (messageCategory === 'direct') {
        fetchConversations();
      } else {
        fetchGroupChats();
      }
    }, 15000);
    
    // Clean up
    return () => {
      clearInterval(pollTimer);
      controller.abort();
    };
  }, [fetchConversations, fetchGroupChats, messageCategory]);

  // Optimize fetching messages with useCallback and request cancellation
  const fetchMessages = useCallback(async () => {
      if (!selectedChat) {
        setMessages([]);
        return;
      }

    // Skip if already fetching for this chat
    const fetchKey = `messages_${messageCategory}_${selectedChat}`;
    if (apiCallInProgress.current[fetchKey]) return;
    
    apiCallInProgress.current[fetchKey] = true;
    
    const controller = new AbortController();

      try {
        if (messageCategory === 'direct') {
        const { data } = await axiosInstance.get<Message[]>(
          `/api/messages/conversation/${selectedChat}`, 
          {
            params: { includeReplies: true },
            // @ts-ignore - ignore TypeScript error for signal parameter
            signal: controller.signal
          }
        );
          
          // Find the first unread message
          const firstUnreadIndex = data.findIndex(
            msg => !msg.read && msg.senderId !== user?.id
          );
          
          setMessages(data);
          
          // If there are unread messages, scroll to the first unread one
          if (firstUnreadIndex !== -1) {
            setTimeout(() => {
              const messageElement = document.getElementById(`message-${data[firstUnreadIndex].id}`);
              if (messageElement) {
                messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
          } else {
            // If no unread messages, scroll to bottom
            setTimeout(() => {
            const chatContainer = messageContainerRef.current;
              if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
              }
            }, 100);
          }
          
        } else if (messageCategory === 'group') {
          // Verify this group chat exists
          const groupExists = groupChats.some(group => group.id === selectedChat);
          if (!groupExists) {
            console.log(`Group ${selectedChat} not found in current group list, aborting fetch`);
            setMessages([]);
          apiCallInProgress.current[fetchKey] = false;
            return;
          }
          
        const { data } = await axiosInstance.get<Message[]>(
          `/api/group-messages/${selectedChat}`,
          { 
            params: {},
            // @ts-ignore - ignore TypeScript error for signal parameter
            signal: controller.signal
          }
        );
          
          // Find the first unread message
          const firstUnreadIndex = data.findIndex(
            msg => !msg.read && msg.senderId !== user?.id
          );
          
          setMessages(data);
          
          // If there are unread messages, scroll to the first unread one
          if (firstUnreadIndex !== -1) {
            setTimeout(() => {
              const messageElement = document.getElementById(`message-${data[firstUnreadIndex].id}`);
              if (messageElement) {
                messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
          } else {
            // If no unread messages, scroll to bottom
            setTimeout(() => {
            const chatContainer = messageContainerRef.current;
              if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
              }
            }, 100);
          }
        }
      } catch (err) {
      // @ts-ignore - ignore TypeScript error for axios.isCancel
      if (!(axios.isCancel && axios.isCancel(err))) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages');
        setShowError(true);
      }
    } finally {
      apiCallInProgress.current[fetchKey] = false;
    }
    
    return () => {
      controller.abort();
    };
  }, [selectedChat, messageCategory, groupChats, user?.id]);

  // Update the useEffect for fetching messages to use the memoized function
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Implement batch processing for read status updates
  const readStatusQueue = useRef<number[]>([]);
  const isProcessingReadQueue = useRef(false);

  const processReadQueue = useCallback(async () => {
    if (isProcessingReadQueue.current || readStatusQueue.current.length === 0) return;
    
    isProcessingReadQueue.current = true;
    const idsToUpdate = [...readStatusQueue.current];
    readStatusQueue.current = [];
    
    try {
      if (messageCategory === 'direct') {
        await axiosInstance.post('/api/messages/read', { messageIds: idsToUpdate });
        
        // Update messages locally
        setMessages(prev => prev.map(msg => 
          idsToUpdate.includes(msg.id) ? { ...msg, read: true } : msg
        ));
        
        // Update unread count in conversations
        setConversations(prev => prev.map(conv => 
          conv.otherUserId === selectedChat
            ? { ...conv, unreadCount: 0 }
            : conv
        ));
      } else if (messageCategory === 'group' && selectedChat) {
        // For group messages, use the most recent message ID for the batch
        const latestMessageId = Math.max(...idsToUpdate);
        await axiosInstance.post(`/api/group-chats/${selectedChat}/mark-read`, { messageId: latestMessageId });
        
        // Update messages locally
        setMessages(prev => prev.map(msg => 
          idsToUpdate.includes(msg.id) ? { ...msg, read: true } : msg
        ));
        
        // Update unread count in group chats
        setGroupChats(prev => prev.map(group => 
          group.id === selectedChat
            ? { ...group, unreadCount: 0 }
            : group
        ));
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    } finally {
      isProcessingReadQueue.current = false;
      
      // Process any new items that were added while this batch was processing
      if (readStatusQueue.current.length > 0) {
        processReadQueue();
      }
    }
  }, [messageCategory, selectedChat]);

  // Replace the markMessagesAsRead function with a optimized version that uses the queue
  const markMessagesAsRead = useCallback((messageIds: number[]) => {
    if (!messageIds.length) return;
    
    // Add to queue and process
    readStatusQueue.current.push(...messageIds);
    processReadQueue();
  }, [processReadQueue]);

  // Update the intersection observer to use the optimized markMessagesAsRead function
  useEffect(() => {
    if (!selectedChat || !user?.id) return;

    const options = {
      root: messageContainerRef.current,
      threshold: 0.8,
      rootMargin: '0px'
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      const messagesToMark: number[] = [];

      entries.forEach(entry => {
        const messageId = parseInt(entry.target.id.replace('message-', ''));
        const message = messages.find(m => m.id === messageId);

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
  const handleStartConversation = async (userId: number, userImage: string | null, username: string) => {
    try {
      // Check if conversation already exists
      const existingConversation = conversations.find(conv => conv.otherUserId === userId);
      if (existingConversation) {
        handleSelectChat(userId, 'direct');
        return;
      }

      // Create a greeting message with waving emoji
      const messageContent = `Hello @${username}! 👋`;
      
      // Add the new conversation to the list first (optimistic update)
      const newConversation: Conversation = {
        otherUserId: userId,
        otherUsername: username,
        otherUserImage: userImage,
        lastMessage: messageContent,
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0
      };
      
      setConversations(prev => [newConversation, ...prev]);
      
      // Send the greeting message to the API using the correct endpoint
      const { data } = await axiosInstance.post<Message>(`/api/messages/direct/${userId}`, {
        content: messageContent
      });
      
      console.log('New conversation message sent:', data);
      
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
        try {
          // Use the correct endpoint to fetch direct messages
          const { data: messagesData } = await axiosInstance.get<Message[]>(`/api/messages/direct/${userId}`);
        setMessages(messagesData);
        } catch (error) {
          console.error('Error fetching messages for new conversation:', error);
        }
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
    
    // Get the message to check if the current user is the sender
    const message = messages.find(msg => msg.id === messageId);
    if (!message) return;
    
    const isSender = message.sender.id === user?.id;
    
    // Position the menu next to the cursor
    const position = {
      x: e.clientX,
      y: e.clientY
    };

    // Adjust position if menu would go off screen
    const menuWidth = 200;
    const menuHeight = 180; // Approximate height
    
    if (position.x + menuWidth > window.innerWidth) {
      position.x = window.innerWidth - menuWidth - 16;
    }
    
    if (position.y + menuHeight > window.innerHeight) {
      position.y = window.innerHeight - menuHeight - 16;
    }

    // Check if message is older than 15 minutes for edit option display
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const messageDate = new Date(message.createdAt);
    const canEdit = messageDate > fifteenMinutesAgo;

    setMessageOptions({
      messageId,
      position,
      isSender,
      canEdit
    });
  }; // Add the missing semicolon

  const handleEditMessage = async (messageId: number) => {
    console.log('handleEditMessage called with messageId:', messageId);
    
    try {
      // Find the message to edit
      const message = messages.find(msg => msg.id === messageId);
      if (!message) {
        console.log('Message not found for editing:', messageId);
      return;
    }
    
      console.log('Found message to edit:', message);
      
      // First, clear any existing edit state
      setEditingMessage(null);
      
      // Ensure we have the content to edit
      if (message.content === undefined || message.content === null) {
        console.error('Message has no content to edit');
        handleError('Cannot edit this message');
        return;
      }
      
      // Set the edit state immediately without setTimeout
        setEditingMessage({
          id: messageId,
        content: message.content
        });
      
      // Close the message options menu
    setMessageOptions(null);
    } catch (error) {
      console.error('Error preparing message for editing:', error);
      handleError('Failed to edit message. Please try again.');
    }
  };

  const handleSaveEdit = async () => {
    console.log('[SAVE] handleSaveEdit called with editingMessage:', editingMessage);

    if (!editingMessage) {
      console.error('[SAVE] Cannot save edit: editingMessage is null');
      return;
    }
    
    // Safety check - ensure content is not empty
    if (!editingMessage.content || editingMessage.content.trim() === '') {
      console.error('[SAVE] Cannot save edit: content is empty');
      handleError('Cannot save empty message');
      return;
    }
    
    try {
      // Check if message is still within 15 minutes
      const message = messages.find(msg => msg.id === editingMessage.id);
      if (!message) {
        console.error('[SAVE] Cannot save edit: message not found in messages list');
        return;
      }
      
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const messageDate = new Date(message.createdAt);
      
      if (messageDate < fifteenMinutesAgo) {
        console.error('[SAVE] Message is too old to edit');
        handleError('Messages can only be edited within 15 minutes of sending');
        setEditingMessage(null);
        return;
      }

      // Use the override content from the EditMessageForm if available
      const editContent = window.editingContentOverride || editingMessage.content;
      
      // Explicitly log and compare the content values
      console.log('[SAVE] Original message content:', message.content);
      console.log('[SAVE] Editing message content (with override):', editContent);
      
      // Prepare the trimmed content values
      const currentContent = (message.content || '').trim();
      const newContent = (editContent || '').trim();
      
      console.log('[SAVE] Comparing trimmed content - Original:', currentContent, 'New:', newContent);
      
      // Force string conversion and exact comparison
      if (String(currentContent) === String(newContent)) {
        console.log('[SAVE] Message content unchanged, skipping update');
        setEditingMessage(null);
        return;
      }

      console.log('[SAVE] Content has changed! Will proceed with update.');
      
      // Store a local copy of the content to ensure it doesn't get lost
      const contentToSend = newContent;

      let data;
      let endpoint = '';
      
      try {
        if (messageCategory === 'direct') {
          // Make API call for direct messages
          endpoint = `/api/messages/${editingMessage.id}`;
          console.log('[SAVE] Making API call to:', endpoint, 'with content:', contentToSend);
          const response = await axiosInstance.put<UpdatedMessage>(endpoint, {
            content: contentToSend
          });
          data = response.data;
          console.log('[SAVE] Direct message API response:', data);
        } else {
          // Make API call for group messages
          endpoint = `/api/group-messages/${editingMessage.id}`;
          console.log('[SAVE] Making API call to:', endpoint, 'with content:', contentToSend);
          const response = await axiosInstance.put<UpdatedMessage>(endpoint, {
            content: contentToSend
          });
          data = response.data;
          console.log('[SAVE] Group message API response:', data);
        }
        console.log('[SAVE] API call successful');
        
        // Immediately update the message in state with correct content
      const updatedMessage = {
        ...message,
        content: contentToSend,
        isEdited: true,
          editedAt: new Date().toISOString()
      };
        
        console.log('[SAVE] Updating message in state with data:', updatedMessage);
      
      // Update messages in state
        setMessages(prevMessages => {
          const updated = prevMessages.map(msg => 
            msg.id === editingMessage.id ? updatedMessage : msg
          );
          console.log('[SAVE] Messages state updated');
          return updated;
        });
      
      // Update last message in conversation/group if needed
      if (messageCategory === 'direct') {
      setConversations(prev => prev.map(conv => {
        if (conv.otherUserId === selectedChat) {
              console.log('[SAVE] Updating conversation lastMessage');
          return {
            ...conv,
              lastMessage: contentToSend,
            lastMessageTime: new Date().toISOString()
          };
        }
        return conv;
      }));
      } else if (messageCategory === 'group') {
        setGroupChats(prev => prev.map(group => {
          if (group.id === selectedChat) {
              console.log('[SAVE] Updating group chat lastMessage');
            return {
              ...group,
              lastMessage: contentToSend,
              lastMessageTime: new Date().toISOString()
            };
          }
          return group;
        }));
      }
      
      // Clear editing state
        console.log('[SAVE] Clearing editing state');
      setEditingMessage(null);
      
        // Refresh messages to ensure consistency
        setTimeout(() => {
          refreshMessages();
        }, 500);
      
    } catch (error: any) {
        console.error('[SAVE] Error updating message:', error);
        console.error('[SAVE] Error details:', error.response?.data);
        console.error('[SAVE] Status code:', error.response?.status);
        if (error.response?.status === 403) {
          handleError('Messages can only be edited within 15 minutes of sending');
        } else if (error.response?.status === 404) {
          handleError('Message not found or you do not have permission to edit it');
        } else {
          handleError('Failed to update message');
        }
        return;
      }
    } catch (error: any) {
      console.error('[SAVE] Error in handleSaveEdit:', error);
        handleError('Failed to update message');
    }
  };

  const handleDeleteMessage = async (messageId: number, deleteFor: 'me' | 'all') => {
    try {
      if (messageCategory === 'direct') {
        // Use direct message API for DMs
      await axiosInstance.delete(`/api/messages/${messageId}${deleteFor === 'all' ? '?deleteFor=all' : ''}`);
      } else if (messageCategory === 'group') {
        // Use group message API for group messages
        await axiosInstance.delete(`/api/group-messages/${messageId}`);
      }
      
      // Remove the message from the messages list
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      // Update conversations list if it was the last message in a direct chat
      if (messageCategory === 'direct') {
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
      } else if (messageCategory === 'group') {
        // Update group chats list if it was the last message in a group chat
        const updatedGroups = [...groupChats];
        const groupIndex = updatedGroups.findIndex(g => g.id === selectedChat);
        
        if (groupIndex !== -1) {
          const lastMessage = messages
            .filter(msg => msg.id !== messageId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
            
          if (lastMessage) {
            updatedGroups[groupIndex] = {
              ...updatedGroups[groupIndex],
              lastMessage: lastMessage.content || '',
              lastMessageTime: lastMessage.createdAt
            };
            setGroupChats(updatedGroups);
          }
        }
      }
      
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      handleError('Failed to delete message');
    }
  };

  const handleMessageInfo = async (messageId: number) => {
    try {
      // Close message options
      setMessageOptions(null);
      
      // If it's a group message
      if (messageCategory === 'group' && selectedChat) {
        // Find the message in the current messages
        const message = messages.find(m => m.id === messageId);
        if (!message) {
          handleError('Message not found');
          return;
        }
        
        // Fetch read status for group message
        const { data } = await axiosInstance.get<GroupMessageReadStatus[]>(`/api/group-messages/${messageId}/read-status`);
        setGroupMessageInfo({ message, readStatus: data });
      } else {
        // For direct messages, use the existing implementation
      const { data } = await axiosInstance.get<MessageInfo>(`/api/messages/${messageId}/info`);
      setMessageInfo(data);
      }
    } catch (error) {
      handleError('Failed to fetch message info');
    }
  };

  // Add close group message info modal function
  const closeGroupMessageInfo = () => {
    setGroupMessageInfo({ message: null, readStatus: null });
  };

  // Add close message info modal function
  const closeMessageInfo = () => {
    setMessageInfo(null);
  };

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
  const renderMessagePreview = (message: string) => {
    // Check if this is a shared post message
    if (message && message.startsWith('Shared a post by @')) {
      // Extract the username if possible
      const usernameMatch = message.match(/Shared a post by @(\w+)/);
      if (usernameMatch && usernameMatch[1]) {
        return `📤 Shared a post by @${usernameMatch[1]}`;
      }
      return '📤 Shared a post';
    }
    
    // Check if this is an image message
    if (message && message.includes('📷')) {
      return '📷 Sent an image';
    }
    
    // Check if this is a video message
    if (message && message.includes('📹')) {
      return '📹 Sent a video';
    }
    
    if (!message) return '';
    return message.length > 30 ? `${message.substring(0, 30)}...` : message;
  };

  // Memoize the renderMessage function to prevent unnecessary re-renders
  const renderMessage = useCallback((msg: Message) => {
    const isSender = msg.sender.id === user?.id;
    const sameAsPrevious = messages.findIndex(m => m.id === msg.id) > 0 && 
      messages[messages.findIndex(m => m.id === msg.id) - 1].sender.id === msg.sender.id;
    const showDate = messages.findIndex(m => m.id === msg.id) === 0 || 
      new Date(msg.createdAt).toDateString() !== new Date(messages[messages.findIndex(m => m.id === msg.id) - 1].createdAt).toDateString();
    
    // Log if message is being edited
    if (editingMessage && editingMessage.id === msg.id) {
      console.log('Rendering message that is being edited:', msg.id, editingMessage);
    }
    
    // Check if this is a shared post message and render it differently
    if (msg.content && msg.content.startsWith('Shared a post by @') && msg.sharedPostId) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          key={msg.id}
          className={`flex w-full mb-2 ${isSender ? 'justify-end' : 'justify-start'}`}
          id={`message-${msg.id}`}
        >
          <div className="flex flex-col items-start max-w-[85%]">
            {/* Show date separator if needed */}
            {showDate && (
              <div className="w-full flex justify-center my-2">
                <div className={`text-xs py-1 px-3 rounded-full ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                  {new Date(msg.createdAt).toLocaleDateString()}
                </div>
              </div>
            )}
            
            <div className="flex items-end">
              {/* Profile Image */}
              {!isSender && !sameAsPrevious && (
                <div 
                  className="mr-2 w-8 h-8 rounded-full overflow-hidden flex-shrink-0 cursor-pointer"
                  onClick={() => navigate(`/profile/${msg.sender.username}`)}
                >
                  {msg.sender.userImage ? (
                    <img 
                      src={msg.sender.userImage} 
                      alt={msg.sender.username} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}>
                      <User size={14} className={darkMode ? 'text-gray-500' : 'text-gray-600'} />
                    </div>
                  )}
                </div>
              )}
              
              {!isSender && sameAsPrevious && (
                <div className="mr-2 w-8 h-8 flex-shrink-0" />
              )}
                
              <div className="flex flex-col max-w-full">
                {!isSender && !sameAsPrevious && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
                    {msg.sender.username}
                  </div>
                )}
                
                <div
                  className="flex flex-col relative group"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleMessageOptions(e, msg.id);
                  }}
                >
                  {/* Message options button */}
                  <div className={`absolute ${isSender ? '-left-8' : '-right-8'} top-2 opacity-0 group-hover:opacity-100 transition-opacity ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <button
                      onClick={(e) => handleMessageOptions(e, msg.id)}
                      className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors duration-200"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  
                  <SharedPostPreview message={msg} darkMode={darkMode} />
                  
                  {/* Time indicator with read status */}
                  <div className={`flex justify-end items-center mt-1 space-x-1.5 text-[11px] ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {msg.isEdited && (
                      <span className="italic">(edited)</span>
                    )}
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                    {isSender && (
                      <span className="flex items-center">
                        {msg.read ? (
                          <svg viewBox="0 0 16 15" fill="currentColor" className="w-4 h-4">
                            <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.366 0 0 0-.063-.51z"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 16 15" fill="currentColor" className="w-4 h-4">
                            <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.366 0 0 0-.063-.51z"/>
                          </svg>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }
    
    // Regular message rendering for text, media, and replies
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        key={msg.id}
        className={`flex w-full mb-2 ${isSender ? 'justify-end' : 'justify-start'}`}
        id={`message-${msg.id}`}
      >
        <div className="flex flex-col items-start max-w-[85%]">
          {/* Show date separator if needed */}
          {showDate && (
            <div className="w-full flex justify-center my-2">
              <div className={`text-xs py-1 px-3 rounded-full ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                {new Date(msg.createdAt).toLocaleDateString()}
              </div>
            </div>
          )}
          
          <div className="flex items-end">
            {/* Profile Image */}
            {!isSender && !sameAsPrevious && (
              <div 
                className="mr-2 w-8 h-8 rounded-full overflow-hidden flex-shrink-0 cursor-pointer"
                onClick={() => navigate(`/profile/${msg.sender.username}`)}
              >
              {msg.sender.userImage ? (
                <img
                    src={msg.sender.userImage} 
                  alt={msg.sender.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                  }}
                />
              ) : (
                  <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}>
                    <User size={14} className={darkMode ? 'text-gray-500' : 'text-gray-600'} />
                </div>
              )}
            </div>
          )}
                
            {!isSender && sameAsPrevious && (
              <div className="mr-2 w-8 h-8 flex-shrink-0" />
            )}
                
            <div className="flex flex-col max-w-full">
              {!isSender && !sameAsPrevious && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
                  {msg.sender.username}
              </div>
            )}
            
            <div
                className="flex flex-col relative group"
              onContextMenu={(e) => {
                e.preventDefault();
                handleMessageOptions(e, msg.id);
              }}
              >
                {/* Message options button */}
                <div className={`absolute ${isSender ? '-left-8' : '-right-8'} top-2 opacity-0 group-hover:opacity-100 transition-opacity ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <button
                  onClick={(e) => handleMessageOptions(e, msg.id)}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors duration-200"
                >
                  <MoreVertical size={16} />
                </button>
              </div>
                                
                {/* Reply preview if this is a reply to another message */}
                {msg.replyToId && msg.replyTo && (
                  <ReplyPreview message={msg} messages={messages} darkMode={darkMode} />
                )}
                
                {/* Media message - rendered without a text bubble */}
                {msg.mediaUrl ? (
                  <div className="flex flex-col">
                    <div className="overflow-hidden rounded-lg transition-colors duration-200">
                        {msg.mediaType === 'image' ? (
                          <img 
                          src={getMessageMediaUrl(msg.mediaUrl, msg)}
                          alt="Message attachment" 
                          className="max-w-xs rounded-lg"
                          onError={(e) => {
                            console.error('Image load error:', {
                              originalUrl: msg.mediaUrl,
                              processedUrl: getMessageMediaUrl(msg.mediaUrl, msg),
                              encrypted: msg.mediaEncrypted,
                              messageCategory,
                              messageId: msg.id,
                              senderId: msg.senderId,
                              receiverId: msg.receiverId
                            });
                            e.currentTarget.style.display = 'none';
                            const fallback = document.createElement('div');
                            fallback.className = 'flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-500 dark:text-gray-400';
                            fallback.textContent = 'Media not available';
                            e.currentTarget.parentElement?.appendChild(fallback);
                          }}
                        />
                      ) : msg.mediaType === 'video' ? (
                        <video 
                          src={getMessageMediaUrl(msg.mediaUrl, msg)}
                          controls
                          className="max-w-xs rounded-lg"
                          onError={(e) => {
                            console.error('Video load error:', {
                              originalUrl: msg.mediaUrl,
                              processedUrl: getMessageMediaUrl(msg.mediaUrl, msg),
                              encrypted: msg.mediaEncrypted,
                              messageCategory,
                              messageId: msg.id,
                              senderId: msg.senderId,
                              receiverId: msg.receiverId
                            });
                            e.currentTarget.style.display = 'none';
                            const fallback = document.createElement('div');
                            fallback.className = 'flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-500 dark:text-gray-400';
                            fallback.textContent = 'Video not available';
                            e.currentTarget.parentElement?.appendChild(fallback);
                          }}
                        />
                      ) : (
                        <div>Unsupported media type</div>
                      )}
                    </div>
                    
                    {/* Time indicator below media */}
                    <div className={`flex justify-end items-center mt-1 space-x-1.5 text-[9px] ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {msg.isEdited && (
                        <span className="italic mr-1">(edited)</span>
                      )}
                      <span>{formatTime(new Date(msg.createdAt))}</span>
                      {isSender && (
                        <span className="flex items-center">
                          {msg.read ? (
                            <svg viewBox="0 0 16 15" fill="currentColor" className="w-3 h-3 ml-0.5">
                              <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.366 0 0 0-.063-.51z"/>
                            </svg>
                          ) : (
                            <svg viewBox="0 0 16 15" fill="currentColor" className="w-3 h-3 ml-0.5">
                              <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.366 0 0 0-.063-.51z"/>
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Regular text message with bubble */
                  <div 
                    className={`py-2 px-3 min-w-[120px] min-h-[35px] rounded-lg break-words transition-colors duration-200 ${
                      isSender ? (
                        darkMode 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : 'bg-blue-500 text-white rounded-br-none'
                      ) : (
                        darkMode 
                          ? 'bg-gray-800 text-white rounded-bl-none' 
                          : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                      )
                    } ${msg.replyToId ? 'rounded-tl-none' : ''}`}
                    id={`message-${msg.id}`}
                  >
                    {/* System message styling */}
                    {msg.isSystem && (
                      <div className="text-xs italic opacity-75 pb-4">
                        {msg.content}
                      </div>
                    )}
                    
                    {/* Regular text message */}
                    {!msg.isSystem && editingMessage?.id !== msg.id && (
                      <div className="pb-4 overflow-hidden break-words whitespace-normal max-w-[240px] md:max-w-[360px] lg:max-w-[480px]">
                        {msg.content}
                      </div>
                    )}
                    
                    {editingMessage?.id === msg.id && (
                      <div className="w-full pt-1 px-1">
                        <EditMessageForm 
                          editingMessage={editingMessage}
                          setEditingMessage={setEditingMessage}
                          darkMode={darkMode}
                        />
                      </div>
                    )}
                    
                    {/* Time indicator and read status - INSIDE the bubble with absolute positioning */}
                    {editingMessage?.id !== msg.id && (
                      <div className={`absolute bottom-1 right-2 flex items-center space-x-1 text-[9px] ${
                        isSender ? 'text-white/70' : darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {msg.isEdited && (
                          <span className="italic mr-1">(edited)</span>
                        )}
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                        {isSender && (
                        <span className="flex items-center">
                          {msg.read ? (
                              <svg viewBox="0 0 16 15" fill="currentColor" className="w-3 h-3 ml-0.5">
                                <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.366 0 0 0-.063-.51z"/>
                            </svg>
                          ) : (
                              <svg viewBox="0 0 16 15" fill="currentColor" className="w-3 h-3 ml-0.5">
                                <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.366 0 0 0-.063-.51z"/>
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }, [darkMode, editingMessage, user?.id, messages, getMessageMediaUrl]);

  // Update message options menu to include reply option
  const handleReplyToMessage = (messageId: number) => {
    const message = messages.find(msg => msg.id === messageId);
    if (!message) return;
    
    console.log('Replying to message:', message);
    
    // Create appropriate content preview based on message type
    let contentPreview = '';
    
    if (message.mediaUrl) {
      // For media messages
      contentPreview = message.mediaType === 'image' 
        ? '📷 Image' 
        : message.mediaType === 'video' 
          ? '📹 Video' 
          : 'Media';
    } else if (message.sharedPostId) {
      // For shared posts
      contentPreview = '📤 Shared post';
    } else {
      // For text messages
      contentPreview = message.content || '';
    }
    
    // Set reply information consistently for both direct and group messages
      setReplyingTo({
        id: message.id,
      content: contentPreview,
        sender: message.sender
      });
    
      setMessageOptions(null);
    
    // Focus the message input if it's a text reply
    if (!mediaFile) {
      // Short delay to ensure UI has updated
      setTimeout(() => {
        if (messageInputRef.current) {
          messageInputRef.current.focus();
        }
      }, 100);
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
    // Close info panels when changing chats
    if (showUserInfoPanel) {
      setShowUserInfoPanel(false);
    }
    
    if (showGroupInfoPanel) {
      setShowGroupInfoPanel(false);
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
            // Mark group messages as read
            markGroupMessagesAsRead(id);
          }
        } else {
          setSelectedChat(id);
        }
      }, 50); // A little more delay for safety
    } else {
      // Same category, just update the selected chat
      setSelectedChat(id);
      
      // Mark messages as read when selecting a chat
      if (category === 'group') {
        markGroupMessagesAsRead(id);
      }
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
          createdAt: new Date().toISOString(), // Add createdAt field
          members: []
        };
        
      // Add temporary group to the list
        setGroupChats(prev => [temporaryGroup, ...prev]);
        setSelectedChat(groupId);
        setMessageCategory('group');
    });
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
  // Helper function to format message time
  const formatMessageTime = useCallback((date: string) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }, []);

  const renderGroupedMessages = useCallback(() => {
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
      // For system messages - single line pill with no wrapping
      if (group.sender === 0 && group.messages[0].isSystem) {
        const systemMessage = group.messages[0];
        return (
          <div key={`system-${groupIndex}`} className="flex justify-center my-3 px-4 w-full">
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`inline-flex items-center justify-center h-8 px-4 mx-auto rounded-full ${
                darkMode 
                  ? 'bg-gray-800/80 text-gray-300 border border-gray-700/50' 
                  : 'bg-gray-100/80 text-gray-600 border border-gray-200/70'
              } shadow-sm`}
            >
              <span className="text-xs leading-none whitespace-nowrap text-center overflow-hidden text-ellipsis">
                {systemMessage.content}
              </span>
            </motion.div>
          </div>
        );
      }
      
      const isCurrentUser = group.sender === user?.id;
      
      return (
        <div key={`group-${groupIndex}`} className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} mb-8`}>
          {/* Render each message in the group */}
          {group.messages.map((msg, msgIndex) => {
            const isFirstInGroup = msgIndex === 0;
            const isLastInGroup = msgIndex === group.messages.length - 1;
            
            // Check if this is a shared post message
            if (msg.sharedPostId && msg.content?.startsWith('Shared a post by @')) {
            return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={`flex w-full mb-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  id={`message-${msg.id}`}
                  style={{ marginBottom: isLastInGroup ? 0 : '6px' }}
                >
                  <div className="flex flex-col items-start max-w-[85%]">
                    <div className="flex items-end">
                      {/* Profile Image */}
                  {!isCurrentUser && isLastInGroup && (
                    <div 
                          className="mr-2 w-8 h-8 rounded-full overflow-hidden flex-shrink-0 cursor-pointer"
                          onClick={() => navigate(`/profile/${msg.sender.username}`)}
                    >
                      {msg.sender.userImage ? (
                        <img
                              src={msg.sender.userImage} 
                          alt={msg.sender.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                            <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}>
                              <User size={14} className={darkMode ? 'text-gray-500' : 'text-gray-600'} />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!isCurrentUser && !isLastInGroup && (
                        <div className="mr-2 w-8 h-8 flex-shrink-0" />
                  )}
                  
                      <div className="flex flex-col max-w-full">
                    {!isCurrentUser && isFirstInGroup && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
                            {msg.sender.username}
                          </div>
                        )}
                        
                        <div
                          className="flex flex-col relative group"
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleMessageOptions(e, msg.id);
                          }}
                        >
                          {/* Message options button */}
                          <div className={`absolute ${isCurrentUser ? '-left-8' : '-right-8'} top-2 opacity-0 group-hover:opacity-100 transition-opacity ${
                            darkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <button
                              onClick={(e) => handleMessageOptions(e, msg.id)}
                              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors duration-200"
                            >
                              <MoreVertical size={16} />
                            </button>
                      </div>
                          
                          <SharedPostPreview message={msg} darkMode={darkMode} />
                          
                          {/* Time indicator with read status */}
                          {editingMessage?.id !== msg.id && (
                            <div className={`flex justify-end items-center mt-1 space-x-1.5 text-[11px] ${
                              darkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {msg.isEdited && (
                                <span className="italic">(edited)</span>
                              )}
                              <span>{formatMessageTime(msg.createdAt)}</span>
                              {isCurrentUser && (
                                <span className="flex items-center">
                                  {msg.read ? (
                                    <svg viewBox="0 0 16 15" fill="currentColor" className="w-4 h-4">
                                      <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.366 0 0 0-.063-.51z"/>
                                    </svg>
                                  ) : (
                                    <svg viewBox="0 0 16 15" fill="currentColor" className="w-4 h-4">
                                      <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.366 0 0 0-.063-.51z"/>
                                    </svg>
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            }
            
            return (
              <div 
                key={msg.id} 
                      id={`message-${msg.id}`}
                className={`flex w-full ${isCurrentUser ? 'justify-end' : 'justify-start'}`} 
                style={{ marginBottom: isLastInGroup ? 0 : '6px' }}
              >
                <div className="flex items-end max-w-[85%]">
                  {/* Profile Image */}
                  {!isCurrentUser && isLastInGroup && (
                    <div 
                      className="mr-2 w-8 h-8 rounded-full overflow-hidden flex-shrink-0 cursor-pointer"
                      onClick={() => navigate(`/profile/${msg.sender.username}`)}
                    >
                      {msg.sender.userImage ? (
                        <img
                          src={msg.sender.userImage} 
                          alt={msg.sender.username}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                          }}
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}>
                          <User size={14} className={darkMode ? 'text-gray-500' : 'text-gray-600'} />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!isCurrentUser && !isLastInGroup && (
                    <div className="mr-2 w-8 h-8 flex-shrink-0" />
                  )}
                  
                  <div className="flex flex-col">
                    {!isCurrentUser && isFirstInGroup && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
                        {msg.sender.username}
                      </div>
                    )}
                    
                    <div
                      className="flex flex-col relative group"
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleMessageOptions(e, msg.id);
                        }}
                    >
                      {/* Message options button */}
                      <div className={`absolute ${isCurrentUser ? '-left-8' : '-right-8'} top-2 opacity-0 group-hover:opacity-100 transition-opacity ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          <button
                            onClick={(e) => handleMessageOptions(e, msg.id)}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors duration-200"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                        
                      {/* Reply preview if this is a reply to another message */}
                      {msg.replyToId && msg.replyTo && (
                        <ReplyPreview message={msg} messages={messages} darkMode={darkMode} />
                      )}
                      
                      {/* Message bubble */}
                      {msg.mediaUrl ? (
                        // Render media outside of bubble for group chat (same as direct messages)
                        <div className="flex flex-col">
                          <div className="overflow-hidden rounded-lg transition-colors duration-200">
                            {msg.mediaType === 'image' ? (
                              <img 
                                src={getMessageMediaUrl(msg.mediaUrl, msg)}
                                alt="Message media"
                                className="max-w-xs rounded-lg cursor-pointer"
                                onClick={() => {
                                  setMediaPreview(getMessageMediaUrl(msg.mediaUrl, msg) || '');
                                }}
                              />
                            ) : msg.mediaType === 'video' ? (
                              <video 
                                src={getMessageMediaUrl(msg.mediaUrl, msg)}
                                controls
                                className="max-w-xs rounded-lg"
                                onError={(e) => {
                                  console.error('Video load error:', {
                                    originalUrl: msg.mediaUrl,
                                    processedUrl: getMessageMediaUrl(msg.mediaUrl, msg),
                                    encrypted: msg.mediaEncrypted,
                                    messageCategory,
                                    messageId: msg.id,
                                    senderId: msg.senderId,
                                    receiverId: msg.receiverId
                                  });
                                  e.currentTarget.style.display = 'none';
                                  const fallback = document.createElement('div');
                                  fallback.className = 'flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-500 dark:text-gray-400';
                                  fallback.textContent = 'Video not available';
                                  e.currentTarget.parentElement?.appendChild(fallback);
                                }}
                              />
                            ) : null}
                          </div>
                          
                          {/* Time indicator below media */}
                          <div className={`flex justify-end items-center mt-1 space-x-1.5 text-[9px] ${
                            darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {msg.isEdited && (
                              <span className="italic mr-1">(edited)</span>
                            )}
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {isCurrentUser && (
                              <span className="flex items-center ml-1">
                                {msg.read ? (
                                  <svg viewBox="0 0 16 15" fill="currentColor" className="w-3 h-3 ml-0.5">
                                    <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.366 0 0 0-.063-.51z"/>
                                  </svg>
                                ) : (
                                  <svg viewBox="0 0 16 15" fill="currentColor" className="w-3 h-3 ml-0.5">
                                    <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.366 0 0 0-.063-.51z"/>
                                  </svg>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div 
                          className={`py-2 px-3 min-w-[120px] min-h-[35px] rounded-lg break-words relative transition-colors duration-200 ${
                            isCurrentUser 
                              ? darkMode 
                                ? 'bg-blue-600 text-white rounded-br-none' 
                                : 'bg-blue-500 text-white rounded-br-none' 
                              : darkMode 
                                ? 'bg-gray-800 text-white rounded-bl-none' 
                                : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                          } ${msg.replyToId ? 'rounded-tl-none' : ''}`}
                          id={`message-${msg.id}`}
                        >
                          {/* Show edit form if this message is being edited */}
                        {editingMessage?.id === msg.id ? (
                            <div className="w-full pt-1 px-1">
                          <EditMessageForm 
                            editingMessage={editingMessage}
                            setEditingMessage={setEditingMessage}
                            darkMode={darkMode}
                          />
                            </div>
                        ) : (
                            /* Regular message content - only show if not being edited and not a default media message */
                            msg.content && !msg.content.includes('📷') && !msg.content.includes('📹') && (
                              <div className="pb-4 overflow-hidden break-words whitespace-normal max-w-[240px] md:max-w-[360px] lg:max-w-[480px]">
                              {msg.content}
                              </div>
                            )
                          )}
                          
                          {/* Time indicator and read status - only show if not editing */}
                          {editingMessage?.id !== msg.id && (
                            <div className={`absolute bottom-1 right-2 flex items-center space-x-1 text-[9px] ${
                          isCurrentUser ? 'text-white/70' : darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                              {msg.isEdited && (
                                <span className="italic mr-1">(edited)</span>
                          )}
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          {isCurrentUser && (
                                <span className="flex items-center ml-1">
                              {msg.read ? (
                                    <svg viewBox="0 0 16 15" fill="currentColor" className="w-3 h-3 ml-0.5">
                                      <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.366 0 0 0-.063-.51z"/>
                                </svg>
                              ) : (
                                    <svg viewBox="0 0 16 15" fill="currentColor" className="w-3 h-3 ml-0.5">
                                      <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.366 0 0 0-.063-.51z"/>
                                </svg>
                              )}
                            </span>
                          )}
                        </div>
                          )}
                      </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    });
  }, [messages, user?.id, darkMode, editingMessage, formatMessageTime, getMessageMediaUrl]);

  // Helper component for reply previews
  const ReplyPreview = ({ message, messages, darkMode }: { message: Message, messages: Message[], darkMode: boolean }) => {
    if (!message.replyToId) return null;
    
    const originalMessage = messages.find(m => m.id === message.replyToId);
    if (!originalMessage) return null;
    
    // Determine the preview text depending on the type of message
    let previewText = '';
    let previewIcon = null;
    
    // Check if it's a shared post
    if (originalMessage.sharedPostId && originalMessage.content?.startsWith('Shared a post by @')) {
      previewText = 'Shared a post';
      previewIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    );
    }
    // Check if it has media
    else if (originalMessage.mediaUrl) {
      if (originalMessage.mediaType === 'image') {
        previewText = 'Sent an image';
        previewIcon = (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
      } else if (originalMessage.mediaType === 'video') {
        previewText = 'Sent a video';
        previewIcon = (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
      } else {
        previewText = 'Sent media';
        previewIcon = (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      );
      }
    }
    // Regular text message
    else {
      previewText = originalMessage.content || '';
      if (previewText.length > 30) {
        previewText = `${previewText.substring(0, 30)}...`;
      }
    }
    
    return (
      <div 
        className={`flex items-center gap-1 p-1.5 mb-1 border-l-2 rounded-md cursor-pointer ${
          darkMode ? 'border-blue-500/70 bg-gray-800/30' : 'border-blue-500/70 bg-gray-100/50'
        }`}
        onClick={() => {
          // Scroll to original message when clicked
          const element = document.getElementById(`message-${originalMessage.id}`);
          if (element) {
            // First scroll the element into view
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Apply the same highlight effect for both direct messages and group chats
            element.classList.add('bg-blue-500/10', 'dark:bg-blue-500/5');
            
            // Remove highlight after delay
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
              src={originalMessage.sender.userImage}
              alt={originalMessage.sender.username}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className={darkMode ? 'text-gray-500' : 'text-gray-400'} size={10} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <span className={`text-xs font-medium ${
            darkMode ? 'text-blue-400' : 'text-blue-600'
          }`}>
            {originalMessage.sender.username}
          </span>
          <p className={`text-xs truncate flex items-center ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {previewIcon}
            {previewText}
          </p>
        </div>
      </div>
    );
  };

  // Optimize the EditMessageForm component to use memoization
  const EditMessageForm = React.memo(({ 
    editingMessage, 
    setEditingMessage, 
    darkMode
  }: { 
    editingMessage: { id: number; content: string },
    setEditingMessage: React.Dispatch<React.SetStateAction<{ id: number; content: string } | null>>,
    darkMode: boolean
  }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editContent, setEditContent] = useState(editingMessage.content);
    const contentRef = useRef(editContent);
    
    // Keep the ref updated with the latest content
    useEffect(() => {
      contentRef.current = editContent;
    }, [editContent]);
    
    // Update local state when editingMessage changes
    useEffect(() => {
      console.log('[EDIT FORM] Received new editingMessage:', editingMessage);
      setEditContent(editingMessage.content);
      contentRef.current = editingMessage.content;
    }, [editingMessage]);
    
    // Handle message save
    const handleSave = useCallback(async () => {
      console.log('[EDIT FORM] Save button clicked');
      if (isSubmitting) {
        console.log('[EDIT FORM] Already submitting, ignoring click');
          return;
        }
        
      const trimmedContent = editContent.trim();
      if (!trimmedContent) {
        console.log('[EDIT FORM] Empty content, ignoring save');
          return;
        }

      console.log('[EDIT FORM] Current content value in state:', editContent);
      console.log('[EDIT FORM] Current content value in ref:', contentRef.current);
      console.log('[EDIT FORM] Setting isSubmitting to true');
      setIsSubmitting(true);
      
      try {
        console.log('[EDIT FORM] Current edit content to save:', trimmedContent);
        
        // Get a direct reference to the content we want to save
        const finalContentToSave = trimmedContent;
        
        // Pass our own local finalContentToSave instead of relying on the state update
        const performSave = async () => {
          try {
            // First update the parent editingMessage state with our local content
            setEditingMessage(prev => {
              if (!prev) return null;
              // Use our direct reference to trimmedContent
              const updated = { ...prev, content: finalContentToSave };
              console.log('[EDIT FORM] Updated parent state with content:', finalContentToSave);
              return updated;
            });
            
            // Wait for state to update
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Override the editingMessage with our content to ensure consistency
            window.editingContentOverride = finalContentToSave;
            
            // Call handleSaveEdit with confirmation of our content
            console.log('[EDIT FORM] Calling handleSaveEdit with content:', finalContentToSave);
            await handleSaveEdit();
            
            // Clear the override
            delete window.editingContentOverride;
            
            console.log('[EDIT FORM] handleSaveEdit completed successfully');
          } catch (error) {
            delete window.editingContentOverride;
            throw error;
          }
        };
        
        await performSave();
      } catch (error) {
        console.error('[EDIT FORM] Error in handleSave:', error);
        handleError('Failed to save edit. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }, [isSubmitting, editContent, setEditingMessage, handleSaveEdit, handleError]);
    
    // Handle form cancellation
    const handleCancel = useCallback(() => {
      setEditingMessage(null);
    }, [setEditingMessage]);
    
    // Handle keyboard shortcuts
    const handleFormKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
    }, [handleCancel, handleSave]);
    
    // Handle content changes
    const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      console.log('[EDIT FORM] Content changed to:', newValue);
      setEditContent(newValue);
      contentRef.current = newValue;
    }, []);
    
    return (
      <div className="edit-message-form w-full">
        <textarea
          value={editContent}
          onChange={handleContentChange}
          onKeyDown={handleFormKeyDown}
          className={`w-full min-h-[60px] p-2 rounded-md focus:outline-none focus:ring-1 ${
            darkMode 
              ? 'bg-gray-700 text-white focus:ring-blue-500' 
              : 'bg-gray-100 text-gray-900 focus:ring-blue-500'
          }`}
          autoFocus
        />
        
        <div className="flex justify-end space-x-2 mt-2">
          <button
            type="button"
            onClick={handleCancel}
            className={`px-3 py-1 rounded-md text-sm ${
              darkMode 
                ? 'bg-gray-700 text-white hover:bg-gray-600' 
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
              disabled={isSubmitting}
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            className={`px-3 py-1 rounded-md text-sm ${
              isSubmitting 
                ? 'bg-blue-500/50 text-white/70 cursor-not-allowed' 
                : darkMode 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  });

  // Create a memoized formatTime function
  const formatTime = useCallback(formatTimeFunc, []);

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
        <span key={i} className="font-bold text-blue-500">
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
            lastMessageText = mediaType === 'image' ? '📷 Sent a picture' : '📹 Sent a video';
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

  // Define PostDetails interface at the module level
    interface PostDetails {
      id: number;
      content: string | null;
      mediaUrl: string | null;
      mediaType: string | null;
      mediaHash?: string | null;
      author: {
        username: string;
        userImage: string | null;
      };
    }
    
  // Create a more robust cache for shared posts
  const sharedPostCache = new Map<number, {
    data: PostDetails;
    timestamp: number;
    expiresAt: number;
  }>();

  const CACHE_DURATION = 15 * 60 * 1000; // Extend cache to 15 minutes

  // Add a function to properly format API URLs
  const formatApiUrl = (url: string): string => {
    if (!url) return '';
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'https://localhost:3000';
      return url.startsWith('/') ? `${baseUrl}${url}` : url;
    } catch (err) {
      console.error('Error formatting URL:', err, url);
      return url; // Return original URL if formatting fails
    }
  };

  // Use session storage to cache post data across page refreshes
  const getPostFromStorage = useCallback((postId: number): PostDetails | null => {
    try {
      const key = `post_cache_${postId}`;
      const storedData = sessionStorage.getItem(key);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        const now = Date.now();
        if (now < parsed.expiresAt) {
          return parsed.data;
        } else {
          // Clear expired data
          sessionStorage.removeItem(key);
        }
      }
      return null;
    } catch (e) {
      console.error('Error retrieving post from storage:', e);
      return null;
    }
  }, []);

  const setPostInStorage = useCallback((postId: number, data: PostDetails): void => {
    try {
      const key = `post_cache_${postId}`;
      const storageData = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_DURATION
      };
      sessionStorage.setItem(key, JSON.stringify(storageData));
    } catch (e) {
      console.error('Error saving post to storage:', e);
    }
  }, [CACHE_DURATION]);

  // Completely reimplemented SharedPostPreview component with better caching
  const SharedPostPreview = React.memo(({ message, darkMode }: { message: Message, darkMode: boolean }) => {
    const postId = message.sharedPostId;
    
    // Skip debug logging to reduce console spam
    // console.log('SharedPostPreview: Rendering with message ID:', message.id, 'sharedPostId:', message.sharedPostId);
    
    const [post, setPost] = useState<PostDetails | null>(() => {
      // Initialize from cache if available
      if (postId) {
        // First check memory cache
        if (sharedPostCache.has(postId)) {
          const cachedItem = sharedPostCache.get(postId);
          if (cachedItem && Date.now() < cachedItem.expiresAt) {
            return cachedItem.data;
          }
        }
        // Then check session storage
        const storedPost = getPostFromStorage(postId);
        if (storedPost) return storedPost;
      }
      return null;
    });
    
    const [loading, setLoading] = useState(!post);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const mounted = useRef(true);
    const fetchingRef = useRef(false);
    
    // Clean up on unmount
    useEffect(() => {
      mounted.current = true;
      return () => {
        mounted.current = false;
      };
    }, []);

    // Fetch post data only when needed (not on every render)
    useEffect(() => {
      // Skip if no shared post ID
      if (!postId || post || fetchingRef.current) {
        return;
      }
      
      fetchingRef.current = true;
      
      const fetchPostData = async () => {
        try {
          // Check cache first (memory and session storage check already done in useState)
          
          // Make API request
          try {
            const response = await axiosInstance.get<PostDetails>(`/api/posts/${postId}`);
            
            if (!mounted.current) {
              return;
            }
            
            if (response.data) {
              // Format URLs in post data
              const postData = response.data;
              
              const formattedData: PostDetails = {
                ...postData,
                mediaUrl: postData.mediaUrl ? formatApiUrl(postData.mediaUrl) : null,
                author: {
                  ...postData.author,
                  userImage: postData.author.userImage ? formatApiUrl(postData.author.userImage) : null
                }
              };
              
              // Update state
              if (!mounted.current) return;
              setPost(formattedData);
              
              // Store in memory cache
              sharedPostCache.set(postId, {
                data: formattedData,
                timestamp: Date.now(),
                expiresAt: Date.now() + CACHE_DURATION
              });
              
              // Store in session storage
              setPostInStorage(postId, formattedData);
            } else {
              if (!mounted.current) return;
              setError("Post unavailable");
            }
          } catch (apiErr: any) {
            if (!mounted.current) return;
            
            setError(
              apiErr.response?.status === 404 ? "Post not found" :
              apiErr.response?.status === 403 ? "Access denied" :
              "Failed to load post"
            );
          }
        } catch (err) {
          if (mounted.current) {
            setError("Error loading post");
          }
        } finally {
          fetchingRef.current = false;
          if (mounted.current) {
            setLoading(false);
          }
        }
      };
      
      fetchPostData();
    }, [postId, post, formatApiUrl, setPostInStorage]);
    
    // Helper to handle post click
    const handlePostClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      if (postId) {
        navigate(`/post/${postId}`);
      }
    }, [postId, navigate]);
    
    // Render loading state
    if (loading) {
      return (
        <div className={`mx-1 my-1 rounded-md overflow-hidden border shadow-sm ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`} style={{ maxWidth: "280px" }}>
          <div className="p-3">
            <div className="flex items-center space-x-2 animate-pulse">
              <div className={`w-8 h-8 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
              <div className="flex-1">
                <div className={`h-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-1/2 mb-1`}></div>
              </div>
            </div>
            <div className={`mt-3 h-40 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-full animate-pulse`}></div>
          </div>
        </div>
      );
    }
    
    // Render error state
    if (error || !post) {
      return (
        <div className={`mx-1 my-1 rounded-md overflow-hidden border shadow-sm ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`} style={{ maxWidth: "280px" }}>
          <div className={`p-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="flex items-center">
              <AlertTriangle size={16} className="mr-2 text-yellow-500" />
              <span className="text-sm">{error || "Post unavailable"}</span>
            </div>
          </div>
        </div>
      );
    }
    
    // Determine if the post has a video
    const isVideo = post.mediaType === 'video' || 
                    (post.mediaUrl && /\.(mp4|mov|avi|wmv)$/i.test(post.mediaUrl));
    
    // Render post
    return (
      <div 
        className={`mx-1 my-1 rounded-md overflow-hidden border shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}
        onClick={handlePostClick}
        style={{ maxWidth: "280px" }}
      >
        {/* User info header */}
        <div className={`p-2 flex items-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          {post.author.userImage ? (
            <img 
              src={post.author.userImage} 
              alt={post.author.username}
              className="w-8 h-8 rounded-full"
              loading="lazy"
                onError={(e) => {
                console.log('SharedPostPreview: User image failed to load:', post.author.userImage);
                  e.currentTarget.style.display = 'none';
                // Replace with fallback SVG
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const svgEl = document.createElement('div');
                  svgEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-gray-400" stroke="currentColor"><circle cx="12" cy="7" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>`;
                  svgEl.className = 'w-8 h-8 text-gray-400';
                  parent.appendChild(svgEl);
                }
                }}
              />
            ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-gray-400" stroke="currentColor">
                <circle cx="12" cy="7" r="4" />
                <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
              </svg>
            </div>
          )}
          <div className="ml-2">
            <div className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {post.author.username}
          </div>
          </div>
        </div>
        
        {/* Post media content */}
        {post.mediaUrl && (
          <div className="relative overflow-hidden" style={{ height: "180px" }}>
            {isVideo ? (
              <div className="w-full h-full bg-black flex items-center justify-center">
              <video 
                  preload="metadata"
                controls
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    console.log('SharedPostPreview: Video failed to load:', post.mediaUrl);
                    e.currentTarget.style.display = 'none';
                    // Add a fallback message
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'text-sm text-gray-500 p-4 flex items-center justify-center';
                      errorDiv.innerHTML = '<svg class="w-5 h-5 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>Video unavailable';
                      parent.appendChild(errorDiv);
                    }
                  }}
                >
                  <source src={post.mediaUrl} />
                  <div className="text-sm text-gray-500 p-4">
                    This browser does not support video playback
                  </div>
                </video>
              </div>
            ) : (
              <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <img 
                  src={post.mediaUrl}
                  alt="Post content"
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                onError={(e) => {
                    console.log('SharedPostPreview: Image failed to load:', post.mediaUrl);
                  e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'text-sm text-gray-500 p-4 flex items-center justify-center';
                      errorDiv.innerHTML = '<svg class="w-5 h-5 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>Image unavailable';
                      parent.appendChild(errorDiv);
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}
        
        {/* Post caption */}
        {post.content && (
          <div className={`px-3 py-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <p className="text-sm line-clamp-2">{post.content}</p>
          </div>
        )}
      </div>
    );
  });

  // Remove excessive logging from group chat rendering
  useEffect(() => {
    // We don't need to log every group chat state change
    // This was causing excessive console output
  }, [groupChats]);

  // Add refreshMessages definition before it's used
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const refreshMessages = useCallback(() => {
    if (!selectedChat) return;
    
    // Don't refresh if already fetching
    const fetchKey = `messages_${messageCategory}_${selectedChat}`;
    if (apiCallInProgress.current[fetchKey]) {
      return;
    }
    
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    
    // Add a small timeout to debounce multiple calls
    refreshTimerRef.current = setTimeout(() => {
      fetchMessages();
      refreshTimerRef.current = null;
    }, 1000);
  }, [selectedChat, messageCategory, fetchMessages]);
  
  // Replace the refresh effect that runs after editing
  useEffect(() => {
    if (!editingMessage && messages.length > 0) {
      // After editing is done (editingMessage becomes null), refresh messages
      // Using our new debounced refresh function
      refreshMessages();
    }
  }, [editingMessage, messages.length, refreshMessages]);

  // Message Options Menu
  const MessageOptionsMenu = ({ 
    options, 
    position, 
    onClose, 
    onEdit, 
    onDelete, 
    onReply, 
    onInfo,
    isSender
  }: { 
    options: MessageOptions, 
    position: { x: number, y: number }, 
    onClose: () => void, 
    onEdit: (messageId: number) => void, 
    onDelete: (messageId: number) => void, 
    onReply: (messageId: number) => void, 
    onInfo: (messageId: number) => void,
    isSender: boolean
  }) => {
    const { darkMode } = useDarkMode();
    
    // Handle null options
    if (!options || !options.messageId) return null;
    
    const messageId = options.messageId;
    
    // Check if this is a shared post
    const message = messages.find(msg => msg.id === messageId);
    const isSharedPost = message?.content?.startsWith('Shared a post by @') && message?.sharedPostId;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`fixed z-50 min-w-[180px] rounded-lg shadow-lg message-options ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        } border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
        style={{ 
          top: position.y, 
          left: position.x,
        }}
      >
        <div className="py-1">
          {/* Reply Option */}
          <button
            onClick={() => {
              onReply(messageId);
              onClose();
            }}
            className={`w-full text-left px-4 py-2 flex items-center ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span>Reply</span>
          </button>
          
          {/* Edit Option - Only for sender, not for shared posts, not for media content, and only for messages less than 15 minutes old */}
          {isSender && !isSharedPost && options.canEdit && !(message?.mediaUrl) && (
            <button
              onClick={() => {
                console.log('Edit button clicked for message ID:', messageId); // Add debug log
                onEdit(messageId);
                onClose();
              }}
              className={`w-full text-left px-4 py-2 flex items-center ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit</span>
            </button>
          )}
          
          {/* Delete Option */}
          <button
            onClick={() => {
              onDelete(messageId);
              onClose();
            }}
            className={`w-full text-left px-4 py-2 flex items-center ${
              darkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-500'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Delete</span>
          </button>
          
          {/* Message Info Option - Only show for our own messages */}
          {isSender && (
            <button
              onClick={() => {
                onInfo(messageId);
                onClose();
              }}
              className={`w-full text-left px-4 py-2 flex items-center ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Info</span>
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  // Handle opening user chat info panel
  const handleOpenUserInfo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedChat) return;
    
    const selectedChatData = conversations.find(c => c.otherUserId === selectedChat);
    if (!selectedChatData) return;
    
    setSelectedUserData({
      id: selectedChat,
      username: selectedChatData.otherUsername,
      userImage: selectedChatData.otherUserImage,
      createdAt: new Date().toISOString()
    });
    
    setShowUserInfoPanel(true);
  };
  
  // Handle opening group chat info panel
  const handleOpenGroupInfo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedChat) return;
    
    const selectedGroupData = groupChats.find(g => g.id === selectedChat);
    if (!selectedGroupData) return;
    
    setSelectedGroupData({
      id: selectedChat,
      name: selectedGroupData.name,
      description: selectedGroupData.description,
      image: selectedGroupData.image,
      ownerId: selectedGroupData.members?.find(m => m.isOwner)?.id,
      isEnded: selectedGroupData.isEnded,
      createdAt: selectedGroupData.createdAt, // Add createdAt field
      members: selectedGroupData.members
    });
    
    setShowGroupInfoPanel(true);
  };

  // Add polling effect for conversations and group chats
  useEffect(() => {
    // Function to fetch conversations with preserved unread counts for selected chat
    const fetchConversationsData = async () => {
      try {
        const { data } = await axiosInstance.get<ConversationResponse[]>('/api/messages/conversations');
        
        // Map API response to client format and sort by most recent message
        const sortedConversations = data
          .map(conv => ({
            otherUserId: conv.otherUser.id,
            otherUsername: conv.otherUser.username,
            otherUserImage: conv.otherUser.userImage,
            lastMessage: conv.lastMessage || 'No messages yet',
            lastMessageTime: conv.lastMessageTime || new Date().toISOString(),
            // Keep unread count at 0 for the currently selected chat
            unreadCount: (messageCategory === 'direct' && conv.otherUser.id === selectedChat) 
              ? 0 
              : conv.unreadCount
          }))
          .sort((a, b) => {
            // Ensure consistent sorting with multiple criteria
            const timestampA = new Date(a.lastMessageTime).getTime();
            const timestampB = new Date(b.lastMessageTime).getTime();
            
            // Primary sort by date
            if (timestampB !== timestampA) {
              return timestampB - timestampA; // Most recent first
            }
            
            // Secondary sort by user ID for stability when timestamps are identical
            return a.otherUserId - b.otherUserId;
          });
        
        console.log('Sorted conversations:', sortedConversations.map(c => `${c.otherUsername} (${c.otherUserId}): ${new Date(c.lastMessageTime).toISOString()}`));
        setConversations(sortedConversations);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      }
    };

    // Function to fetch group chats
    const fetchGroupChatsData = async () => {
      try {
        // Save scroll position before update
        const messageContainer = messageContainerRef.current;
        const scrollPos = messageContainer?.scrollTop;
        const isAtBottom = messageContainer && 
          (messageContainer.scrollHeight - messageContainer.scrollTop - messageContainer.clientHeight < 20);
        
        await fetchGroupChats();
        
        // Restore scroll position after update
        if (messageContainer && scrollPos !== undefined) {
          setTimeout(() => {
            if (isAtBottom) {
              messageContainer.scrollTop = messageContainer.scrollHeight;
            } else {
              messageContainer.scrollTop = scrollPos;
            }
          }, 50);
        }
      } catch (error) {
        console.error('Error fetching group chats:', error);
      }
    };

    // Set up polling based on active category
    const pollingInterval = setInterval(() => {
      if (messageCategory === 'direct') {
        fetchConversationsData();
      } else {
        fetchGroupChatsData();
      }
    }, 5000); // Poll every 5 seconds

    // Initial fetch
    if (messageCategory === 'direct') {
      fetchConversationsData();
    } else {
      fetchGroupChatsData();
    }

    // Cleanup
    return () => clearInterval(pollingInterval);
  }, [messageCategory]); // Dependency on messageCategory to restart polling when switching tabs

  // Add function to mark group messages as read
  const markGroupMessagesAsRead = async (groupId: number) => {
    try {
      // Find the selected group
      const group = groupChats.find(g => g.id === groupId);
      if (!group || group.unreadCount === 0) return;
      
      // Mark all messages as read in the group
      await axiosInstance.post(`/api/group-chats/${groupId}/mark-read`);
      
      // Update local unread count
      setGroupChats(prev => prev.map(g => 
        g.id === groupId ? { ...g, unreadCount: 0 } : g
      ));
    } catch (error) {
      console.error('Error marking group messages as read:', error);
    }
  };

  // Add useEffect for intersection observer to mark messages as read
  useEffect(() => {
    if (!selectedChat || !messages.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const unreadMessageIds: number[] = [];
        
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const messageId = parseInt(entry.target.id.replace('message-', ''));
            const message = messages.find(m => m.id === messageId);
            
            if (message && !message.read && message.senderId !== user?.id) {
              unreadMessageIds.push(messageId);
            }
          }
        });
        
        if (unreadMessageIds.length > 0) {
          // Mark these messages as read
          markMessagesAsRead(unreadMessageIds);
        }
      },
      {
        root: document.querySelector('.messages-container'),
        threshold: 0.5 // Message is considered read when 50% visible
      }
    );

    // Observe all unread messages
    messages.forEach(message => {
      if (!message.read && message.senderId !== user?.id) {
        const element = document.getElementById(`message-${message.id}`);
        if (element) {
          observer.observe(element);
        }
      }
    });

    return () => observer.disconnect();
  }, [selectedChat, messages, user?.id]);

  // Memoize the input handlers
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }
  }, []);

  // Memoize the placeholder text
  const inputPlaceholder = useMemo(() => {
    if (mediaFile) return 'Media will be sent...';
    const targetName = messageCategory === 'direct'
      ? conversations.find(c => c.otherUserId === selectedChat)?.otherUsername || '...'
      : groupChats.find(g => g.id === selectedChat)?.name || '...';
    return `Message ${targetName}`;
  }, [mediaFile, messageCategory, selectedChat, conversations, groupChats]);

  // Memoize the input styles
  const inputStyles = useMemo(() => {
    const baseStyles = 'w-full py-2 px-3 rounded-full focus:outline-none transition-all';
    const darkStyles = `bg-gray-800 ${mediaFile ? 'text-gray-500' : 'text-white'} placeholder-gray-500 border border-gray-700`;
    const lightStyles = `bg-gray-100 ${mediaFile ? 'text-gray-400' : 'text-gray-900'} placeholder-gray-500 border border-gray-200`;
    return `${baseStyles} ${darkMode ? darkStyles : lightStyles}`;
  }, [darkMode, mediaFile]);

  // Memoize the MessageInput component
  const MessageInput = useMemo(() => (
    <input
      type="text"
      value={message}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      placeholder={inputPlaceholder}
      className={inputStyles}
      disabled={isUploading || !!mediaFile}
      ref={messageInputRef}
    />
  ), [message, handleInputChange, handleKeyDown, inputPlaceholder, inputStyles, isUploading, mediaFile]);

  // Add new functions for handling media files
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      handleError('Only images and videos are allowed');
      return;
    }

    // Validate file size (10MB max)
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeInBytes) {
      handleError('File size exceeds 10MB limit');
      return;
    }

    // Clear existing message text when media is selected
    setMessage('');
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const cancelMediaUpload = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(null);
    setMediaPreview(null);
    setMessage(''); // Clear the message when canceling media upload
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Add a function to fetch suggested users
  const fetchSuggestedUsers = useCallback(async () => {
    if (!user?.id || messageCategory !== 'direct') return;
    
    setLoadingSuggestions(true);
    
    try {
      // Fetch users the current user might want to message
      // First try to get mutual followers
      const { data: followData } = await axiosInstance.get<FollowData>('/api/users/follows');
      
      // Filter to get mutual followers (users who follow the current user and are followed by the current user)
      const mutualFollowers = followData.followers.filter(follower => 
        followData.following.some(following => following.id === follower.id)
      );
      
      // Map to the SuggestedUser format
      const mutualSuggestions: SuggestedUser[] = mutualFollowers.map(user => ({
        id: user.id,
        username: user.username,
        userImage: user.userImage,
        type: 'mutual'
      }));
      
      // If we have enough mutual followers, use those
      if (mutualSuggestions.length >= 5) {
        setSuggestedUsers(mutualSuggestions.slice(0, 8));
        setLoadingSuggestions(false);
        return;
      }
      
      // Otherwise, also include users that the current user has requested to follow
      const pendingSuggestions: SuggestedUser[] = followData.following
        .filter(following => !mutualFollowers.some(mutual => mutual.id === following.id))
        .map(user => ({
          id: user.id,
          username: user.username,
          userImage: user.userImage,
          type: 'pending'
        }));
      
      // Combine both types of suggestions
      const allSuggestions = [...mutualSuggestions, ...pendingSuggestions].slice(0, 8);
      setSuggestedUsers(allSuggestions);
      
    } catch (error) {
      console.error('Error fetching suggested users:', error);
      // Set an empty array if there's an error
      setSuggestedUsers([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [user?.id, messageCategory]);

  // Add an effect to fetch suggested users when the component mounts or when messageCategory changes
  useEffect(() => {
    if (messageCategory === 'direct') {
      fetchSuggestedUsers();
    }
  }, [messageCategory, fetchSuggestedUsers]);

  // Add a helper function to handle user selection that's missing in the code
  const handleUserSelect = useCallback((userId: number, userImage: string | null, username: string) => {
    handleStartConversation(userId, userImage, username);
  }, [handleStartConversation]);

  // Function to search for users
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    console.log('Starting user search with query:', query);

    try {
      const encodedQuery = encodeURIComponent(query.trim());
      console.log('Sending search request with encoded query:', encodedQuery);
      
      const { data } = await axiosInstance.get<SearchUser[]>(`/api/users/search?query=${encodedQuery}`);
      
      console.log('Search API response data:', data);
      console.log('Current user ID:', user?.id);
      console.log('Current conversations:', conversations.map(c => c.otherUserId));
      
      // Only filter out the current user, don't filter existing conversations
      // This allows users to search for people they already have conversations with
      const filteredResults = data.filter(searchUser => searchUser.id !== user?.id);
      
      console.log('Filtered search results:', filteredResults);
      
      // Force re-render by creating a new array
      setSearchResults([...filteredResults]);
      console.log('Set search results:', filteredResults.length);
      
      // Force component update by triggering a small state change
      setIsSearching(false);
    } catch (error) {
      console.error('Error searching for users:', error);
      setSearchResults([]);
      setError('Failed to search for users');
      setShowError(true);
      // Auto-hide the error after 3 seconds
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => {
        setShowError(false);
      }, 3000);
    } finally {
      setIsSearching(false);
    }
  }, [user?.id]); // Only depend on user ID, not conversations

  // Effect to trigger search when the query changes
  useEffect(() => {
    // Change to search after at least 1 character (instead of 2)
    if (searchQuery.trim().length >= 1) {
      console.log(`Search query has ${searchQuery.trim().length} characters, setting up debounced search`);
      // Add debouncing to prevent too many API calls
      const timer = setTimeout(() => {
        console.log('Debounce timer completed, executing search for:', searchQuery);
        searchUsers(searchQuery);
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
      console.log(`Search query too short (${searchQuery.trim().length} chars), clearing results`);
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery, searchUsers]);

  // Memoize the form submission handler
  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
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
        
        const mediaUploadEndpoint = messageCategory === 'group' 
          ? '/api/group-messages/upload-media'
          : `/api/messages/upload-media${messageCategory === 'direct' ? `?receiverId=${selectedChat}` : ''}`;
        
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

      const messageData: any = {};
      const contentMessage = mediaFile 
        ? (mediaType === 'image' ? '📷 Sent an image' : '📹 Sent a video')
        : message.trim();
      
      if (contentMessage) {
        messageData.content = contentMessage;
      }
      
      if (mediaUrl) {
        messageData.mediaUrl = mediaUrl;
        messageData.mediaType = mediaType;
      }

      const endpoint = messageCategory === 'direct'
        ? `/api/messages/direct/${selectedChat}`
        : `/api/group-messages/${selectedChat}/send`;
      
      const { data: newMessage } = await axiosInstance.post<Message>(endpoint, messageData);
      
      // Update messages with the new message
      setMessages(prev => [...prev, newMessage]);
      
      // Update conversations or group chats
      const updateData = {
        lastMessage: contentMessage,
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0
      };
      
      if (messageCategory === 'direct') {
        setConversations(prev => 
          prev.map(conv => 
            conv.otherUserId === selectedChat 
              ? { ...conv, ...updateData }
              : conv
          ).sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime())
        );
      } else {
        setGroupChats(prev => 
          prev.map(group => 
            group.id === selectedChat 
              ? { ...group, ...updateData }
              : group
          ).sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime())
        );
      }
      
      // Reset states
      setMessage('');
      setReplyingTo(null);
      setMediaFile(null);
      setMediaPreview(null);
      setIsUploading(false);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Scroll to bottom if needed
      if (shouldScrollToBottom && messageContainerRef.current) {
        requestAnimationFrame(() => {
          if (messageContainerRef.current) {
            messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
          }
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsUploading(false);
      handleError('Failed to send message');
    }
  }, [message, mediaFile, selectedChat, messageCategory, handleError]);

  // Memoize the form component
  const MessageForm = useMemo(() => (
    <form 
      onSubmit={handleFormSubmit}
      className={`p-3 border-t flex items-center space-x-3 ${
        darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
      }`}
    >
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={`p-2.5 rounded-full flex-shrink-0 transition-colors ${
          darkMode 
            ? `${isUploading ? 'bg-gray-800 cursor-not-allowed' : mediaFile ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'} text-gray-300` 
            : `${isUploading ? 'bg-gray-100 cursor-not-allowed' : mediaFile ? 'bg-blue-500' : 'bg-gray-100 hover:bg-gray-200'} text-gray-600`
        }`}
        disabled={isUploading}
        aria-label="Attach a file"
      >
        <Image size={18} className={mediaFile ? 'text-white' : ''} />
      </button>
      
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,video/*"
        onChange={handleFileSelect}
      />
      
      <div className={`relative flex-1 ${mediaFile ? (darkMode ? 'opacity-60' : 'opacity-70') : ''}`}>
        {MessageInput}
      </div>
      
      <button
        type="submit"
        className={`p-2.5 rounded-full flex-shrink-0 transition-colors ${
          (!message.trim() && !mediaFile) || isUploading
            ? darkMode 
              ? 'bg-blue-600/50 text-white/50 cursor-not-allowed' 
              : 'bg-blue-500/50 text-white/50 cursor-not-allowed'
            : darkMode 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
        disabled={(!message.trim() && !mediaFile) || isUploading}
      >
        {isUploading ? (
          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <Send size={18} />
        )}
      </button>
    </form>
  ), [darkMode, isUploading, mediaFile, MessageInput, handleFormSubmit]);

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
            className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={closeMessageInfo}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className={`w-full max-w-md rounded-xl shadow-2xl ${
                darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
              } overflow-hidden`}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`py-3 px-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Info size={18} className={darkMode ? 'text-blue-400' : 'text-blue-500'} />
                    Message Info
                  </h3>
                  <button
                    onClick={closeMessageInfo}
                  className={`p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
                  >
                  <X size={18} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                  </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-5">
                {/* Sender Info */}
                <div className="flex items-center space-x-3 pb-3 border-b border-dashed border-opacity-40 border-gray-300 dark:border-gray-700">
                  <div className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
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
                      <div className="w-full h-full flex items-center justify-center">
                        <User className={darkMode ? 'text-gray-400' : 'text-gray-500'} size={20} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{messageInfo.sender.username}</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Message Sender</p>
                  </div>
                </div>

                {/* Timeline */}
                <div className={`space-y-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <h4 className="text-xs uppercase tracking-wider font-semibold mb-2 opacity-60">Message Timeline</h4>
                  
                  <div className="flex items-start space-x-3">
                    <div className={`p-1.5 rounded-full flex-shrink-0 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <Send size={14} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-xs">Sent</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(messageInfo.sent).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className={`p-1.5 rounded-full flex-shrink-0 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <CheckCheck size={14} className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-xs">Delivered</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(messageInfo.delivered).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {messageInfo.read && (
                    <div className="flex items-start space-x-3">
                      <div className={`p-1.5 rounded-full flex-shrink-0 ${darkMode ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                        <CheckCheck size={14} className="text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-xs">Read</p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(messageInfo.readAt!).toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Current Status */}
                <div className={`flex items-center justify-between p-3 rounded-lg mt-4 ${
                  darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                  <span className="text-xs font-medium">Current Status</span>
                  <div className="flex items-center gap-1.5">
                    {messageInfo.read ? (
                      <>
                        <span className={`text-xs font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Read</span>
                        <CheckCheck size={16} className="text-blue-500" />
                      </>
                    ) : (
                      <>
                        <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Delivered</span>
                        <CheckCheck size={16} className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Group Message Info Modal */}
      <AnimatePresence>
        {groupMessageInfo.message && groupMessageInfo.readStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={closeGroupMessageInfo}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className={`w-full max-w-md rounded-xl shadow-2xl ${
                darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
              } overflow-hidden`}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`py-3 px-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Info size={18} className={darkMode ? 'text-blue-400' : 'text-blue-500'} />
                  Group Message Info
                </h3>
                <button
                  onClick={closeGroupMessageInfo}
                  className={`p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
                >
                  <X size={18} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-5">
                {/* Sender Info */}
                <div className="flex items-center space-x-3 pb-3 border-b border-dashed border-opacity-40 border-gray-300 dark:border-gray-700">
                  <div className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    {groupMessageInfo.message.sender.userImage ? (
                      <img
                        src={groupMessageInfo.message.sender.userImage.startsWith('http') 
                          ? groupMessageInfo.message.sender.userImage 
                          : `https://localhost:3000${groupMessageInfo.message.sender.userImage}`}
                        alt={groupMessageInfo.message.sender.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className={darkMode ? 'text-gray-400' : 'text-gray-500'} size={20} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{groupMessageInfo.message.sender.username}</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Message Sender</p>
                  </div>
                </div>

                {/* Message Timestamp */}
                <div className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <h4 className="text-xs uppercase tracking-wider font-semibold mb-2 opacity-60">Sent</h4>
                  <div className="flex items-center space-x-2">
                    <Clock size={14} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                    <span className="text-xs">
                      {new Date(groupMessageInfo.message.createdAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                {/* Read Status List */}
                <div className={`space-y-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <h4 className="text-xs uppercase tracking-wider font-semibold mb-2 opacity-60">Read By Members</h4>
                  
                  <div className="max-h-64 overflow-y-auto pr-1 space-y-2">
                    {groupMessageInfo.readStatus.map((status) => (
                      <div key={status.userId} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/30">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ${
                            darkMode ? 'bg-gray-700' : 'bg-gray-100'
                          }`}>
                            {status.userImage ? (
                              <img
                                src={status.userImage.startsWith('http') 
                                  ? status.userImage 
                                  : `https://localhost:3000${status.userImage}`}
                                alt={status.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User className={darkMode ? 'text-gray-400' : 'text-gray-500'} size={16} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-xs">{status.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {status.hasRead ? (
                            <div className="flex items-center space-x-1">
                              <span className={`text-xs font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Read</span>
                              <CheckCheck size={14} className="text-blue-500" />
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Not seen</span>
                              <Clock size={14} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className={`flex items-center justify-between p-3 rounded-lg mt-4 ${
                  darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                  <span className="text-xs font-medium">Read Status</span>
                  <div>
                    <span className="text-xs font-medium">
                      {groupMessageInfo.readStatus.filter(s => s.hasRead).length} of {groupMessageInfo.readStatus.length} read
                    </span>
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
                    onFocus={() => {
                      // When input is focused and has a value, trigger search
                      if (searchQuery.trim().length > 0) {
                        searchUsers(searchQuery);
                      }
                    }}
                    placeholder="Search users to message..."
                    className={`w-full p-2 pl-10 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' 
                        : 'bg-white border-gray-200'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />

                  {/* Search Results Dropdown - Only show when there's a search query */}
                  {searchQuery && (
                    <div className={`absolute mt-2 w-full min-w-[250px] rounded-lg shadow-lg z-50 ${
                      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    } border overflow-hidden max-h-80 overflow-y-auto`}>
                      {isSearching ? (
                        <div className="p-4 text-center text-gray-500">Searching...</div>
                      ) : searchResults.length > 0 ? (
                        <>
                          {/* Debug info - remove in production */}
                          <div className="bg-blue-100 text-blue-800 text-xs p-1 text-center">
                            Found {searchResults.length} results for "{searchQuery}"
                          </div>
                          {searchResults.map(user => (
                          <div
                            key={user.id}
                              onClick={() => handleUserSelect(user.id, user.userImage, user.username)}
                              className={`flex items-center space-x-3 py-3 px-4 cursor-pointer ${
                                darkMode ? 'hover:bg-gray-700/50 border-b border-gray-700' : 'hover:bg-gray-100/80 border-b border-gray-200'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full overflow-hidden border flex-shrink-0 ${
                              darkMode ? 'border-gray-700' : 'border-gray-200'
                            }`}>
                              {user.userImage ? (
                                <img
                                    src={getImageUrl(user.userImage)}
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
                              <div className="flex flex-col flex-1">
                              <div className="font-medium">
                                {highlightMatch(user.username, searchQuery)}
                              </div>
                                {(user as any).email && (
                                  <div className="text-xs text-gray-500">{(user as any).email}</div>
                                )}
                                {conversations.some(conv => conv.otherUserId === user.id) && (
                                  <div className="text-xs text-blue-500 mt-1 flex items-center">
                                    <Info size={12} className="mr-1" />
                                    Existing conversation
                            </div>
                                )}
                          </div>
                              <div className="text-blue-500">
                                <Plus size={18} />
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="p-4 text-center text-gray-500">No users found matching "{searchQuery}"</div>
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
                          onClick={() => handleUserSelect(user.id, user.userImage, user.username)}
                          className={`px-4 py-2 flex items-center space-x-3 cursor-pointer ${
                            darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full overflow-hidden border ${
                            darkMode ? 'border-gray-700' : 'border-gray-200'
                          }`}>
                            {user.userImage ? (
                              <img
                                src={getImageUrl(user.userImage)}
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
                            key={`chat-${chat.otherUserId}-${new Date(chat.lastMessageTime).getTime()}`}
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
                                  <h2 className="font-semibold">
                                    {chat.otherUsername}
                                  </h2>
                                  {/* Remove info icon from DM list */}
                                </div>
                                <p className={`text-sm truncate flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {chat.lastMessage && (
                                    renderMessagePreview(chat.lastMessage)
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
                            key={`group-${group.id}-${new Date(group.lastMessageTime).getTime()}`}
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
                                  <h2 className="font-semibold truncate max-w-[120px]">
                                    {group.name}
                                  </h2>
                                  {group.members?.some(m => m.id === user?.id && m.isOwner) && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                      darkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'
                                    }`}>
                                      Owner
                                    </span>
                                  )}
                                  {group.members?.some(m => m.id === user?.id && m.isAdmin && !m.isOwner) && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                      darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                                    }`}>
                                      Admin
                                    </span>
                                  )}
                                </div>
                                <p className={`text-sm truncate flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {(() => {
                                    console.log(`Rendering preview for group ${group.id}: lastMessage="${group.lastMessage}"`);
                                    return null;
                                  })()}
                                  {group.lastMessage && (
                                    renderMessagePreview(group.lastMessage)
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
                            className={`w-10 h-10 rounded-full overflow-hidden border ${
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
                              <h2 className="font-semibold">
                                {conversations.find(chat => chat.otherUserId === selectedChat)?.otherUsername}
                              </h2>
                              {/* Info icon for direct message */}
                              <button
                                onClick={handleOpenUserInfo}
                                className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                                  darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                                }`}
                                title="Chat info"
                              >
                                <Info size={16} />
                              </button>
                            </div>
                            {/* Remove the status text entirely */}
                          </div>
                        </>
                      ) : (
                        // Group Chat Header
                        <>
                          <div 
                            className={`w-10 h-10 rounded-full overflow-hidden border ${
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
                              <h2 className="font-semibold">
                                {groupChats.find(group => group.id === selectedChat)?.name}
                              </h2>
                              {/* Info icon for group chat */}
                              <button
                                onClick={handleOpenGroupInfo}
                                className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                                  darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                                }`}
                                title="Group info"
                              >
                                <Info size={16} />
                              </button>
                            </div>
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {groupChats.find(group => group.id === selectedChat)?.members?.length || 0} members
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Additional buttons go here */}
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
                      ? messages.map((msg) => (
                        <React.Fragment key={msg.id}>
                          {renderMessage(msg)}
                        </React.Fragment>
                      ))
                      : renderGroupedMessages()}
                  </AnimatePresence>
                </motion.div>

                {/* Message Options Menu */}
                {messageOptions && messageOptions.messageId && messageOptions.position && (
                  <MessageOptionsMenu 
                    options={messageOptions}
                    position={messageOptions.position}
                    onClose={() => setMessageOptions(null)}
                    onEdit={handleEditMessage}
                    onDelete={(messageId) => {
                              setDeleteConfirmation({
                        messageId: messageId,
                        isSender: messageOptions.isSender,
                                deleteOption: 'me'
                              });
                              setMessageOptions(null);
                            }}
                    onReply={handleReplyToMessage}
                    onInfo={handleMessageInfo}
                    isSender={messageOptions.isSender}
                  />
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
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="w-full h-full flex items-center justify-center"><svg class="w-3 h-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg></div>`;
                                }
                              }}
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
                  
                  <form 
                    onSubmit={handleFormSubmit}
                    className={`p-3 border-t flex items-center space-x-3 ${
                      darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
                    }`}
                  >
                    {/* Button to open file picker */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                      className={`p-2.5 rounded-full flex-shrink-0 transition-colors ${
                        darkMode 
                          ? `${isUploading ? 'bg-gray-800 cursor-not-allowed' : mediaFile ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'} text-gray-300` 
                          : `${isUploading ? 'bg-gray-100 cursor-not-allowed' : mediaFile ? 'bg-blue-500' : 'bg-gray-100 hover:bg-gray-200'} text-gray-600`
                      }`}
                          disabled={isUploading}
                      aria-label="Attach a file"
                    >
                      <Image size={18} className={mediaFile ? 'text-white' : ''} />
                        </button>
                        
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                    />
                    
                    {/* Message input with dynamic styling */}
                    <div className={`relative flex-1 ${mediaFile ? (darkMode ? 'opacity-60' : 'opacity-70') : ''}`}>
                        <input
                          type="text"
                          value={message}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={inputPlaceholder}
                        className={inputStyles}
                          disabled={isUploading || !!mediaFile}
                        ref={messageInputRef}
                      />

                      {mediaFile && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center pointer-events-none">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            darkMode ? 'bg-gray-700' : 'bg-gray-200'
                          }`}>
                            {mediaFile.type.startsWith('image/') ? (
                              <Image size={12} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                            ) : (
                              <Film size={12} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                            )}
                          </div>
                        </div>
                      )}
                      </div>
                      
                    {/* Send button */}
                      <button
                        type="submit"
                      className={`p-2.5 rounded-full flex-shrink-0 transition-colors ${
                        (!message.trim() && !mediaFile) || isUploading
                          ? darkMode 
                            ? 'bg-blue-600/50 text-white/50 cursor-not-allowed' 
                            : 'bg-blue-500/50 text-white/50 cursor-not-allowed'
                          : darkMode 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                        disabled={(!message.trim() && !mediaFile) || isUploading}
                      >
                        {isUploading ? (
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        ) : (
                        <Send size={18} />
                        )}
                      </button>
                  </form>
                </motion.div>

                {/* User Chat Info Panel */}
                {showUserInfoPanel && selectedUserData && (
                      <UserChatInfoPanel
                        isOpen={true}
                    onClose={() => setShowUserInfoPanel(false)}
                    userData={selectedUserData}
                        onDeleteAllMessages={handleDeleteAllMessages}
                                        />
                )}

                {/* Group Chat Info Panel */}
                {showGroupInfoPanel && selectedGroupData && (
                      <GroupChatInfoPanel
                        isOpen={true}
                        onClose={() => setShowGroupInfoPanel(false)}
                        groupData={selectedGroupData}
                        onUpdate={refreshGroupChats}
                        onLeftGroup={(groupId) => {
                          // Reset the selected chat when user leaves the group
                          setSelectedChat(null);
                          // Close the info panel
                          setShowGroupInfoPanel(false);
                        }}
                    />
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