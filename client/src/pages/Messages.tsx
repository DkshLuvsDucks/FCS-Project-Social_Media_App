import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import { Search, Send } from 'lucide-react';
import DarkModeToggle from '../components/DarkModeToggle';
import { motion, AnimatePresence } from 'framer-motion';

interface Conversation {
  otherUserId: number;
  otherUsername: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface Message {
  id: number;
  content: string;
  senderId: number;
  sender: {
    id: number;
    username: string;
  };
  createdAt: string;
}

const Messages: React.FC = () => {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/messages/conversations', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch conversations');
        }

        const data = await response.json();
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
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3000/api/messages/conversation/${selectedChat}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }

        const data = await response.json();
        console.log('Messages:', data);
        setMessages(data);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages');
      }
    };

    fetchMessages();
  }, [selectedChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedChat) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          receiverId: selectedChat,
          content: message,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const newMessage = await response.json();
      console.log('New message:', newMessage);
      setMessages(prev => [...prev, newMessage]);
      setMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col relative ${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"}`}>
      {/* Dark Mode Toggle - Fixed Position */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="absolute top-4 right-4 z-50"
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
                  placeholder="Search messages..."
                  className={`w-full p-2 pl-10 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' 
                      : 'bg-white border-gray-200'
                  }`}
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
              </div>
            </div>

            {/* Chat List */}
            <div className="overflow-y-auto flex-1">
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
                    No conversations yet
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="divide-y divide-gray-200 dark:divide-gray-800"
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
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-3">
                            <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                            <div>
                              <h3 className="font-semibold">{chat.otherUsername}</h3>
                              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {chat.lastMessage}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {new Date(chat.lastMessageTime).toLocaleDateString()}
                            </p>
                            {chat.unreadCount > 0 && (
                              <span className="inline-block px-2 py-1 text-xs bg-blue-500 text-white rounded-full">
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
                  className={`p-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                    <h2 className="font-semibold">
                      {conversations.find(chat => chat.otherUserId === selectedChat)?.otherUsername}
                    </h2>
                  </div>
                </motion.div>

                {/* Messages */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                  <AnimatePresence mode="wait">
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`flex ${msg.sender.id === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.sender.id === user?.id
                              ? `${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white`
                              : darkMode
                              ? 'bg-gray-800'
                              : 'bg-gray-200'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p className={`text-xs mt-1 ${msg.sender.id === user?.id ? 'text-blue-100' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>

                {/* Message Input */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className={`p-4 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}
                >
                  <div className="flex space-x-2">
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
                      onClick={handleSendMessage}
                      type="submit"
                      className={`p-2 rounded-lg ${
                        darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                      } text-white transition-colors duration-200`}
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </motion.div>
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex items-center justify-center"
              >
                <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Select a chat to start messaging
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