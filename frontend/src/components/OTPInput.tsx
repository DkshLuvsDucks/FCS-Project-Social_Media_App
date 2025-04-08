import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useDarkMode } from '../context/DarkModeContext';

interface OtpInputProps {
  length: number;
  onComplete: (otp: string) => void;
}

const OtpInput: React.FC<OtpInputProps> = ({ length, onComplete }) => {
  const { darkMode } = useDarkMode();
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    // Get only the last character if multiple characters are pasted
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Check if we've completed the OTP
    const otpValue = newOtp.join('');
    if (otpValue.length === length) {
      onComplete(otpValue);
    }

    // Move to next input if available
    if (value && index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      // Move to previous input on backspace if current input is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim().substring(0, length);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      if (i < length) {
        newOtp[i] = pastedData[i];
      }
    }
    setOtp(newOtp);

    // Move focus to the appropriate input
    if (pastedData.length < length && inputRefs.current[pastedData.length]) {
      inputRefs.current[pastedData.length]?.focus();
    } else if (pastedData.length === length) {
      inputRefs.current[length - 1]?.focus();
      onComplete(pastedData);
    }
  };

  return (
    <div className="flex justify-center space-x-2 my-4">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          type="text"
          ref={(ref) => {
            inputRefs.current[index] = ref;
          }}
          value={otp[index]}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className={`w-12 h-12 text-center text-2xl font-bold rounded-lg 
            ${darkMode 
              ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
              : 'bg-white text-gray-900 border-gray-300 focus:border-blue-600'} 
            border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all`}
          maxLength={1}
          autoComplete="off"
          inputMode="numeric"
        />
      ))}
    </div>
  );
};

export default OtpInput; 