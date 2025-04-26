import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { PhoneIcon, Clock } from 'lucide-react';
import OTPInput from './OTPInput';
import axiosInstance from '../utils/axios';

interface PhoneVerificationProps {
  phoneNumber: string;
  onVerified: () => void;
  onCancel: () => void;
  userId?: number;
}

const PhoneVerification: React.FC<PhoneVerificationProps> = ({
  phoneNumber,
  onVerified,
  onCancel,
  userId
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [formattedPhone, setFormattedPhone] = useState(phoneNumber);
  const [otpSent, setOtpSent] = useState(false);

  // Format phone number to ensure it has country code
  useEffect(() => {
    // If phone number doesn't start with '+', add Indian country code
    if (phoneNumber && !phoneNumber.startsWith('+')) {
      setFormattedPhone(`+91${phoneNumber}`);
    } else {
      setFormattedPhone(phoneNumber);
    }
  }, [phoneNumber]);

  // Countdown timer for resend code
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  // Send OTP automatically on first load
  useEffect(() => {
    if (!otpSent) {
      sendVerificationCode();
    }
  }, [otpSent]);

  const sendVerificationCode = async () => {
    if (!formattedPhone) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post('/api/verification/mobile', {
        mobile: formattedPhone
      });
      
      if (response.status === 200) {
        setOtpSent(true);
        setCountdown(60); // Set 60 seconds countdown for resend
        toast.success('Verification code sent!');
      } else {
        throw new Error('Failed to send verification code');
      }
    } catch (err: any) {
      console.error('Error sending verification code:', err);
      setError(err.response?.data?.error || err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verify OTP through our backend
      const response = await axiosInstance.post('/api/verification/verify-mobile', {
        mobile: formattedPhone,
        otp: verificationCode
      });
      
      if (response.status === 200) {
        // Update user verification status if userId is provided
        if (userId) {
          try {
            await axiosInstance.post('/api/verification/confirm', {
              userId,
              type: 'phone',
              value: formattedPhone,
            });
          } catch (error) {
            console.error('Failed to update verification status:', error);
          }
        }
        
        toast.success('Phone number verified successfully!');
        onVerified();
      } else {
        throw new Error('Verification failed');
      }
    } catch (err: any) {
      console.error('Error verifying code:', err);
      setError(err.response?.data?.error || err.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = () => {
    if (countdown > 0) return;
    sendVerificationCode();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 rounded-lg shadow-lg bg-white dark:bg-gray-800 w-full max-w-md mx-auto"
    >
      <div className="space-y-6">
        <div className="text-center">
          <PhoneIcon className="mx-auto h-12 w-12 text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Verify Your Phone
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            We sent a verification code to {formattedPhone}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Enter verification code
            </label>
            <OTPInput 
              length={6} 
              value={verificationCode} 
              onChange={setVerificationCode}
              disabled={loading || !otpSent} 
            />
          </div>

          {countdown > 0 && (
            <div className="flex items-center justify-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>Resend code in {countdown}s</span>
            </div>
          )}

          <div className="flex flex-col space-y-2">
            <button
              onClick={verifyCode}
              disabled={loading || verificationCode.length !== 6}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 focus:ring-offset-blue-200 
                text-white transition ease-in duration-200 text-center text-base font-semibold shadow-md 
                focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify Phone Number'}
            </button>
            
            <button
              onClick={handleResendCode}
              disabled={loading || countdown > 0}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 focus:ring-gray-500 focus:ring-offset-gray-200 
                text-gray-800 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition ease-in duration-200 
                text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 
                rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {countdown > 0 ? `Resend Code (${countdown}s)` : 'Resend Code'}
            </button>
            
            <button
              onClick={onCancel}
              className="w-full py-2 px-4 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700
                text-gray-600 dark:text-gray-300 transition ease-in duration-200 text-center text-base
                focus:outline-none rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PhoneVerification; 