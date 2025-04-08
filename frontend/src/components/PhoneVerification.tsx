import React, { useState, useEffect } from 'react';
import { auth } from '../config/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { PhoneIcon, Clock } from 'lucide-react';
import OTPInput from './OTPInput';

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
  const [isRecaptchaLoaded, setIsRecaptchaLoaded] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [formattedPhone, setFormattedPhone] = useState(phoneNumber);

  // Format phone number to ensure it has country code
  useEffect(() => {
    // If phone number doesn't start with '+', add Indian country code
    if (phoneNumber && !phoneNumber.startsWith('+')) {
      setFormattedPhone(`+91${phoneNumber}`);
    } else {
      setFormattedPhone(phoneNumber);
    }
  }, [phoneNumber]);

  // Initialize reCAPTCHA verifier
  useEffect(() => {
    if (!isRecaptchaLoaded) {
      // Clear any existing recaptcha
      const existingElement = document.getElementById('recaptcha-container');
      if (existingElement) {
        existingElement.innerHTML = '';
      }

      try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'normal',
          'callback': () => {
            setIsRecaptchaLoaded(true);
            sendVerificationCode();
          },
          'expired-callback': () => {
            setError('reCAPTCHA expired. Please refresh the page.');
            setIsRecaptchaLoaded(false);
          }
        });
        window.recaptchaVerifier.render();
      } catch (err) {
        console.error('Error setting up reCAPTCHA:', err);
        setError('Failed to set up verification. Please try again later.');
      }
    }

    return () => {
      // Cleanup function
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (err) {
          console.error('Error clearing reCAPTCHA:', err);
        }
      }
    };
  }, []);

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

  const sendVerificationCode = async () => {
    if (!formattedPhone || !isRecaptchaLoaded) return;

    setLoading(true);
    setError(null);

    try {
      const confirmationResult = await signInWithPhoneNumber(
        auth, 
        formattedPhone,
        window.recaptchaVerifier
      );
      setConfirmationResult(confirmationResult);
      setCountdown(60); // Set 60 seconds countdown for resend
      toast.success('Verification code sent!');
    } catch (err: any) {
      console.error('Error sending verification code:', err);
      setError(err.message || 'Failed to send verification code. Please try again.');
      
      // Reset reCAPTCHA if there's an error
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'normal',
            'callback': () => {
              setIsRecaptchaLoaded(true);
            },
            'expired-callback': () => {
              setError('reCAPTCHA expired. Please refresh the page.');
              setIsRecaptchaLoaded(false);
            }
          });
          window.recaptchaVerifier.render();
        } catch (recaptchaErr) {
          console.error('Error resetting reCAPTCHA:', recaptchaErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!confirmationResult || !verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await confirmationResult.confirm(verificationCode);
      
      // Update backend if userId is provided
      if (userId) {
        try {
          await fetch(`/api/verification/confirm`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              type: 'phone',
              value: formattedPhone,
            }),
          });
        } catch (error) {
          console.error('Failed to update verification status:', error);
          // Continue anyway as Firebase verification succeeded
        }
      }
      
      toast.success('Phone number verified successfully!');
      onVerified();
    } catch (err: any) {
      console.error('Error verifying code:', err);
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = () => {
    if (countdown > 0) return;
    
    // Clear previous reCAPTCHA
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (err) {
        console.error('Error clearing reCAPTCHA:', err);
      }
    }
    
    // Set up new reCAPTCHA
    try {
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (recaptchaContainer) {
        recaptchaContainer.innerHTML = '';
      }
      
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'normal',
        'callback': () => {
          setIsRecaptchaLoaded(true);
          sendVerificationCode();
        },
        'expired-callback': () => {
          setError('reCAPTCHA expired. Please refresh the page.');
          setIsRecaptchaLoaded(false);
        }
      });
      window.recaptchaVerifier.render();
    } catch (err) {
      console.error('Error setting up reCAPTCHA for resend:', err);
      setError('Failed to set up verification. Please refresh the page.');
    }
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
              disabled={loading} 
            />
          </div>

          {countdown > 0 && (
            <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              <Clock size={16} className="mr-1" />
              Resend code in {countdown} seconds
            </div>
          )}

          <div id="recaptcha-container" className="flex justify-center my-4"></div>

          <div className="flex space-x-3">
            <button
              type="button"
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={verifyCode}
              disabled={loading || verificationCode.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>

          {countdown === 0 && (
            <button
              type="button"
              className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline"
              onClick={handleResendCode}
              disabled={loading}
            >
              Resend verification code
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Add typings for global recaptchaVerifier
declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export default PhoneVerification; 