import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OtpInput from './OtpInput';
import { useDarkMode } from '../context/DarkModeContext';
import { X, Mail, Phone, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'email' | 'mobile';
  value: string;
  onVerified: () => void;
}

const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose,
  type,
  value,
  onVerified
}) => {
  const { darkMode } = useDarkMode();
  const [otp, setOtp] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setOtp('');
      setError(null);
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = `/api/verification/${type === 'email' ? 'email' : 'mobile'}/verify`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [type]: value,
          otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setSuccess(true);
      // Allow time to see success message
      setTimeout(() => {
        onVerified();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (countdown > 0) return;

    setResending(true);
    setError(null);

    try {
      const endpoint = `/api/verification/${type === 'email' ? 'email' : 'mobile'}/send`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [type]: value,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification code');
      }

      // Start countdown for 60 seconds
      setCountdown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification code');
    } finally {
      setResending(false);
    }
  };

  // Early return if modal is closed
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`relative w-full max-w-md p-6 rounded-xl shadow-xl ${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            }`}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className={`absolute top-4 right-4 p-1 rounded-full ${
                darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900">
                {type === 'email' ? (
                  <Mail size={28} className="text-blue-600 dark:text-blue-300" />
                ) : (
                  <Phone size={28} className="text-blue-600 dark:text-blue-300" />
                )}
              </div>
              <h2 className="text-xl font-bold">
                {type === 'email' ? 'Email Verification' : 'Mobile Verification'}
              </h2>
              <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                We've sent a verification code to:
              </p>
              <p className="font-medium mt-1">
                {type === 'email' ? value : value}
              </p>
            </div>

            {/* OTP Input */}
            <div className="mb-6">
              <OtpInput 
                length={6} 
                onComplete={(code) => setOtp(code)} 
              />
              <p className={`text-center text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Enter the 6-digit code sent to your {type === 'email' ? 'email' : 'phone'}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex items-center">
                <XCircle size={18} className="mr-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="mb-4 p-3 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center">
                <CheckCircle size={18} className="mr-2 flex-shrink-0" />
                <span>Verification successful!</span>
              </div>
            )}

            {/* Verify button */}
            <button
              onClick={verifyOTP}
              disabled={loading || success || otp.length !== 6}
              className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center transition-colors ${
                loading || success || otp.length !== 6
                  ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? (
                <>
                  <LoadingSpinner size={20} className="mr-2" />
                  Verifying...
                </>
              ) : success ? (
                <>
                  <CheckCircle size={20} className="mr-2" />
                  Verified
                </>
              ) : (
                'Verify Code'
              )}
            </button>

            {/* Resend section */}
            <div className="mt-4 text-center">
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Didn't receive a code?
              </p>
              <button
                onClick={resendOTP}
                disabled={resending || countdown > 0}
                className={`mt-1 flex items-center justify-center mx-auto text-sm font-medium ${
                  resending || countdown > 0
                    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'
                }`}
              >
                {resending ? (
                  <>
                    <LoadingSpinner size={16} className="mr-1" />
                    Sending...
                  </>
                ) : countdown > 0 ? (
                  <>
                    Resend in {countdown}s
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} className="mr-1" />
                    Resend Code
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VerificationModal; 