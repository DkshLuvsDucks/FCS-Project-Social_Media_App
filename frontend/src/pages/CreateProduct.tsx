import React, { useState } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import DarkModeToggle from '../components/DarkModeToggle';
import { ChevronLeft, Upload, X, Check } from 'lucide-react';
import axiosInstance from '../utils/axios';

// Define category options
const CATEGORIES = ['electronics', 'clothing', 'books', 'home', 'other'];

const CreateProduct: React.FC = () => {
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  
  // Product form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      
      // Limit to 5 images total
      if (images.length + newFiles.length > 5) {
        setError('Maximum 5 images allowed');
        return;
      }
      
      // Add new files to state
      setImages([...images, ...newFiles]);
      
      // Create preview URLs
      const newImageUrls = newFiles.map(file => URL.createObjectURL(file));
      setImagePreviewUrls([...imagePreviewUrls, ...newImageUrls]);
      
      // Clear any previous errors
      setError('');
    }
  };
  
  // Remove an image
  const removeImage = (index: number) => {
    const newImages = [...images];
    const newImageUrls = [...imagePreviewUrls];
    
    // Release the object URL to avoid memory leaks
    URL.revokeObjectURL(newImageUrls[index]);
    
    newImages.splice(index, 1);
    newImageUrls.splice(index, 1);
    
    setImages(newImages);
    setImagePreviewUrls(newImageUrls);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    
    if (!price || parseFloat(price) <= 0) {
      setError('Price must be greater than 0');
      return;
    }
    
    // Start submission
    setIsSubmitting(true);
    setError('');
    
    try {
      // Create FormData object for file upload
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category', category);
      
      // Add all images
      images.forEach((image, index) => {
        formData.append(`images`, image);
      });
      
      // Send request
      await axiosInstance.post('/api/marketplace/products', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Show success message
      setSuccess(true);
      
      // Redirect after a delay
      setTimeout(() => {
        navigate('/marketplace');
      }, 2000);
    } catch (error) {
      console.error('Error creating product:', error);
      setError('Failed to create product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Left Sidebar Navigation */}
      <Sidebar />
      
      {/* Dark Mode Toggle - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <DarkModeToggle />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 ml-16 flex flex-col min-h-screen">
        {/* Top Bar */}
        <div className={`sticky top-0 z-10 h-16 w-full ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-100 border-gray-200'} border-b backdrop-blur-sm transition-colors duration-200`}>
          <div className="flex items-center justify-between h-full px-4">
            <button 
              onClick={() => navigate(-1)}
              className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-semibold">Create Listing</h1>
            <div className="w-10"></div> {/* Spacer to balance the layout */}
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 max-w-3xl mx-auto w-full p-4">
          {success ? (
            <div className={`mt-8 p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} flex flex-col items-center justify-center`}>
              <div className="bg-green-100 text-green-800 rounded-full p-4 inline-flex mb-4">
                <Check size={32} />
              </div>
              <h2 className="text-xl font-bold mb-2">Listing Created Successfully!</h2>
              <p className="text-center mb-4">
                Your product has been added to the marketplace.
                Redirecting to marketplace...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={`mt-6 p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
              <h2 className="text-xl font-semibold mb-6">Product Details</h2>
              
              {error && (
                <div className={`p-3 mb-4 rounded-lg bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`}>
                  {error}
                </div>
              )}
              
              {/* Title */}
              <div className="mb-4">
                <label className="block mb-2 font-medium">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What are you selling?"
                  maxLength={100}
                  className={`w-full p-3 rounded-lg ${
                    darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-100 text-gray-900 border-gray-300'
                  } border focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
              </div>
              
              {/* Description */}
              <div className="mb-4">
                <label className="block mb-2 font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your item (condition, features, etc.)"
                  rows={4}
                  maxLength={1000}
                  className={`w-full p-3 rounded-lg ${
                    darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-100 text-gray-900 border-gray-300'
                  } border focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {description.length}/1000 characters
                </p>
              </div>
              
              {/* Price */}
              <div className="mb-4">
                <label className="block mb-2 font-medium">Price ($)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className={`w-full p-3 rounded-lg ${
                    darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-100 text-gray-900 border-gray-300'
                  } border focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
              </div>
              
              {/* Category */}
              <div className="mb-6">
                <label className="block mb-2 font-medium">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`w-full p-3 rounded-lg ${
                    darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-100 text-gray-900 border-gray-300'
                  } border focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Images */}
              <div className="mb-6">
                <label className="block mb-2 font-medium">Images</label>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  {imagePreviewUrls.map((url, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden border"
                    >
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  
                  {/* Add image button */}
                  {images.length < 5 && (
                    <label className={`cursor-pointer aspect-square flex flex-col items-center justify-center rounded-lg border-2 border-dashed ${
                      darkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'
                    }`}>
                      <Upload size={24} className="mb-2" />
                      <span className="text-sm">Add Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Upload up to 5 images. First image will be used as cover.
                </p>
              </div>
              
              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full p-3 rounded-lg font-medium ${
                  darkMode
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                } transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? 'Creating Listing...' : 'Create Listing'}
              </button>
            </form>
          )}
          
          {/* Guidelines */}
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} mt-8`}>
            <h2 className="text-lg font-semibold mb-3">Listing Guidelines</h2>
            <ul className={`list-disc pl-5 ${darkMode ? 'text-gray-300' : 'text-gray-700'} space-y-2`}>
              <li>Be accurate and detailed about your item's condition</li>
              <li>Include clear photos from multiple angles</li>
              <li>Set realistic prices based on item condition and market value</li>
              <li>Do not sell prohibited items (weapons, illegal goods, etc.)</li>
              <li>Use secure payment methods through our platform only</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProduct; 