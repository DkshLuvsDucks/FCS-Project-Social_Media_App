import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import axios from 'axios';

// API base URL
const API_BASE_URL = 'https://localhost:3000';

interface User {
  id: number;
  username: string;
  email: string;
  bio: string | null;
  userImage: string | null;
  createdAt: string;
  role: string;
  isAuthenticated: boolean;
}

interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    email: string;
    username: string;
    role?: string;
    bio: string | null;
    userImage: string | null;
    createdAt: string;
  };
  message?: string;
}

interface MeResponse {
  user?: {
    id: number;
    email: string;
    username: string;
    role?: string;
    bio: string | null;
    userImage: string | null;
    createdAt: string;
  };
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  error: string | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<boolean>;
  register: (email: string, password: string, username: string, mobile?: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  clearError: () => void;
  // Add other functions your context provides
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const clearError = () => setError(null);

  const login = async (email: string, password: string, remember?: boolean) => {
    try {
      setError(null);
      setLoading(true);
      console.log('AuthContext: Making login request...');
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      console.log('AuthContext: Response status:', response.status);
      
      // Get the raw text first
      const responseText = await response.text();
      console.log('AuthContext: Raw response:', responseText);
      
      let data;
      try {
        // Try to parse as JSON
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error(`Server response error: ${responseText}`);
      }

      if (response.ok && data.user && data.token) {
        // Clear any existing data first
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        
        // Ensure role is uppercase for consistent comparison
        const userRole = data.user.role.toUpperCase();
        
        // Update user object with uppercase role
        const updatedUser = {
          ...data.user,
          role: userRole
        };
        
        // Store new data
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', userRole);
        
        const isAdminUser = userRole === 'ADMIN';
        
        // Update state with consistent role
        setUser(updatedUser);
        setIsAuthenticated(true);
        setIsAdmin(isAdminUser);
        
        console.log('AuthContext: Login successful, user:', updatedUser);
        console.log('AuthContext: User role:', userRole);
        console.log('AuthContext: Setting isAdmin to:', isAdminUser);
        
        // Add a small delay before navigation for smoother transition
        await new Promise(resolve => setTimeout(resolve, 300));
        return true;
      }
      
      // Handle specific error cases
      if (response.status === 401) {
        setError('Invalid email or password');
      } else if (response.status === 403) {
        setError(data.error || 'Account is locked. Please try again later.');
      } else if (response.status === 429) {
        // Handle rate limit error
        const retryAfter = data.retryAfter || 15 * 60; // Default to 15 minutes if not provided
        const minutes = Math.ceil(retryAfter / 60);
        setError(`Too many login attempts. Please wait ${minutes} minutes before trying again.`);
        
        // Store the retry time in localStorage
        localStorage.setItem('loginRetryTime', (Date.now() + retryAfter * 1000).toString());
      } else {
        setError(data.error || 'Login failed');
      }
      return false;
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to server. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, username: string, mobile?: string): Promise<boolean> => {
    try {
      console.log('AuthContext: Starting registration...');
      
      const userData = { email, password, username, mobile };
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json() as AuthResponse;
      console.log('AuthContext: Registration response:', data);

      if (data.success && data.token && data.user) {
        // Store token in localStorage
        localStorage.setItem('token', data.token);
        
        // Update auth state
        setUser({
          id: data.user.id,
          email: data.user.email,
          username: data.user.username,
          role: data.user.role?.toUpperCase() || 'USER',
          isAuthenticated: true,
          bio: data.user.bio || '',
          userImage: data.user.userImage || '',
          createdAt: data.user.createdAt || ''
        });
        
        // Set default Authorization header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        
        // Navigate to homepage
        navigate('/');
        
        return true;
      } else {
        console.error('Registration failed:', data.message || 'Unknown error');
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...userData } : null);
  };

  // Check for existing token on mount and periodically verify
  useEffect(() => {
    const checkAuth = async () => {
      console.log('AuthContext: Checking authentication...');
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('AuthContext: No token found');
        setUser(null);
        setLoading(false);
        return;
      }
      
      try {
        // Set default auth header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Fetch user data
        const response = await axios.get<MeResponse>('/api/auth/me');
        
        if (response.data && response.data.user) {
          setUser({
            id: response.data.user.id,
            email: response.data.user.email,
            username: response.data.user.username,
            role: response.data.user.role?.toUpperCase() || 'USER',
            isAuthenticated: true,
            bio: response.data.user.bio || '',
            userImage: response.data.user.userImage || '',
            createdAt: response.data.user.createdAt || ''
          });
        } else {
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    console.log('User state changed:', user);
    // Only navigate on initial authentication
    if (user && isAuthenticated && location.pathname === '/login') {
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/home');
      }
    }
  }, [user, isAuthenticated, navigate, location.pathname]);

  const logout = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUser(null);
      navigate('/login');
    }
  };

  // Only show loading screen for initial auth check, not during login/register
  if (loading && !isAuthenticated && location.pathname !== '/login' && location.pathname !== '/register' && !location.pathname.startsWith('/public')) {
    return (
      <PageTransition>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center justify-center"
        >
          <div className="text-xl font-semibold text-gray-200 dark:text-gray-200">
            Checking authentication...
          </div>
        </motion.div>
      </PageTransition>
    );
  }

  // Only show error page for session expiry or verification errors, not login failures
  if (error && !isAuthenticated && location.pathname !== '/login' && location.pathname !== '/register') {
    return (
      <PageTransition>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`bg-gray-800/90 backdrop-blur-lg p-8 rounded-lg shadow-xl max-w-md w-full mx-4`}
        >
          <div className="text-red-400 mb-4">{error}</div>
          <button
            onClick={() => window.location.href = '/login'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Go to Login
          </button>
        </motion.div>
      </PageTransition>
    );
  }

  const value: AuthContextType = {
    user,
    isAdmin,
    isAuthenticated,
    error,
    loading,
    login,
    register,
    logout,
    updateUser,
    clearError,
    // Other functions
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 