import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';

// API base URL
const API_BASE_URL = 'https://localhost:3000';

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const clearError = () => setError(null);

  const login = async (email: string, password: string) => {
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
        // If the response contains "Too many", it's likely a rate limit error
        if (responseText.includes('Too many')) {
          throw new Error('Too many login attempts. Please wait before trying again.');
        }
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
        setError('Too many login attempts. Please wait before trying again.');
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

  const register = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.user && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.user.role.toUpperCase());
        setUser(data.user);
        setIsAuthenticated(true);
        setIsAdmin(data.user.role.toUpperCase() === 'ADMIN');
        return true;
      }

      setError(data.error || 'Registration failed');
      return false;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect to server');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Check for existing token on mount and periodically verify
  useEffect(() => {
    const checkAuth = async () => {
      console.log('AuthContext: Checking authentication...');
      const publicRoutes = ['/login', '/register']; // Add public routes here
      
      // Don't show loading for public routes
      if (publicRoutes.includes(location.pathname)) {
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      const storedRole = localStorage.getItem('userRole');
      
      if (!token) {
        console.log('AuthContext: No token found');
        setLoading(false);
        if (!publicRoutes.includes(location.pathname)) {
          navigate('/login');
        }
        return;
      }

      try {
        console.log('AuthContext: Token found, verifying...');
        const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });

        console.log('AuthContext: Verify response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('AuthContext: User verified:', data);
          
          // Ensure role is uppercase for consistent comparison
          const userRole = data.user.role.toUpperCase();
          
          // Update user object with uppercase role
          const updatedUser = {
            ...data.user,
            role: userRole
          };
          
          // Verify that the role matches what we have stored
          if (userRole !== storedRole?.toUpperCase()) {
            console.error('Role mismatch, logging out');
            await logout();
            return;
          }

          setUser(updatedUser);
          setIsAuthenticated(true);
          setIsAdmin(userRole === 'ADMIN');
          console.log('AuthContext: Updated user state:', updatedUser);
          console.log('AuthContext: Is admin:', userRole === 'ADMIN');
        } else {
          console.log('AuthContext: Token invalid, removing...');
          await logout();
        }
      } catch (error) {
        console.error('AuthContext: Token verification error:', error);
        await logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Set up periodic token verification
    const verifyInterval = setInterval(checkAuth, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(verifyInterval);
  }, [navigate, location.pathname]);

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

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAdmin,
        user,
        login,
        register,
        logout,
        loading,
        error,
        clearError,
      }}
    >
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