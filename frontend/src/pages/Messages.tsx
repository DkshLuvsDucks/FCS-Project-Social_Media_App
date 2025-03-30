import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import { Search, Send, User, UserPlus, Users, MoreVertical, Edit2, Trash2, Info } from 'lucide-react';
import DarkModeToggle from '../components/DarkModeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../utils/axios';
import { useNavigate } from 'react-router-dom';

interface Conversation {
  otherUserId: number;
  otherUsername: string;
  otherUserImage: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

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

const Messages: React.FC = () => {
  const { darkMode } = useDarkMode();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
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

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data } = await axiosInstance.get<Conversation[]>('/api/messages/conversations');
        console.log('Conversations:', data);
        setConversations(data);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  // Fetch messages for selected chat
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChat) return;

      try {
        // Make sure the API endpoint returns complete message data including replies
        const { data } = await axiosInstance.get<Message[]>(`/api/messages/conversation/${selectedChat}`, {
          params: {
            includeReplies: true // Add this parameter to tell backend to include reply information
          }
        });
        console.log('Messages with replies:', data); // Debug log
        setMessages(data);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages');
      }
    };

    if (selectedChat) {
      fetchMessages();
    }
  }, [selectedChat]);

  // Fetch suggested users (moots and pending follows)
  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      try {
        // First try to get followers/following
        const { data: followData } = await axiosInstance.get<FollowData>('/api/users/follows');
        console.log('Follow data:', followData);
        
        // Transform the data into suggested users
        const suggestedUsers = followData.followers
          .filter(follower => 
            followData.following.some(following => following.id === follower.id)
          )
          .map(user => ({
            id: user.id,
            username: user.username,
            userImage: user.userImage,
            type: 'mutual' as const
          }));

        setSuggestedUsers(suggestedUsers);
      } catch (err) {
        console.error('Error fetching suggested users:', err);
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
        setSearchResults(data);
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

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

  // Update the handleSendMessage function
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedChat) return;

    const shouldScrollToBottom = messageContainerRef.current && 
      (messageContainerRef.current.scrollHeight - messageContainerRef.current.scrollTop - messageContainerRef.current.clientHeight < 100);

    try {
      // Include complete reply information in the request
      const messageData = {
        receiverId: selectedChat,
        content: message.trim(),
        replyToId: replyingTo?.id // Send the ID of the message being replied to
      };

      const { data: newMessage } = await axiosInstance.post<Message>('/api/messages/send', messageData);

      // Update messages with the new message that includes reply information
      setMessages(prev => [...prev, newMessage]);
      
      // Update the conversations list with the new message
      setConversations(prev => {
        const updatedConversations = [...prev];
        const conversationIndex = updatedConversations.findIndex(
          conv => conv.otherUserId === selectedChat
        );
        
        if (conversationIndex !== -1) {
          updatedConversations[conversationIndex] = {
            ...updatedConversations[conversationIndex],
            lastMessage: message.trim(),
            lastMessageTime: new Date().toISOString(),
          };
          // Move the conversation to the top
          const [conversation] = updatedConversations.splice(conversationIndex, 1);
          updatedConversations.unshift(conversation);
        }
        
        return updatedConversations;
      });
      
      setMessage('');
      setReplyingTo(null);

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
      setError('Failed to send message');
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

  const startNewConversation = async (userId: number) => {
    try {
      setError(null); // Clear any previous errors
      console.log('Starting conversation with user:', userId);
      
      // First check if conversation already exists
      const { data: existingConversations } = await axiosInstance.get<Conversation[]>('/api/messages/conversations');
      console.log('Existing conversations:', existingConversations);
      
      const existingConversation = existingConversations.find(conv => conv.otherUserId === userId);
      if (existingConversation) {
        console.log('Found existing conversation:', existingConversation);
        setSelectedChat(userId);
        setSearchQuery('');
        return;
      }
      
      // Create a new conversation
      console.log('Creating new conversation with userId:', userId);
      const { data } = await axiosInstance.post('/api/messages/conversations', {
        userId: userId  // Changed to match backend expectation
      });
      
      console.log('Server response for new conversation:', data);
      
      // Get the other user's info from the search results or suggested users
      const otherUser = searchResults.find(u => u.id === userId) || 
                       suggestedUsers.find(u => u.id === userId);
      
      if (!otherUser) {
        console.error('Could not find user info');
        throw new Error('Could not find user information');
      }
      
      setSelectedChat(userId);
      setSearchQuery('');
      
      // Add to conversations
      setConversations(prev => [{
        otherUserId: userId,
        otherUsername: otherUser.username,
        otherUserImage: otherUser.userImage,
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0
      }, ...prev]);

      // Clear any existing errors
      setError(null);
      
    } catch (err: any) {
      console.error('Error starting conversation:', err);
      
      // Log detailed error information
      if (err?.response) {
        console.log('Error response details:', {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          headers: err.response.headers
        });
      }

      // Set a user-friendly error message
      const errorMessage = err?.response?.data?.message || 
                         err?.response?.data?.error || 
                         err?.message || 
                         'Failed to start conversation';
                         
      setError(`Could not start conversation: ${errorMessage}`);
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
      setError('Messages can only be edited within 15 minutes of sending');
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
        setError('Messages can only be edited within 15 minutes of sending');
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
        setError('Messages can only be edited within 15 minutes of sending');
      } else {
        setError('Failed to update message');
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
      setError('Failed to delete message');
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

  // Update error handling
  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setShowError(true);
    setTimeout(() => setShowError(false), 3000); // Hide error after 3 seconds
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
    if (!message) return '';
    return message.length > 30 ? `${message.substring(0, 30)}...` : message;
  };

  // Update the message rendering to include a blue vertical line for replies
  const renderMessage = (msg: Message) => {
    // Get the original message for the reply
    const originalMessage = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;
    
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

  return (
    <div className={`min-h-screen flex flex-col relative ${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"}`}>
      {/* Error Toast */}
      <AnimatePresence>
        {showError && error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className={`px-4 py-2 rounded-lg shadow-lg ${
              darkMode ? 'bg-red-900 text-white' : 'bg-red-500 text-white'
            }`}>
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="absolute top-4 right-4 z-40"
      >
        <DarkModeToggle />
      </motion.div>

      <div className="flex flex-1">
        <Sidebar forceCollapsed={true} />
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-1 ml-16"
        >
          {/* Chat List */}
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={`w-80 border-r flex-shrink-0 flex flex-col ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}
          >
            {/* Search and Dark Mode Toggle */}
            <div className={`p-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Messages</h2>
              </div>
              <div className="relative w-full">
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

                {/* Suggested Users Section - Show when no search query */}
                {!searchQuery && (
                  <div className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <h3 className="px-4 text-sm font-medium mb-2">Suggested</h3>
                    <div className="space-y-1">
                      {loadingSuggestions ? (
                        <div className="px-4 py-2 text-sm text-gray-500">Loading suggestions...</div>
                      ) : suggestedUsers.length > 0 ? (
                        suggestedUsers.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => startNewConversation(user.id)}
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

                {/* Search Results Dropdown - Only show when there's a search query */}
                {searchQuery && (
                  <div className={`absolute mt-2 w-full rounded-lg shadow-lg z-50 ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  } border`}>
                    {isSearching ? (
                      <div className="p-4 text-center text-gray-500">Searching...</div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => startNewConversation(user.id)}
                          className={`p-3 flex items-center space-x-3 cursor-pointer ${
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
                          <span className="font-medium">{user.username}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">No users found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Chat List */}
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
                ) : error ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-4 text-center text-red-500"
                  >
                    {error}
                  </motion.div>
                ) : conversations.length === 0 ? (
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
                        onClick={() => setSelectedChat(chat.otherUserId)}
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
                            <h3 className="font-semibold truncate">{chat.otherUsername}</h3>
                            <p className={`text-sm truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {renderMessagePreview(chat.lastMessage)}
                            </p>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {new Date(chat.lastMessageTime).toLocaleDateString()}
                            </p>
                            {chat.unreadCount > 0 && (
                              <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-blue-500 text-white rounded-full">
                                {chat.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Chat Window */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <motion.div 
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className={`p-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'} sticky top-0 bg-inherit z-10`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        onClick={() => {
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
                      <h2 className="font-semibold cursor-pointer hover:underline" onClick={() => {
                        const username = conversations.find(chat => chat.otherUserId === selectedChat)?.otherUsername;
                        if (username) navigate(`/profile/${username}`);
                      }}>
                        {conversations.find(chat => chat.otherUserId === selectedChat)?.otherUsername}
                      </h2>
                    </div>
                  </div>
                </motion.div>

                {/* Messages */}
                <motion.div 
                  ref={messageContainerRef}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-blue-600 [&::-webkit-scrollbar-track]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-blue-500 dark:[&::-webkit-scrollbar-track]:bg-gray-700"
                  style={{ maxHeight: 'calc(100vh - 200px)', width: '100%' }}
                >
                  <AnimatePresence mode="sync">
                    {messages.map((msg) => renderMessage(msg))}
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
                  className={`p-4 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'} sticky bottom-0 bg-inherit`}
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
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type a message..."
                      className={`flex-1 p-2 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-200'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={!message.trim()}
                      className={`p-2 rounded-lg ${
                        darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                      } text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Send size={20} />
                    </button>
                  </form>
                </motion.div>
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