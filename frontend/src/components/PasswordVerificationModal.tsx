import React, { useState, useRef } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import axiosInstance from '../utils/axios';

interface LoadingSpinnerProps {
  size: number;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size, className = '' }) => (
  <svg 
    className={`animate-spin ${className}`} 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24"
    width={size}
    height={size}
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

interface PasswordVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  actionType: string;
}

const PasswordVerificationModal: React.FC<PasswordVerificationModalProps> = ({ 
  isOpen, 
  onClose, 
  onVerified,
  actionType
}) => {
  const { darkMode } = useDarkMode();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleVerify = async () => {
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call the admin password verification endpoint
      const response = await axiosInstance.post('/api/admin/verify-password', {
        password
      });

      setSuccess(true);
      
      // Allow time to see success message
      setTimeout(() => {
        onVerified();
        onClose();
        setPassword('');
        setSuccess(false);
      }, 1000);
    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError(err instanceof Error ? err.message : 'Verification failed');
      }
    } finally {
      setLoading(false);
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
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black z-10"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`relative w-full max-w-md p-6 rounded-xl shadow-xl z-20 ${
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
                <Lock size={28} className="text-blue-600 dark:text-blue-300" />
              </div>
              <h2 className="text-xl font-bold">
                Admin Verification
              </h2>
              <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Please enter your admin password to continue
              </p>
              <p className="font-medium mt-1 text-amber-500">
                {actionType}
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

            {/* Password Input */}
            <div className="mb-6">
              <div className="flex relative">
                <input
                  ref={inputRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading && !success) {
                      handleVerify();
                    }
                  }}
                  placeholder="Enter admin password"
                  className={`w-full py-3 px-4 rounded-lg ${
                    darkMode 
                      ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                      : 'bg-white text-gray-900 border-gray-300 focus:border-blue-600'
                  } border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all`}
                  disabled={loading || success}
                />
              </div>
              <p className={`text-center text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Enter your admin password to confirm this action
              </p>
            </div>

            {/* Verify button */}
            <button
              onClick={handleVerify}
              disabled={loading || success || !password}
              className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center transition-colors ${
                loading || success || !password
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
                'Verify'
              )}
            </button>

            {/* Security Warning */}
            <div className="mt-4 p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 flex items-start">
              <AlertTriangle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Security Notice</p>
                <p className="mt-1">This verification is required for sensitive admin actions. Never share your admin password.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PasswordVerificationModal; 