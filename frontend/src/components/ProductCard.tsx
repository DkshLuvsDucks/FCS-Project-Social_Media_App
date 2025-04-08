import React from 'react';
import { IndianRupee, ShoppingCart } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  bio: string | null;
  userImage: string | null;
  createdAt: string;
  role: string;
  isAuthenticated: boolean;
}

interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  images: string[];
  seller: {
    id: number;
    username: string;
    userImage: string | null;
  };
  category: string;
  condition: string;
  quantity: number;
  createdAt: string;
  status: string;
}

interface ProductCardProps {
  product: Product;
  darkMode: boolean;
  user: User | null;
  onBuy: (product: Product) => void;
  onEdit: () => void;
  getImageUrl: (imagePath: string) => string | undefined;
  isOwner?: boolean;
  onClick: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  darkMode,
  user,
  onBuy,
  onEdit,
  getImageUrl,
  isOwner = false,
  onClick
}) => {
  const handleCardClick = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('button')) {
      onClick();
    }
  };

  return (
    <div 
      className={`rounded-xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col w-full mx-auto cursor-pointer`}
      style={{ maxWidth: '280px', minWidth: '200px' }}
      onClick={handleCardClick}
    >
      {/* Product image - fixed height container */}
      <div className="aspect-square w-full overflow-hidden relative flex-shrink-0">
        <img 
          src={product.images[0] ? getImageUrl(product.images[0]) || '' : ''}
          alt={product.title}
          className="w-full h-full object-cover bg-gray-300"
          onError={(e) => { 
            e.currentTarget.src = '';
            e.currentTarget.className = 'w-full h-full object-cover bg-gray-300 flex items-center justify-center';
          }}
        />
        {product.status === 'sold' && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="bg-red-500 text-white px-4 py-2 rounded-full font-bold">SOLD</span>
          </div>
        )}
        <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full px-2 py-1 text-xs font-bold">
          {product.category}
        </div>
        
        {/* Owner badge if it's the user's product */}
        {isOwner && (
          <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full px-2 py-1 text-xs font-medium">
            Your Item
          </div>
        )}
      </div>
      
      {/* Product info - allow this to expand */}
      <div className="p-3 flex-grow flex flex-col min-h-[110px]">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold truncate flex-1 text-sm">{product.title}</h3>
          <span className="font-bold text-indigo-500 flex items-center whitespace-nowrap ml-2 text-sm">
            <IndianRupee size={12} className="mr-0.5 flex-shrink-0" />
            {product.price.toFixed(2)}
          </span>
        </div>
        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} line-clamp-2 mb-2 flex-grow`}>
          {product.description}
        </p>
        
        {/* Seller info - at the bottom */}
        <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-700/20">
          <div className="flex items-center max-w-[50%]">
            <div 
              className="w-5 h-5 rounded-full mr-1 bg-gray-400 flex items-center justify-center text-xs text-white overflow-hidden flex-shrink-0"
            >
              {product.seller.userImage ? (
                <img 
                  src={getImageUrl(product.seller.userImage) || ''} 
                  alt={product.seller.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '';
                    e.currentTarget.className = 'hidden';
                    e.currentTarget.parentElement!.innerText = product.seller.username.charAt(0).toUpperCase();
                  }}
                />
              ) : (
                product.seller.username.charAt(0).toUpperCase()
              )}
            </div>
            <span className="text-xs font-medium truncate">{product.seller.username}</span>
          </div>
          
          {/* Action button based on owner status */}
          {product.status !== 'sold' && (
            <>
              {isOwner ? (
                <button
                  onClick={onEdit}
                  className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  } transition-colors duration-200 flex-shrink-0`}
                >
                  Edit
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onBuy(product);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'
                  } text-white transition-colors duration-200 flex-shrink-0 flex items-center`}
                >
                  <ShoppingCart size={12} className="mr-1 flex-shrink-0" />
                  Buy Now
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard; 