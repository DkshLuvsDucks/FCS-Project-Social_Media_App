import React, { useState, useEffect } from 'react';
import { Mail, Lock, AlertCircle, Clock } from "lucide-react";
import DarkModeToggle from "../components/DarkModeToggle";
import InputField from "../components/InputField";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDarkMode } from "../context/DarkModeContext";
import LoadingSpinner from '../components/LoadingSpinner';
import { motion } from 'framer-motion';
import PageTransition from "../components/PageTransition";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, user, isAdmin, isAuthenticated, error: authError, clearError } = useAuth();
  const { darkMode } = useDarkMode();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Check for rate limit on component mount
  useEffect(() => {
    const retryTime = localStorage.getItem('loginRetryTime');
    if (retryTime) {
      const timeLeft = Math.ceil((parseInt(retryTime) - Date.now()) / 1000);
      if (timeLeft > 0) {
        setCountdown(timeLeft);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(timer);
              localStorage.removeItem('loginRetryTime');
              return null;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(timer);
      } else {
        localStorage.removeItem('loginRetryTime');
      }
    }
  }, []);

  // Handle navigation after successful login
  useEffect(() => {
    if (loginSuccess && isAuthenticated && user) {
      console.log('Navigation check - User:', user);
      console.log('Navigation check - Is Admin:', isAdmin);
      console.log('Navigation check - Role:', user.role);

      if (isAdmin) {
        console.log('Redirecting to admin dashboard');
        navigate('/admin');
      } else {
        console.log('Redirecting to home page');
        navigate('/home');
      }
      setLoginSuccess(false);
    }
  }, [loginSuccess, isAuthenticated, user, isAdmin, navigate]);

  // Update local error state when auth error changes
  useEffect(() => {
    if (authError) {
      setError(authError);
      setLoading(false); // Ensure loading is false when there's an error
    }
  }, [authError]);

  // Only clear errors when inputs change
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setError("");
    clearError();
  };
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple clicks while loading
    if (loading) {
      return;
    }

    // Check if we're still rate limited
    if (countdown !== null) {
      const minutes = Math.ceil(countdown / 60);
      setError(`Please wait ${minutes} minutes before trying again.`);
      return;
    }
    
    setLoading(true);
    setError("");
    clearError();

    // Validate inputs
    if (!email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    if (!password.trim()) {
      setError("Password is required");
      setLoading(false);
      return;
    }
    
    try {
      const success = await login(email, password);
      if (success) {
        console.log('Login successful, waiting for state update');
        setLoginSuccess(true);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || "An unexpected error occurred");
      setLoginSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    navigate("/register");
  };

  return (
    <>
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="fixed top-4 right-4 z-50"
      >
        <DarkModeToggle />
      </motion.div>

      <PageTransition>
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`w-full p-8 rounded-2xl shadow-xl ${
            darkMode 
              ? "bg-gray-800/90 backdrop-blur-lg" 
              : "bg-white/90 backdrop-blur-lg"
          } transition-all transform hover:shadow-2xl`}
        >
          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center space-y-3 mb-8"
          >
            <h1 className={`text-4xl font-bold tracking-tight ${darkMode ? "text-white" : "text-gray-900"}`}>
              Welcome Back
            </h1>
            <p className={`${darkMode ? "text-gray-400" : "text-gray-600"} text-lg font-medium`}>
              Sign in to your account
            </p>
          </motion.div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 flex items-center justify-center p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800"
              >
                <div className="flex items-center">
                  <AlertCircle size={18} className="text-red-500 mr-2" />
                  <span className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</span>
                </div>
              </motion.div>
            )}

            {countdown !== null && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 flex items-center justify-center p-4 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
              >
                <div className="flex items-center">
                  <Clock size={18} className="text-yellow-500 mr-2" />
                  <span className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">
                    Time remaining: {Math.ceil(countdown / 60)} minutes
                  </span>
                </div>
              </motion.div>
            )}

            <div className="space-y-4">
              {/* Email Input */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <InputField
                  label="Email / Mobile Number"
                  type="text"
                  placeholder="Enter email or mobile number"
                  icon={Mail}
                  darkMode={darkMode}
                  value={email}
                  onChange={(e) => handleInputChange(setEmail, e.target.value)}
                />
              </motion.div>

              {/* Password Input */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <InputField
                  label="Password"
                  type="password"
                  placeholder="Enter password"
                  icon={Lock}
                  darkMode={darkMode}
                  value={password}
                  onChange={(e) => handleInputChange(setPassword, e.target.value)}
                  isPassword={true}
                />
              </motion.div>
            </div>

            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex items-center justify-between mt-6"
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label className={`ml-2 text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Remember me
                </label>
              </div>
              <a href="#" className="text-sm text-blue-500 hover:text-blue-600 font-medium">
                Forgot Password?
              </a>
            </motion.div>

            {/* Login Button */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8"
            >
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors duration-200"
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    <span>Signing in...</span>
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </motion.div>
          </form>

          {/* Don't have an account? Sign up */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-center mt-8"
          >
            <p className={`${darkMode ? "text-gray-400" : "text-gray-600"} text-sm`}>
              Don't have an account?{" "}
              <button 
                type="button"
                onClick={handleSignUp}
                className="text-blue-500 hover:text-blue-600 font-medium cursor-pointer inline-flex items-center transition-colors duration-200"
              >
                Create an account
              </button>
            </p>
          </motion.div>
        </motion.div>
      </PageTransition>
    </>
  );
};

export default Login;
