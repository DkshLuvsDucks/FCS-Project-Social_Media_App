import React, { useState } from "react";
import { Mail, User, Phone, Lock, AlertCircle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import InputField from "../components/InputField";
import PasswordStrength from "../components/PasswordStrength";
import LoadingSpinner from "../components/LoadingSpinner";
import PageTransition from "../components/PageTransition";
import VerificationModal from "../components/VerificationModal";
import axiosInstance from "../utils/axios";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode } = useDarkMode();
  const { register, login } = useAuth();
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [mobile, setMobile] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    mobile?: string;
  }>({});
  
  // Verification states
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [mobileVerified, setMobileVerified] = useState<boolean>(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState<boolean>(false);
  const [verificationType, setVerificationType] = useState<'email' | 'mobile'>('email');

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFieldErrors(prev => ({ ...prev, email: "Please enter a valid email address" }));
      return false;
    }
    setFieldErrors(prev => ({ ...prev, email: undefined }));
    return true;
  };

  const validateUsername = (username: string): boolean => {
    if (username.length < 3) {
      setFieldErrors(prev => ({ ...prev, username: "Username must be at least 3 characters long" }));
      return false;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setFieldErrors(prev => ({ ...prev, username: "Username can only contain letters, numbers, and underscores" }));
      return false;
    }

    setFieldErrors(prev => ({ ...prev, username: undefined }));
    return true;
  };

  const validatePassword = (password: string): boolean => {
    if (password.length < 8) {
      setFieldErrors(prev => ({ ...prev, password: "Password must be at least 8 characters long" }));
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setFieldErrors(prev => ({ ...prev, password: "Password must contain at least one uppercase letter" }));
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setFieldErrors(prev => ({ ...prev, password: "Password must contain at least one lowercase letter" }));
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setFieldErrors(prev => ({ ...prev, password: "Password must contain at least one number" }));
      return false;
    }
    setFieldErrors(prev => ({ ...prev, password: undefined }));
    return true;
  };

  const validateMobile = (mobile: string): boolean => {
    if (!mobile) {
      setFieldErrors(prev => ({ ...prev, mobile: "Mobile number is required" }));
      return false;
    }
    
    // Check if mobile starts with a country code
    if (!mobile.startsWith('+')) {
      setFieldErrors(prev => ({ ...prev, mobile: "Please include country code (e.g., +91 for India)" }));
      return false;
    }
    
    // More comprehensive E.164 validation
    if (!/^\+[1-9]\d{1,14}$/.test(mobile)) {
      setFieldErrors(prev => ({ ...prev, mobile: "Please enter a valid mobile number with country code" }));
      return false;
    }
    
    setFieldErrors(prev => ({ ...prev, mobile: undefined }));
    return true;
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string, field: keyof typeof fieldErrors) => {
    setter(value);
    setError(null);
    setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    
    // Reset verification status when editing verified fields
    if (field === 'email' && emailVerified) {
      setEmailVerified(false);
    }
    if (field === 'mobile' && mobileVerified) {
      setMobileVerified(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!validateEmail(email)) return;
    
    try {
      // Check if email exists
      const checkResponse = await axiosInstance.post('/api/auth/check-email', { email });
      
      // Send verification code
      const response = await axiosInstance.post('/api/verification/email/send', { email });
      
      // Open verification modal
      setVerificationType('email');
      setVerificationModalOpen(true);
    } catch (err: any) {
      if (err.response?.data?.error) {
        setFieldErrors(prev => ({ ...prev, email: err.response.data.error }));
      } else {
        setError(err.message || 'Failed to send verification code');
      }
    }
  };

  const handleVerifyMobile = async () => {
    if (!validateMobile(mobile)) return;
    
    try {
      // Check if mobile exists
      const checkResponse = await axiosInstance.post('/api/auth/check-mobile', { mobile });
      
      // Send verification code
      const response = await axiosInstance.post('/api/verification/mobile/send', { mobile });
      
      // Open verification modal
      setVerificationType('mobile');
      setVerificationModalOpen(true);
    } catch (err: any) {
      if (err.response?.data?.error) {
        setFieldErrors(prev => ({ ...prev, mobile: err.response.data.error }));
      } else {
        setError(err.message || 'Failed to send verification code');
      }
    }
  };

  const handleVerificationComplete = () => {
    if (verificationType === 'email') {
      setEmailVerified(true);
    } else {
      setMobileVerified(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      // Validate all fields
      const isEmailValid = validateEmail(email);
      const isUsernameValid = validateUsername(username);
      const isPasswordValid = validatePassword(password);
      const isMobileValid = validateMobile(mobile);

      if (!isEmailValid || !isUsernameValid || !isPasswordValid || !isMobileValid) {
        setLoading(false);
        return;
      }

      if (!emailVerified) {
        setError("Please verify your email address first");
        setLoading(false);
        return;
      }

      if (!mobileVerified) {
        setError("Please verify your mobile number first");
        setLoading(false);
        return;
      }

      if (!termsAccepted) {
        setError("Please accept the terms and conditions");
        setLoading(false);
        return;
      }

      // First, check if username already exists
      const checkResponse = await axiosInstance.post<{success: boolean, field?: string, error?: string}>('/api/auth/register/check', {
        username,
      });
      
      const checkData = checkResponse.data;
      
      if (!checkData.success) {
        if (checkData.field === 'username') {
          setFieldErrors(prev => ({ ...prev, username: "Username is already taken" }));
          setLoading(false);
          return;
        }
        throw new Error(checkData.error || 'Registration check failed');
      }

      // If checks pass, proceed with registration
      if (!register) {
        throw new Error('Registration function not available');
      }

      const success = await register(email, password, username, mobile);

      if (success) {
        // Add a slightly longer delay to ensure token is stored and user is logged in
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify the token is stored properly
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('Token not found after registration, will attempt login...');
          
          // Attempt to log in automatically with the new credentials
          try {
            const loginSuccess = await login(email, password);
            if (loginSuccess) {
              console.log('Auto-login successful');
              navigate('/home');
            } else {
              throw new Error('Auto-login failed');
            }
          } catch (loginErr) {
            console.error('Auto-login error:', loginErr);
            // Still redirect to login page to let user log in manually
            navigate('/login');
          }
        } else {
          console.log('Registration successful, token found, redirecting to home');
          navigate('/home');
        }
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <PageTransition>
        <div 
          className="absolute inset-0 overflow-auto" 
          style={{ 
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }}
        >
          <style>
            {`
              div::-webkit-scrollbar {
                display: none;
              }
            `}
          </style>
          <div className="container mx-auto px-6 py-12">
            <div className="max-w-md mx-auto">
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
                    Create Account
                  </h1>
                  <p className={`${darkMode ? "text-gray-400" : "text-gray-600"} text-lg font-medium`}>
                    Join our community
                  </p>
                </motion.div>

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

                <form className="space-y-5" onSubmit={handleSubmit}>
                  {/* Username Input */}
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <InputField
                      label="Username"
                      type="text"
                      placeholder="Choose a username"
                      icon={User}
                      darkMode={darkMode}
                      value={username}
                      onChange={(e) => handleInputChange(setUsername, e.target.value, 'username')}
                      error={fieldErrors.username}
                    />
                  </motion.div>

                  {/* Email Input with Verification */}
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="relative"
                  >
                    <InputField
                      label="Email"
                      type="email"
                      placeholder="Enter your email"
                      icon={Mail}
                      darkMode={darkMode}
                      value={email}
                      onChange={(e) => handleInputChange(setEmail, e.target.value, 'email')}
                      error={fieldErrors.email}
                      disabled={emailVerified}
                      suffix={
                        emailVerified ? (
                          <CheckCircle className="text-green-500" size={20} />
                        ) : (
                          <button
                            type="button"
                            onClick={handleVerifyEmail}
                            className={`text-xs px-2 py-1 rounded ${
                              darkMode 
                                ? "bg-blue-700 hover:bg-blue-600 text-white" 
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            } transition-colors`}
                          >
                            Verify
                          </button>
                        )
                      }
                    />
                    {emailVerified && (
                      <div className="mt-1 text-xs text-green-500 flex items-center">
                        <CheckCircle size={12} className="mr-1" />
                        Email verified
                      </div>
                    )}
                  </motion.div>

                  {/* Mobile Input with Verification */}
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="relative"
                  >
                    <InputField
                      label="Mobile Number (with country code)"
                      placeholder="+91 9876543210"
                      icon={Phone}
                      type="tel"
                      darkMode={darkMode}
                      value={mobile}
                      onChange={(e) => handleInputChange(setMobile, e.target.value, 'mobile')}
                      error={fieldErrors.mobile}
                      disabled={mobileVerified}
                      suffix={
                        mobileVerified ? (
                          <CheckCircle className="text-green-500" size={20} />
                        ) : (
                          <button
                            type="button"
                            onClick={handleVerifyMobile}
                            className={`text-xs px-2 py-1 rounded ${
                              darkMode 
                                ? "bg-blue-700 hover:bg-blue-600 text-white" 
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            } transition-colors`}
                          >
                            Verify
                          </button>
                        )
                      }
                    />
                    {mobileVerified && (
                      <div className="mt-1 text-xs text-green-500 flex items-center">
                        <CheckCircle size={12} className="mr-1" />
                        Mobile verified
                      </div>
                    )}
                  </motion.div>

                  {/* Password Input */}
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    <InputField
                      label="Password"
                      type="password"
                      placeholder="Create a strong password"
                      icon={Lock}
                      darkMode={darkMode}
                      value={password}
                      onChange={(e) => handleInputChange(setPassword, e.target.value, 'password')}
                      error={fieldErrors.password}
                      isPassword={true}
                    />
                    {password && (
                      <div className="mt-1">
                        <PasswordStrength password={password} />
                      </div>
                    )}
                  </motion.div>

                  {/* Terms & Conditions */}
                  <motion.div 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="flex items-center mt-3"
                  >
                    <input
                      id="terms"
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <label
                      htmlFor="terms"
                      className={`ml-2 text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                    >
                      I accept the{" "}
                      <a
                        href="#"
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.preventDefault()}
                      >
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a
                        href="#"
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.preventDefault()}
                      >
                        Privacy Policy
                      </a>
                    </label>
                  </motion.div>

                  {/* Submit Button */}
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1 }}
                  >
                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg text-white ${
                        darkMode
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "bg-blue-600 hover:bg-blue-700"
                      } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors`}
                    >
                      {loading ? (
                        <>
                          <LoadingSpinner size={20} className="mr-2" />
                          <span>Creating account...</span>
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </button>
                  </motion.div>

                  {/* Already have an account link */}
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.1 }}
                    className="text-center mt-6"
                  >
                    <p className={`${darkMode ? "text-gray-400" : "text-gray-600"} text-sm`}>
                      Already have an account?{" "}
                      <a
                        href="/login"
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Sign in
                      </a>
                    </p>
                  </motion.div>
                </form>
              </motion.div>
            </div>
          </div>
        </div>
      </PageTransition>

      {/* Verification Modal */}
      <VerificationModal
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        type={verificationType}
        value={verificationType === 'email' ? email : mobile}
        onVerified={handleVerificationComplete}
      />
    </div>
  );
};

export default Register;
