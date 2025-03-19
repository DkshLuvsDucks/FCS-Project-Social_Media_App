import React, { useState } from "react";
import { LucideIcon, Eye, EyeOff } from "lucide-react";

interface InputFieldProps {
  label: string;
  type: string;
  placeholder: string;
  icon: LucideIcon;
  darkMode: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isPassword?: boolean; // New prop to check if it's a password field
  error?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  type,
  placeholder,
  icon: Icon,
  darkMode,
  value,
  onChange,
  isPassword = false,
  error
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="mb-4">
      <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Icon className={`h-5 w-5 ${error ? "text-red-500" : "text-gray-400"}`} />
        </div>
        <input
          type={inputType}
          className={`w-full pl-10 pr-${isPassword ? '10' : '3'} py-2 rounded-lg border 
            ${darkMode 
              ? "bg-gray-700 text-white " + (error ? "border-red-500 focus:border-red-500" : "border-gray-600 focus:border-blue-500")
              : "bg-white text-gray-900 " + (error ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-blue-500")
            } 
            focus:ring-1 ${error ? "focus:ring-red-500" : "focus:ring-blue-500"} outline-none`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};

export default InputField;
