import React from 'react';
import { User } from 'lucide-react';
import { useDarkMode } from '../../context/DarkModeContext';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallbackText?: string;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  size = 'md',
  fallbackText,
  className = '',
}) => {
  const { darkMode } = useDarkMode();
  const [imageError, setImageError] = React.useState(false);
  
  // Size mapping
  const sizeClasses = {
    xs: 'w-6 h-6', // 24px
    sm: 'w-8 h-8', // 32px
    md: 'w-10 h-10', // 40px
    lg: 'w-14 h-14', // 56px
    xl: 'w-20 h-20', // 80px
  };
  
  // Icon size mapping
  const iconSizes = {
    xs: 14,
    sm: 16,
    md: 20,
    lg: 28,
    xl: 32,
  };
  
  // Determine what to render based on src and error state
  const renderContent = () => {
    // If there's an image path and no error, render the image
    if (src && !imageError) {
      return (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      );
    }
    
    // If there's fallback text, render it
    if (fallbackText) {
      return (
        <span className={`font-medium text-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {fallbackText.charAt(0).toUpperCase()}
        </span>
      );
    }
    
    // Default to user icon
    return <User size={iconSizes[size]} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />;
  };
  
  // Combine base classes with size and custom classes
  const baseClasses = `rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${
    darkMode ? 'bg-gray-700' : 'bg-gray-200'
  } ${sizeClasses[size]} ${className}`;
  
  return (
    <div className={baseClasses}>
      {renderContent()}
    </div>
  );
};

export default Avatar; 