import React, { useRef, useEffect, KeyboardEvent } from 'react';
import { useDarkMode } from '../context/DarkModeContext';

interface OtpInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const OtpInput: React.FC<OtpInputProps> = ({ length, value, onChange, disabled = false }) => {
  const { darkMode } = useDarkMode();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Convert string value to array of characters
  const valueArray = value.split('').concat(Array(length - value.length).fill(''));

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const inputValue = e.target.value;
    if (isNaN(Number(inputValue))) return;

    const newValueArray = [...valueArray];
    // Get only the last character if multiple characters are pasted
    newValueArray[index] = inputValue.substring(inputValue.length - 1);
    
    // Join the array to create the new value string
    const newValue = newValueArray.join('');
    onChange(newValue);

    // Move to next input if available
    if (inputValue && index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !valueArray[index] && index > 0 && inputRefs.current[index - 1]) {
      // Move to previous input on backspace if current input is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim().substring(0, length);
    if (!/^\d+$/.test(pastedData)) return;

    // Update the value with the pasted data
    onChange(pastedData);

    // Move focus to the appropriate input
    if (pastedData.length < length && inputRefs.current[pastedData.length]) {
      inputRefs.current[pastedData.length]?.focus();
    } else if (pastedData.length === length) {
      inputRefs.current[length - 1]?.focus();
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
          value={valueArray[index]}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className={`w-12 h-12 text-center text-2xl font-bold rounded-lg 
            ${darkMode 
              ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
              : 'bg-white text-gray-900 border-gray-300 focus:border-blue-600'} 
            border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          maxLength={1}
          autoComplete="off"
          inputMode="numeric"
          disabled={disabled}
        />
      ))}
    </div>
  );
};

export default OtpInput; 