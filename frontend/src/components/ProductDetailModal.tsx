import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Calendar, Package, IndianRupee, Tag, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import Avatar from './ui/Avatar';
import ProductImage from './ui/ProductImage';

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

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onBuy: (product: Product) => void;
  getImageUrl: (imagePath: string) => string | undefined;
  currentUser: { id: number } | null;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  onBuy,
  getImageUrl,
  currentUser
}) => {
  const { darkMode } = useDarkMode();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  if (!product) return null;

  const isCurrentUserSeller = () => {
    return currentUser?.id === product.seller.id;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };
  
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-IN', options);
  };
  
  const getConditionLabel = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'new': return 'Brand New';
      case 'like_new': return 'Like New';
      case 'good': return 'Good Condition';
      case 'fair': return 'Fair Condition';
      case 'poor': return 'Poor Condition';
      default: return condition;
    }
  };
  
  const getConditionColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'new': return 'text-green-500';
      case 'like_new': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-400';
      default: return 'text-gray-500';
    }
  };

  const nextImage = () => {
    if (product.images && product.images.length > 0) {
      setActiveImageIndex((activeImageIndex + 1) % product.images.length);
    }
  };

  const prevImage = () => {
    if (product.images && product.images.length > 0) {
      setActiveImageIndex((activeImageIndex - 1 + product.images.length) % product.images.length);
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className={`relative w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl ${darkMode ? 'bg-gray-900' : 'bg-white'} flex flex-col md:flex-row`}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute right-4 top-4 z-50 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            
            {/* Left side - Image carousel (doesn't scroll) */}
            <div className={`w-full md:w-1/2 md:max-h-[90vh] relative ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} flex flex-col`}>
              <div className="aspect-square relative flex items-center justify-center flex-grow-0 flex-shrink-0">
                {/* Main image display */}
                {product.images && product.images.length > 0 ? (
                  <div className="w-full h-full overflow-hidden flex items-center justify-center">
                    <img
                      src={getImageUrl(product.images[activeImageIndex]) || ''}
                      alt={`${product.title} - Image ${activeImageIndex + 1}`}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.className = 'hidden';
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = document.createElement('div');
                          fallback.className = 'w-full h-full flex flex-col items-center justify-center';
                          fallback.innerHTML = `
                            <div class="p-6 rounded-full ${darkMode ? 'bg-gray-700/50' : 'bg-gray-200/70'}">
                              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${darkMode ? 'text-gray-500' : 'text-gray-400'}"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line></svg>
                            </div>
                            <p class="mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'} text-sm">Image not available</p>
                          `;
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="flex flex-col items-center">
                      <ShoppingBag size={64} className={`${darkMode ? 'text-gray-600' : 'text-gray-400'} mb-2`} />
                      <span className={`${darkMode ? 'text-gray-500' : 'text-gray-500'} text-sm`}>No images available</span>
                    </div>
                  </div>
                )}
                
                {/* Navigation arrows - only show if multiple images */}
                {product.images && product.images.length > 1 && (
                  <>
                    <button 
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        prevImage();
                      }}
                    >
                      <ChevronLeft size={24} />
                    </button>
                    
                    <button 
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImage();
                      }}
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}
                
                {/* Image counter indicator - show only if multiple images */}
                {product.images && product.images.length > 1 && (
                  <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                    {activeImageIndex + 1} / {product.images.length}
                  </div>
                )}
                
                {/* Sold out overlay */}
                {product.status === 'SOLD' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px] z-20">
                    <div className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold transform -rotate-12 text-xl shadow-lg">
                      SOLD OUT
                    </div>
                  </div>
                )}
              </div>
              
              {/* Thumbnail gallery - below the carousel - only show if 2+ images */}
              {product.images && product.images.length > 1 && (
                <div className={`px-4 py-3 flex justify-center gap-2 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} overflow-x-auto scrollbar-thin ${darkMode ? 'scrollbar-thumb-gray-600 scrollbar-track-gray-800' : 'scrollbar-thumb-gray-400 scrollbar-track-gray-200'} flex-shrink-0`}>
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex(index);
                      }}
                      className={`flex-shrink-0 w-14 h-14 rounded-md overflow-hidden ${
                        index === activeImageIndex
                          ? 'ring-2 ring-blue-500 border-2 border-blue-500'
                          : `border ${darkMode ? 'border-gray-700' : 'border-gray-300'} opacity-60 hover:opacity-100`
                      } transition-all`}
                    >
                      <img
                        src={getImageUrl(image) || ''}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '';
                          target.className = 'hidden';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.className = parent.className + ` flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`;
                            const fallback = document.createElement('div');
                            fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${darkMode ? 'text-gray-500' : 'text-gray-400'}"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`;
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Right side - Product details with buy button */}
            <div className={`w-full md:w-1/2 flex flex-col max-h-[90vh] relative ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
              {/* Scrollable content area */}
              <div className="overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent pb-20">
                {/* Product title and price */}
                <div className="mb-4">
                  <h2 className="text-2xl font-bold break-words">{product.title}</h2>
                  <p className={`text-xl font-bold mt-2 flex items-center ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                    <IndianRupee size={18} className="inline mr-1 flex-shrink-0" />
                    <span>{formatPrice(product.price).replace('₹', '')}</span>
                  </p>
                </div>
                
                {/* Availability and condition */}
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    product.status === 'AVAILABLE' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {product.status === 'AVAILABLE' ? 'Available' : 'Sold Out'}
                  </span>
                  
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    darkMode ? 'bg-gray-800' : 'bg-gray-100'
                  } ${getConditionColor(product.condition)}`}>
                    {getConditionLabel(product.condition)}
                  </span>
                  
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    darkMode ? 'bg-gray-800 text-blue-400' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
                  </span>
                </div>
                
                {/* Description */}
                <div className="mb-4">
                  <h3 className="text-lg font-medium mb-2">Description</h3>
                  <div className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} break-words whitespace-pre-wrap max-h-[15vh] overflow-y-auto scrollbar-thin ${darkMode ? 'scrollbar-thumb-gray-700 scrollbar-track-gray-800/20' : 'scrollbar-thumb-gray-300 scrollbar-track-gray-100'} p-2 rounded-md ${darkMode ? 'bg-gray-800/50' : 'bg-gray-100/70'}`}>
                    {product.description}
                  </div>
                </div>
                
                {/* Product details */}
                <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Tag size={16} className="flex-shrink-0" />
                    <span className="text-sm truncate">Category: {product.category}</span>
                  </div>
                  
                  <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Package size={16} className="flex-shrink-0" />
                    <span className="text-sm truncate">Quantity: {product.quantity}</span>
                  </div>
                  
                  <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Calendar size={16} className="flex-shrink-0" />
                    <span className="text-sm truncate">Listed on: {formatDate(product.createdAt)}</span>
                  </div>
                  
                  <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Shield size={16} className="flex-shrink-0" />
                    <span className="text-sm truncate">Secure Transaction</span>
                  </div>
                </div>
                
                {/* Seller info */}
                <div className={`mb-4 p-4 rounded-lg ${darkMode ? 'bg-gray-800/80' : 'bg-gray-100'}`}>
                  <h3 className="text-sm font-medium mb-2">Seller Information</h3>
                  <div className="flex items-center">
                    <Avatar
                      src={product.seller.userImage ? getImageUrl(product.seller.userImage) : null}
                      alt={product.seller.username}
                      size="md"
                      fallbackText={product.seller.username}
                      className="mr-3 ring-2 ring-blue-500"
                    />
                    <div>
                      <p className="font-medium">{product.seller.username}</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Contact details shared after purchase</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Buy now button - fixed at bottom of right side */}
              {product.status === 'AVAILABLE' && !isCurrentUserSeller() && (
                <div className={`p-4 border-t ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'} absolute bottom-0 left-0 right-0 z-10`}>
                  <button
                    onClick={() => onBuy(product)}
                    className={`w-full py-3 rounded-lg font-medium flex items-center justify-center
                      ${darkMode 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                      } transition-colors shadow-md`}
                  >
                    <ShoppingBag size={18} className="mr-2" />
                    Buy Now for {formatPrice(product.price)}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProductDetailModal; 