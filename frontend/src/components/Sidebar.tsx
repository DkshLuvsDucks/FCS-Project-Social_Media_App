import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageCircle, Bell, PlusSquare, User, LogOut, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import axiosInstance from '../utils/axios';

// Add the keyframes style to the component
const gradientAnimation = `
  @keyframes gradient {
    0% { background-position: 0% 50% }
    50% { background-position: 100% 50% }
    100% { background-position: 0% 50% }
  }

  .animate-gradient {
    animation: gradient 3s ease infinite;
    background-size: 200% auto;
  }
`;

interface SidebarProps {
  forceCollapsed?: boolean;
}

interface UnreadCountResponse {
  count: number;
  directCount: number;
  groupCount: number;
}

interface GroupChatResponse {
  id: number;
  name: string;
  unreadCount: number;
  // Add other properties as needed, but we only use unreadCount for this feature
}

const Sidebar: React.FC<SidebarProps> = ({ forceCollapsed = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { darkMode } = useDarkMode();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [unreadGroupCount, setUnreadGroupCount] = useState(0);

  // Fetch unread messages count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        // First fetch direct message unread count
        const { data: directData } = await axiosInstance.get<UnreadCountResponse>('/api/messages/unread-count');
        
        // Then fetch group chats to calculate total unread count
        const { data: groupChats } = await axiosInstance.get<GroupChatResponse[]>('/api/group-chats');
        
        // Calculate total unread count from group chats
        const groupUnreadCount = Array.isArray(groupChats) ? groupChats.reduce((total: number, group: GroupChatResponse) => {
          return total + (group.unreadCount || 0);
        }, 0) : 0;
        
        setUnreadMessagesCount(directData.count);
        setUnreadGroupCount(groupUnreadCount);
      } catch (error) {
        console.error('Error fetching unread messages count:', error);
      }
    };

    // Initial fetch
    fetchUnreadCount();

    // Set up polling interval (every 30 seconds)
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { 
      icon: MessageCircle, 
      label: 'Messages', 
      path: '/messages',
      badge: unreadMessagesCount > 0 || unreadGroupCount > 0
    },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: PlusSquare, label: 'Create', path: '/create' },
    { icon: ShoppingBag, label: 'Marketplace', path: '/marketplace' },
    { icon: User, label: 'Profile', path: `/profile/${user?.username}` },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebarWidth = forceCollapsed ? 'w-16' : 'lg:w-64 w-16';

  return (
    <div className={`fixed left-0 h-screen z-50
      ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} 
      border-r ${darkMode ? 'border-gray-800' : 'border-gray-200'}
      ${sidebarWidth}
      transition-[width,background-color] duration-300 ease-in-out
    `}>
      {/* Logo/App Name */}
      <div className={`h-16 flex items-center border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className={`w-full flex items-center ${forceCollapsed ? 'justify-center' : 'lg:justify-start justify-center'} px-4`}>
          <div className={`flex items-center justify-center w-12`}>
            <div className={`p-2 rounded-xl bg-gradient-to-tr ${darkMode ? 'from-indigo-500 to-purple-600' : 'from-indigo-400 to-purple-500'} shadow-lg hover:shadow-purple-500/20`}>
              <ShoppingBag size={24} className="text-white" strokeWidth={2} />
            </div>
          </div>
          {!forceCollapsed && (
            <span className="hidden lg:block ml-3 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-gradient overflow-hidden whitespace-nowrap origin-left transform transition-all duration-300 scale-x-0 lg:scale-x-100">
              Vendr
            </span>
          )}
        </div>
      </div>

      <style>
        {gradientAnimation}
      </style>

      {/* Navigation Menu */}
      <nav className="p-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center mb-2 ${forceCollapsed ? 'justify-center' : 'lg:px-2'}`}
            >
              <div
                className={`flex items-center rounded-lg overflow-hidden relative
                  ${forceCollapsed ? 'w-14 h-12 justify-center' : 'w-full h-12 px-3'}
                  ${isActive 
                    ? (darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900')
                    : (darkMode 
                        ? 'text-gray-300 hover:bg-gray-800 hover:text-white' 
                        : 'hover:bg-gray-100 hover:text-gray-900'
                      )
                  }
                  transition-[width,background-color] duration-300 ease-in-out
                `}
              >
                <div className="relative">
                  <Icon size={24} strokeWidth={2} />
                  {item.badge && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </div>
                {!forceCollapsed && (
                  <span className="hidden lg:block ml-3 whitespace-nowrap origin-left transform transition-transform duration-300 scale-x-0 lg:scale-x-100">
                    {item.label}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center mt-4 ${forceCollapsed ? 'justify-center' : 'lg:px-2'}`}
        >
          <div
            className={`flex items-center rounded-lg overflow-hidden
              ${forceCollapsed ? 'w-14 h-12 justify-center' : 'w-full h-12 px-3'}
              ${darkMode 
                ? 'text-red-400 hover:bg-gray-800 hover:text-red-500' 
                : 'text-red-500 hover:bg-gray-100 hover:text-red-600'
              }
              transition-[width,background-color] duration-300 ease-in-out
            `}
          >
            <LogOut size={24} strokeWidth={2} />
            {!forceCollapsed && (
              <span className="hidden lg:block ml-3 whitespace-nowrap origin-left transform transition-transform duration-300 scale-x-0 lg:scale-x-100">
                Logout
              </span>
            )}
          </div>
        </button>
      </nav>
    </div>
  );
};

export default Sidebar; 