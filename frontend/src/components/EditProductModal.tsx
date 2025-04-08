import React, { useState, useRef, useEffect } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { X, Upload, Tag, ShoppingBag, IndianRupee, Package, Trash2, Edit } from 'lucide-react';
import axiosInstance from '../utils/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

type EditProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated?: () => void;
  productId: number | null;
};

interface ProductImage {
  id: number;
  url: string;
  productId: number;
  isPrimary: boolean;
}

interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  quantity: number;
  status: string;
  images: ProductImage[];
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  onProductUpdated,
  productId
}) => {
  const { darkMode } = useDarkMode();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for form fields
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [price, setPrice] = useState<number>(0);
  const [category, setCategory] = useState<string>('electronics');
  const [quantity, setQuantity] = useState<number>(1);
  const [condition, setCondition] = useState<string>('new');
  const [status, setStatus] = useState<string>('AVAILABLE');
  
  // State for images
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviewUrls, setNewImagePreviewUrls] = useState<string[]>([]);
  
  // State for UI
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<'details' | 'images'>('details');

  // Categories for dropdown
  const categories = ['electronics', 'clothing', 'books', 'home', 'other'];
  
  // Conditions for dropdown
  const conditions = ['new', 'like_new', 'good', 'fair', 'poor'];

  // Status options
  const statusOptions = ['AVAILABLE', 'SOLD', 'HIDDEN'];
  
  // Fetch product data when modal opens
  useEffect(() => {
    if (isOpen && productId) {
      fetchProductDetails(productId);
    }
  }, [isOpen, productId]);
  
  // Reset form when modal is closed
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice(0);
    setCategory('electronics');
    setQuantity(1);
    setCondition('new');
    setStatus('AVAILABLE');
    setExistingImages([]);
    setImagesToDelete([]);
    setNewImages([]);
    setNewImagePreviewUrls([]);
    setCurrentTab('details');
    setError('');
  };
  
  // Fetch product details from the API
  const fetchProductDetails = async (id: number) => {
    setIsFetching(true);
    try {
      const response = await axiosInstance.get<Product>(`/api/marketplace/products/${id}`);
      const product = response.data;
      
      // Populate form with product data
      setTitle(product.title);
      setDescription(product.description);
      setPrice(product.price);
      setCategory(product.category || 'electronics');
      setQuantity(product.quantity);
      setCondition(product.condition || 'new');
      setStatus(product.status);
      setExistingImages(product.images || []);
      
    } catch (err) {
      console.error('Error fetching product details:', err);
      setError('Failed to load product details. Please try again.');
    } finally {
      setIsFetching(false);
    }
  };
  
  const validateForm = (): boolean => {
    if (!title || !description || price <= 0 || !category || quantity <= 0 || !condition) {
      setError('Please fill all required fields with valid values.');
      return false;
    }
    
    // Check if there will be at least one image after deletion
    const totalImagesAfterDeletion = existingImages.length - imagesToDelete.length + newImages.length;
    if (totalImagesAfterDeletion === 0) {
      setError('Your product must have at least one image.');
      return false;
    }
    
    return true;
  };
  
  if (!isOpen) return null;
  
  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      
      // Limit to 5 images total (existing + new)
      const remainingSlots = 5 - (existingImages.length - imagesToDelete.length);
      const filesToAdd = selectedFiles.slice(0, remainingSlots);
      
      // Update new images state
      const updatedNewImages = [...newImages, ...filesToAdd];
      setNewImages(updatedNewImages);
      
      // Create preview URLs for the new images
      const newPreviews = filesToAdd.map(file => URL.createObjectURL(file));
      setNewImagePreviewUrls([...newImagePreviewUrls, ...newPreviews]);
    }
  };
  
  const removeNewImage = (index: number) => {
    const updatedImages = [...newImages];
    updatedImages.splice(index, 1);
    setNewImages(updatedImages);
    
    const updatedPreviews = [...newImagePreviewUrls];
    URL.revokeObjectURL(updatedPreviews[index]); // Clean up URL object
    updatedPreviews.splice(index, 1);
    setNewImagePreviewUrls(updatedPreviews);
  };
  
  const toggleImageToDelete = (imageId: number) => {
    if (imagesToDelete.includes(imageId)) {
      setImagesToDelete(imagesToDelete.filter(id => id !== imageId));
    } else {
      // Don't allow deleting all images without adding new ones
      if (existingImages.length - imagesToDelete.length <= 1 && newImages.length === 0) {
        setError('Your product must have at least one image. Upload a new image before deleting this one.');
        return;
      }
      setImagesToDelete([...imagesToDelete, imageId]);
    }
    setError(''); // Clear any existing errors
  };
  
  const handleSubmit = async () => {
    if (!validateForm() || !productId) return;
    
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price.toString());
      formData.append('category', category);
      formData.append('quantity', quantity.toString());
      formData.append('condition', condition);
      formData.append('status', status);
      
      // Add image IDs to delete
      if (imagesToDelete.length > 0) {
        formData.append('deleteImages', imagesToDelete.join(','));
      }
      
      // Append each new image to the form data
      newImages.forEach(image => {
        formData.append('images', image);
      });
      
      // Use PUT request to update the product
      const response = await axiosInstance.put(`/api/marketplace/products/${productId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      // Reset form after successful submission
      resetForm();
      
      // Close modal and notify parent component
      onClose();
      if (onProductUpdated) {
        onProductUpdated();
      }
    } catch (err) {
      console.error('Error updating product:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to render form inputs
  const renderInput = (
    label: string, 
    value: string | number, 
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void, 
    type: string = 'text',
    placeholder: string = '',
    required: boolean = true,
    min?: number,
    max?: number,
    isTextarea: boolean = false
  ) => {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {isTextarea ? (
          <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            rows={4}
            className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 
              ${darkMode 
                ? 'bg-gray-700 border-gray-600 focus:ring-indigo-500 text-white' 
                : 'bg-white border-gray-300 focus:ring-indigo-400 text-gray-900'} 
              border shadow-sm`}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            min={min}
            max={max}
            className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 
              ${darkMode 
                ? 'bg-gray-700 border-gray-600 focus:ring-indigo-500 text-white' 
                : 'bg-white border-gray-300 focus:ring-indigo-400 text-gray-900'} 
              border shadow-sm`}
          />
        )}
      </div>
    );
  };
  
  // Helper function to render select inputs
  const renderSelect = (
    label: string, 
    value: string, 
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, 
    options: string[],
    required: boolean = true
  ) => {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={value}
          onChange={onChange}
          required={required}
          className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 
            ${darkMode 
              ? 'bg-gray-700 border-gray-600 focus:ring-indigo-500 text-white' 
              : 'bg-white border-gray-300 focus:ring-indigo-400 text-gray-900'} 
            border shadow-sm`}
        >
          {options.map(option => (
            <option key={option} value={option}>
              {option.charAt(0).toUpperCase() + option.slice(1).replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>
    );
  };
  
  const getImageUrl = (imagePath: string): string | undefined => {
    if (!imagePath) return undefined;
    
    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    if (imagePath.startsWith('/')) {
      return `${apiUrl}${imagePath}`;
    }
    return `${apiUrl}/${imagePath}`;
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/40 p-4 sidebar-exclude"
          onClick={onClose}
          style={{ 
            backdropFilter: 'blur(8px)',
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
            left: window.innerWidth <= 1024 ? '64px' : '256px'
          }}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className={`relative w-full max-w-lg rounded-xl overflow-hidden ${darkMode ? 'bg-gray-800/95' : 'bg-white/95'} shadow-xl backdrop-blur-md`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header with gradient background */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit size={24} />
                  <h3 className="text-xl font-bold">Edit Product</h3>
                </div>
                <button 
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Loading overlay */}
            {isFetching && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
                <div className="bg-white/10 backdrop-blur-md p-6 rounded-lg flex flex-col items-center">
                  <div className="w-10 h-10 border-4 border-t-blue-500 border-blue-500/30 rounded-full animate-spin mb-4"></div>
                  <p className="text-white font-medium">Loading product details...</p>
                </div>
              </div>
            )}
            
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                className={`flex-1 py-3 font-medium text-center relative
                  ${currentTab === 'details' 
                    ? darkMode 
                      ? 'text-white' 
                      : 'text-blue-600' 
                    : darkMode 
                      ? 'text-gray-400 hover:text-gray-300' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                onClick={() => setCurrentTab('details')}
              >
                Product Details
                {currentTab === 'details' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></span>
                )}
              </button>
              <button
                className={`flex-1 py-3 font-medium text-center relative
                  ${currentTab === 'images' 
                    ? darkMode 
                      ? 'text-white' 
                      : 'text-blue-600' 
                    : darkMode 
                      ? 'text-gray-400 hover:text-gray-300' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                onClick={() => setCurrentTab('images')}
              >
                Images
                {currentTab === 'images' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></span>
                )}
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {currentTab === 'details' ? (
                <>
                  {/* Product Details Form */}
                  <div className="space-y-4">
                    {renderInput('Product Name', title, (e) => setTitle(e.target.value), 'text', 'Enter product name')}
                    
                    {renderInput('Description', description, (e) => setDescription(e.target.value), 'text', 'Describe your product...', true, undefined, undefined, true)}
                    
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">
                          Price (₹) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <IndianRupee size={16} className="text-gray-400" />
                          </div>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={price || ''}
                            onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 
                              ${darkMode 
                                ? 'bg-gray-700 border-gray-600 focus:ring-indigo-500 text-white' 
                                : 'bg-white border-gray-300 focus:ring-indigo-400 text-gray-900'} 
                              border shadow-sm`}
                          />
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">
                          Quantity <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Package size={16} className="text-gray-400" />
                          </div>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={quantity || ''}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            placeholder="1"
                            className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 
                              ${darkMode 
                                ? 'bg-gray-700 border-gray-600 focus:ring-indigo-500 text-white' 
                                : 'bg-white border-gray-300 focus:ring-indigo-400 text-gray-900'} 
                              border shadow-sm`}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      {renderSelect('Category', category, (e) => setCategory(e.target.value), categories)}
                      {renderSelect('Condition', condition, (e) => setCondition(e.target.value), conditions)}
                    </div>
                    
                    {/* Status selector */}
                    {renderSelect('Status', status, (e) => setStatus(e.target.value), statusOptions)}
                    
                    <div className={`p-4 rounded-lg mb-4 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                      <h4 className="font-medium mb-2 flex items-center gap-1.5">
                        <Tag size={16} />
                        Seller Information
                      </h4>
                      <p className="text-sm">Your contact details from your profile will be shared with the buyer after purchase.</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Images Upload Section */}
                  <div>
                    {/* Existing Images Section */}
                    {existingImages.length > 0 && (
                      <>
                        <h4 className="font-medium mb-3">Current Images</h4>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          {existingImages.map((image) => (
                            <div 
                              key={image.id} 
                              className={`relative rounded-lg overflow-hidden h-32 ${
                                imagesToDelete.includes(image.id) ? 'opacity-50' : ''
                              }`}
                            >
                              <img 
                                src={getImageUrl(image.url)} 
                                alt={`Product image ${image.id}`} 
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => toggleImageToDelete(image.id)}
                                className={`absolute top-1 right-1 p-1.5 rounded-full transition-colors ${
                                  imagesToDelete.includes(image.id)
                                    ? 'bg-green-500 hover:bg-green-600'
                                    : 'bg-red-500 hover:bg-red-600'
                                } text-white`}
                                title={imagesToDelete.includes(image.id) ? "Restore image" : "Mark for deletion"}
                              >
                                {imagesToDelete.includes(image.id) ? (
                                  <span className="text-xs">↺</span>
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                              {image.isPrimary && (
                                <div className="absolute bottom-0 left-0 right-0 bg-blue-500/70 text-white text-xs py-1 text-center">
                                  Primary Image
                                </div>
                              )}
                              {imagesToDelete.includes(image.id) && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                                    Will be deleted
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    
                    {/* Add new images */}
                    <h4 className="font-medium mb-3">Add New Images</h4>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-8 mb-4 text-center cursor-pointer transition-colors
                        ${darkMode 
                          ? 'border-gray-600 hover:border-indigo-500 bg-gray-700/30' 
                          : 'border-gray-300 hover:border-indigo-500 bg-gray-50'}`}
                    >
                      <Upload size={36} className={`mx-auto mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <p className="mb-1 font-medium">Click to upload additional images</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        PNG, JPG or WEBP (Max 5 images total)
                      </p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleNewImageChange}
                        accept="image/png, image/jpeg, image/webp"
                        multiple
                        className="hidden"
                      />
                    </div>
                    
                    {/* New Image Previews */}
                    {newImagePreviewUrls.length > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        {newImagePreviewUrls.map((url, index) => (
                          <div 
                            key={index} 
                            className="relative rounded-lg overflow-hidden h-32"
                          >
                            <img 
                              src={url} 
                              alt={`New image preview ${index + 1}`} 
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => removeNewImage(index)}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                              <X size={14} />
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 bg-green-500/70 text-white text-xs py-1 text-center">
                              New Image
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {/* Error Message */}
              {error && (
                <div className="mt-4 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">
                  {error}
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                {currentTab === 'details' ? (
                  <>
                    <button
                      onClick={onClose}
                      className={`px-4 py-2 rounded-lg text-sm font-medium
                        ${darkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setCurrentTab('images')}
                      className={`px-5 py-2 rounded-lg text-sm font-medium
                        ${darkMode
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                    >
                      Next
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setCurrentTab('details')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium
                        ${darkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className={`px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2
                        bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700
                        text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md`}
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <Edit size={16} />
                          <span>Update Product</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EditProductModal; 