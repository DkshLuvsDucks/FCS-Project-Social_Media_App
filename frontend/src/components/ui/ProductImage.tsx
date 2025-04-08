import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useDarkMode } from '../../context/DarkModeContext';

interface ProductImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'auto';
  objectFit?: 'cover' | 'contain';
}

const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt = 'Product image',
  className = '',
  aspectRatio = 'square',
  objectFit = 'cover'
}) => {
  const { darkMode } = useDarkMode();
  const [imageError, setImageError] = React.useState(false);
  
  // Aspect ratio classes
  const aspectRatioClasses = {
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    landscape: 'aspect-[4/3]',
    auto: '',
  };
  
  // Object fit classes
  const objectFitClasses = {
    cover: 'object-cover',
    contain: 'object-contain',
  };
  
  // Base classes for the container
  const containerClasses = `relative overflow-hidden ${aspectRatioClasses[aspectRatio]} ${className}`;
  
  // Create fallback content
  const renderFallback = () => (
    <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
      <div className="flex flex-col items-center text-center p-4">
        <ShoppingBag 
          size={48} 
          className={`mb-2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} 
        />
        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
          Image not available
        </span>
      </div>
    </div>
  );
  
  return (
    <div className={containerClasses}>
      {src && !imageError ? (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full ${objectFitClasses[objectFit]} transition-transform duration-200 hover:scale-105`}
          onError={() => setImageError(true)}
        />
      ) : (
        renderFallback()
      )}
    </div>
  );
};

export default ProductImage; 