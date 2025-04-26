import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Send, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import OTPInput from './OTPInput';
import LoadingSpinner from './LoadingSpinner';
import { useDarkMode } from '../context/DarkModeContext';
import axios from 'axios';

type VerificationType = 'email' | 'phone';

interface VerificationScreenProps {
  type: VerificationType;
  contactValue: string;
  userId?: number;
  onVerificationComplete: () => void;
  onResendComplete?: () => void;
}

interface VerificationRequestResponse {
  success: boolean;
  message?: string;
  error?: string;
  expiresAt?: string;
  sessionInfo?: string;
}

interface VerificationVerifyResponse {
  success: boolean;
  message?: string;
  error?: string;
  attemptsLeft?: number;
}

const VerificationScreen: React.FC<VerificationScreenProps> = ({
  type,
  contactValue,
  userId,
  onVerificationComplete,
  onResendComplete
}) => {
  const { darkMode } = useDarkMode();
  const [otp, setOtp] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes
  const [loading, setLoading] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  // Timer effect
  useEffect(() => {
    // If we have an expiration time, calculate the time left
    if (expiresAt) {
      const calculateTimeLeft = () => {
        const now = new Date();
        const diff = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
        setTimeLeft(diff);
      };

      // Calculate initially
      calculateTimeLeft();

      // Set up interval
      const timer = setInterval(calculateTimeLeft, 1000);
      
      // Clear interval on unmount
      return () => clearInterval(timer);
    } else if (timeLeft > 0) {
      // Fall back to countdown if no expiration time
      const timer = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [expiresAt, timeLeft]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Request verification code
  const requestVerificationCode = async () => {
    try {
      setResending(true);
      setError(null);

      const response = await axios.post<VerificationRequestResponse>('/api/verification/request', {
        type,
        value: contactValue,
        userId
      });

      const data = response.data;
      
      if (data.success) {
        // Set the expiration time
        if (data.expiresAt) {
          setExpiresAt(new Date(data.expiresAt));
        }
        
        // Store session info for phone verification
        if (data.sessionInfo) {
          setSessionInfo(data.sessionInfo);
        }

        toast.success(`Verification code sent to your ${type}!`);
        
        // Reset OTP input
        setOtp('');
        
        // Call the callback if provided
        if (onResendComplete) {
          onResendComplete();
        }
      } else {
        setError(data.error || `Failed to send ${type} verification code`);
        toast.error(data.error || `Failed to send ${type} verification code`);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || `Failed to send verification code`;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setResending(false);
    }
  };

  // Verify OTP
  const verifyOTP = async () => {
    if (otp.length !== 6) return;

    try {
      setLoading(true);
      setError(null);

      const payload: Record<string, any> = {
        type,
        value: contactValue,
        code: otp
      };

      // Add session info for phone verification if available
      if (type === 'phone' && sessionInfo) {
        payload.sessionInfo = sessionInfo;
      }

      const response = await axios.post<VerificationVerifyResponse>('/api/verification/verify', payload);

      const data = response.data;
      
      if (data.success) {
        toast.success(`${type === 'email' ? 'Email' : 'Phone number'} verified successfully!`);
        onVerificationComplete();
      } else {
        setError(data.error || 'Verification failed');
        toast.error(data.error || 'Verification failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Verification failed';
      setError(errorMessage);
      toast.error(errorMessage);

      // Show attempts left if available
      if (error.response?.data?.attemptsLeft !== undefined) {
        setError(`${errorMessage}. Attempts left: ${error.response.data.attemptsLeft}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Request verification code on mount
  useEffect(() => {
    requestVerificationCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`p-6 rounded-lg shadow-lg ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}
    >
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className="mx-auto mb-4 flex justify-center"
        >
          {type === 'email' ? (
            <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Send size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
          ) : (
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Send size={24} className="text-green-600 dark:text-green-400" />
            </div>
          )}
        </motion.div>
        
        <h2 className="text-xl font-semibold">
          {type === 'email' ? 'Email Verification' : 'Phone Verification'}
        </h2>
        
        <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          We've sent a 6-digit code to
        </p>
        
        <p className="font-medium text-base">
          {contactValue}
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 flex items-center"
        >
          <AlertCircle size={18} className="text-red-500 mr-2 flex-shrink-0" />
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        </motion.div>
      )}

      <div className="mb-6">
        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Enter verification code
        </label>
        
        <OTPInput
          length={6}
          value={otp}
          onChange={setOtp}
          disabled={loading}
        />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Clock size={16} className={`mr-2 ${timeLeft > 0 ? 'text-blue-500' : 'text-gray-400'}`} />
          <span className={`text-sm ${timeLeft > 0 ? 'text-blue-500' : 'text-gray-400'}`}>
            {timeLeft > 0 ? formatTime(timeLeft) : 'Code expired'}
          </span>
        </div>
        
        <button
          onClick={requestVerificationCode}
          disabled={timeLeft > 0 || resending}
          className={`text-sm font-medium ${
            timeLeft > 0 || resending
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-blue-500 hover:text-blue-600'
          }`}
        >
          {resending ? (
            <div className="flex items-center">
              <LoadingSpinner className="w-3.5 h-3.5" />
              <span className="ml-1">Sending...</span>
            </div>
          ) : (
            'Resend Code'
          )}
        </button>
      </div>

      <button
        onClick={verifyOTP}
        disabled={otp.length !== 6 || loading}
        className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center ${
          otp.length !== 6 || loading
            ? 'bg-gray-400 cursor-not-allowed text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {loading ? (
          <>
            <LoadingSpinner className="w-5 h-5" />
            <span className="ml-2">Verifying...</span>
          </>
        ) : (
          <>
            <Check size={18} className="mr-2" />
            <span>Verify</span>
          </>
        )}
      </button>
    </motion.div>
  );
};

export default VerificationScreen; 