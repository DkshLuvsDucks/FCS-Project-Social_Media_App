import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 24, 
  className = '' 
}) => {
  return (
    <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${className}`} 
         style={{ width: `${size}px`, height: `${size}px` }}>
    </div>
  );
};

export default LoadingSpinner;
