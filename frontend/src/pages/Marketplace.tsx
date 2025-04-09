import React, { useState, useEffect, useRef } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import DarkModeToggle from '../components/DarkModeToggle';
import { ChevronLeft, Search, Filter, Plus, ShoppingBag, IndianRupee, Eye } from 'lucide-react';
import axiosInstance from '../utils/axios';
import { useAuth, User as AuthUser } from '../context/AuthContext';
import AddFundsModal from '../components/AddFundsModal';
import AddProductModal from '../components/AddProductModal';
import EditProductModal from '../components/EditProductModal';
import ProductDetailModal from '../components/ProductDetailModal';
import Avatar from '../components/ui/Avatar';
import ProductImage from '../components/ui/ProductImage';
import ProductCard from '../components/ProductCard';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import VerificationModal from '../components/VerificationModal';

// ProductCard User type
interface ProductCardUser {
  id: number;
  username: string;
  email: string;
  bio: string | null;
  userImage: string | null;
  createdAt: string;
  role: string;
  isAuthenticated: boolean;
}

// Adapter function to convert AuthUser to ProductCardUser
const adaptUserForProductCard = (user: AuthUser | null): ProductCardUser | null => {
  if (!user) return null;
  
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    bio: user.bio,
    userImage: user.userImage,
    role: user.role,
    createdAt: new Date().toISOString(), // Default value since AuthUser doesn't have createdAt
    isAuthenticated: true // Default value since AuthUser doesn't have isAuthenticated
  };
};

// Types
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

interface Wallet {
  balance: number;
}

// Add interface for user status response
interface UserStatus {
  isSeller: boolean;
  sellerStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  sellerVerificationDoc: string | null;
}

const Marketplace: React.FC = () => {
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  const [wallet, setWallet] = useState<Wallet>({ balance: 0 });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showUserProducts, setShowUserProducts] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [productToEdit, setProductToEdit] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedViewProduct, setSelectedViewProduct] = useState<Product | null>(null);
  
  // Verification modal state
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  
  // Categories for filtering
  const categories = ['all', 'electronics', 'clothing', 'books', 'home', 'other'];
  
  // Add a ref to track if the user status has been fetched
  const statusFetchedRef = useRef(false);
  
  // Replace the user status effect with this one
  useEffect(() => {
    const fetchUserStatus = async () => {
      if (!user?.id || statusFetchedRef.current) return;
      
      try {
        console.log('Fetching seller status from API');
        const response = await axiosInstance.get<UserStatus>(`/api/users/status/${user.id}`);
        if (response.data) {
          // Only update if seller status has changed
          if (
            response.data.isSeller !== user.isSeller || 
            response.data.sellerStatus !== user.sellerStatus ||
            response.data.sellerVerificationDoc !== user.sellerVerificationDoc
          ) {
            console.log('Updating user with new seller status:', response.data);
            updateUser({
              ...user,
              isSeller: response.data.isSeller,
              sellerStatus: response.data.sellerStatus,
              sellerVerificationDoc: response.data.sellerVerificationDoc
            });
          }
          // Mark as fetched
          statusFetchedRef.current = true;
        }
      } catch (error) {
        console.error('Error fetching user status:', error);
      }
    };

    fetchUserStatus();
    
    // Reset the ref when user ID changes
    return () => {
      statusFetchedRef.current = false;
    };
  }, [user?.id]);
  
  // Fetch products and wallet balance
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products
        await fetchProducts();
        
        // Fetch wallet
        const walletResponse = await axiosInstance.get<Wallet>('/api/marketplace/wallet');
        setWallet(walletResponse.data);
      } catch (error) {
        console.error('Error fetching marketplace data:', error);
      }
    };
    
    fetchData();
    
    // Redirect from user products view if not an approved seller
    if (showUserProducts && !(user?.isSeller && user?.sellerStatus === 'APPROVED')) {
      setShowUserProducts(false);
    }
  }, [user, showUserProducts]);
  
  // Filter products when search term or filters change
  useEffect(() => {
    let filtered = [...products];
    
    // Apply search term filter
    if (searchTerm) {
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply category filter
    if (category && category !== 'all') {
      filtered = filtered.filter(product => product.category === category);
    }
    
    // Apply price range filter
    filtered = filtered.filter(product => 
      product.price >= priceRange.min && product.price <= priceRange.max
    );
    
    // Separate user's products and other products
    const userProducts = filtered.filter(product => product.seller.id === user?.id);
    const otherProducts = filtered.filter(product => product.seller.id !== user?.id);
    
    setFilteredProducts(otherProducts);
    setUserProducts(userProducts);
  }, [searchTerm, category, priceRange, products, user?.id]);
  
  // Handle purchasing a product
  const handlePurchase = (product: Product) => {
    if (!user?.email) {
      toast.error("Your account doesn't have an email set up for verification");
      return;
    }

    if (product.quantity <= 0) {
      toast.error('This product is out of stock');
      return;
    }
    
    if (wallet.balance < product.price) {
      toast.error('Insufficient balance in your wallet');
      return;
    }
    
    setSelectedProduct(product);
    setVerificationModalOpen(true);
  };
  
  // Handle verification completed successfully
  const handleVerificationComplete = async () => {
    if (!selectedProduct || !user) return;
    
    try {
      // Process the purchase after successful verification
      const response = await axiosInstance.post<{success: boolean, newBalance: number}>('/api/marketplace/purchase', {
        productId: parseInt(selectedProduct.id.toString()) // Ensure it's a number
      });
      
      if (response.data.success) {
        // Update wallet balance with the new balance from the server
        setWallet({ balance: response.data.newBalance });
        
        // Update product quantity and status in both products and filteredProducts lists
        const updateProductList = (prevList: Product[]) => 
          prevList.map(p => {
            if (p.id === selectedProduct.id) {
              const newQuantity = p.quantity - 1;
              return { 
                ...p, 
                quantity: newQuantity,
                status: newQuantity === 0 ? 'SOLD' : 'AVAILABLE'
              };
            }
            return p;
          });
          
        setProducts(updateProductList);
        setFilteredProducts(updateProductList);
        
        // Show success message
        setShowSuccess(true);
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          setShowSuccess(false);
          setSelectedProduct(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error processing purchase:', error);
      toast.error('Failed to complete the purchase. Please try again.');
    }
  };
  
  // Handle updating wallet balance after adding funds
  const handleAddFundsSuccess = (newBalance: number) => {
    setWallet({ balance: newBalance });
  };
  
  // Handle product added successfully
  const handleProductAdded = () => {
    // Refresh the products list
    fetchProducts();
  };
  
  // Fetch products
  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get<Product[]>('/api/marketplace/products');
      setProducts(response.data);
      setFilteredProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };
  
  // Add a helper function to get the full image URL
  const getImageUrl = (imagePath: string): string | undefined => {
    if (!imagePath) return undefined;
    
    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    
    if (imagePath.startsWith('/')) {
      return `${apiUrl}${imagePath}`;
    }
    
    return `${apiUrl}/${imagePath}`;
  };
  
  // Handle editing a product
  const handleEditProduct = (productId: number) => {
    setProductToEdit(productId);
    setShowEditProductModal(true);
  };
  
  // Handle viewing a product
  const handleViewProduct = (product: Product) => {
    setSelectedViewProduct(product);
    setShowDetailModal(true);
  };
  
  // Add this new function near the top of the component
  const refreshSellerStatus = async () => {
    if (!user?.id) return;
    
    try {
      statusFetchedRef.current = false; // Reset the status fetched flag
      console.log('Manually refreshing seller status...');
      
      const response = await axiosInstance.get<UserStatus>(`/api/users/status/${user.id}`);
      if (response.data) {
        console.log('Refresh - New seller status:', response.data);
        
        // Always update user context with refreshed data
        updateUser({
          ...user,
          isSeller: response.data.isSeller,
          sellerStatus: response.data.sellerStatus,
          sellerVerificationDoc: response.data.sellerVerificationDoc
        });
        
        // Show success toast if they are now approved
        if (response.data.isSeller && response.data.sellerStatus === 'APPROVED') {
          toast.success('You are now verified as a seller!', {
            duration: 5000
          });
        }
        
        statusFetchedRef.current = true;
      }
    } catch (error) {
      console.error('Error refreshing seller status:', error);
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
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 lg:ml-64 ml-16 flex flex-col min-h-screen"
      >
        {/* Top Bar */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={`sticky top-0 z-10 h-16 w-full ${darkMode ? 'bg-gray-900/95 border-gray-800' : 'bg-gray-100/95 border-gray-200'} border-b backdrop-blur-sm transition-colors duration-200`}
        >
          <div className="flex items-center justify-between h-full px-4">
            <div className="flex items-center">
              <button 
                onClick={() => navigate(-1)}
                className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                aria-label="Go back"
              >
                <ChevronLeft size={24} />
              </button>
              <h1 className="text-xl font-semibold ml-2 truncate">Marketplace</h1>
            </div>
            
            <div className="flex items-center space-x-2 mr-0 sm:mr-14">
              <button 
                onClick={() => {
                  console.log('Seller verification debug:', {
                    isSeller: user?.isSeller,
                    sellerStatus: user?.sellerStatus,
                    canSell: user?.isSeller && user?.sellerStatus === 'APPROVED',
                    user: user
                  });
                  if (user?.isSeller && user?.sellerStatus === 'APPROVED') {
                    setShowAddProductModal(true);
                  } else {
                    // Refresh status first in case it changed
                    refreshSellerStatus();
                    
                    toast("You need seller verification to add products. Go to Edit Profile to apply.", {
                      icon: 'ℹ️',
                      style: {
                        border: '1px solid #3b82f6',
                        padding: '16px',
                        color: '#1e40af',
                        background: '#eff6ff'
                      },
                      duration: 5000
                    });
                  }
                }}
                title={!(user?.isSeller && user?.sellerStatus === 'APPROVED') ? "Seller verification required to list products" : ""}
                className={`px-3 py-1.5 rounded-lg ${
                  user?.isSeller && user?.sellerStatus === 'APPROVED'
                    ? darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                    : darkMode ? 'bg-blue-600/50 hover:bg-blue-700/50' : 'bg-blue-500/50 hover:bg-blue-600/50'
                } text-white flex items-center transition-colors duration-200`}
              >
                <ShoppingBag size={16} className="sm:mr-1.5" />
                <span className="font-medium hidden sm:inline">Sell Item</span>
              </button>
              <div className={`px-3 py-1 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-white'} flex items-center`}>
                <span className="font-medium flex items-center">
                  <IndianRupee size={14} className="mr-0.5" />
                  <span className="hidden xs:inline">{wallet.balance.toFixed(2)}</span>
                  <span className="xs:hidden">{wallet.balance.toFixed(2)}</span>
                </span>
                <button 
                  onClick={() => setShowAddFundsModal(true)}
                  className={`ml-2 p-1 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  aria-label="Add funds"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Search and Filters */}
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className={`p-5 ${darkMode ? 'bg-gray-800/95' : 'bg-white'} shadow-lg rounded-lg mx-4 mt-4 mb-2`}
        >
          <div className="flex flex-col md:flex-row gap-5">
            {/* Search input */}
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 rounded-xl ${
                  darkMode 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                    : 'bg-gray-50 text-gray-900 border-gray-200 focus:border-blue-400'
                } border-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200`}
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500">
                <Search size={20} />
              </div>
            </div>
            
            {/* Category filter */}
            <div className="flex-shrink-0 w-full md:w-auto">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full md:w-auto py-3 px-4 rounded-xl ${
                  darkMode 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                    : 'bg-gray-50 text-gray-900 border-gray-200 focus:border-blue-400'
                } border-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200`}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Price range filter */}
            <div className="flex-shrink-0 flex items-center gap-3 w-full md:w-auto">
              <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Price:</label>
              <div className="flex items-center gap-2 flex-1 md:flex-auto">
                <input
                  type="number"
                  min="0"
                  max={priceRange.max}
                  value={priceRange.min}
                  onChange={(e) => setPriceRange({ ...priceRange, min: parseInt(e.target.value) || 0 })}
                  className={`w-full min-w-[70px] max-w-[100px] py-3 px-3 rounded-xl ${
                    darkMode 
                      ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                      : 'bg-gray-50 text-gray-900 border-gray-200 focus:border-blue-400'
                  } border-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200`}
                />
                <span className={`text-center font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>-</span>
                <input
                  type="number"
                  min={priceRange.min}
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({ ...priceRange, max: parseInt(e.target.value) || 0 })}
                  className={`w-full min-w-[70px] max-w-[100px] py-3 px-3 rounded-xl ${
                    darkMode 
                      ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                      : 'bg-gray-50 text-gray-900 border-gray-200 focus:border-blue-400'
                  } border-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200`}
                />
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* View Toggle Section - Separate from search */}
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className={`flex justify-center pb-2 pt-1 mb-2 mx-4`}
        >
          <div className={`inline-flex rounded-full p-1.5 ${darkMode ? 'bg-gradient-to-r from-gray-800 to-gray-700' : 'bg-gradient-to-r from-gray-100 to-gray-50'} shadow-md`}>
            <div className="relative">
              {/* Animated background capsule with smoother animation */}
              <div
                className={`absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-500 ease-in-out transform ${darkMode ? 'shadow-lg shadow-blue-500/30' : 'shadow shadow-blue-500/30'}`}
                style={{
                  width: '50%',
                  left: showUserProducts ? '50%' : '0%',
                  opacity: 0.95,
                  transform: `translateX(${showUserProducts ? '0%' : '0%'})`,
                }}
              />
              
              {/* Buttons */}
              <div className="relative flex">
                <button
                  onClick={() => setShowUserProducts(false)}
                  className={`relative z-10 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ease-in-out`}
                >
                  <span className="flex items-center justify-center whitespace-nowrap">
                    <ShoppingBag size={16} className="mr-2" />
                    <span className={`transition-colors duration-300 ${!showUserProducts ? 'text-white' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Marketplace
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => {
                    if (user?.isSeller && user?.sellerStatus === 'APPROVED') {
                      setShowUserProducts(true);
                    } else {
                      toast("You need seller verification to add products. Go to Edit Profile to apply.", {
                        icon: 'ℹ️',
                        style: {
                          border: '1px solid #3b82f6',
                          padding: '16px',
                          color: '#1e40af',
                          background: '#eff6ff'
                        },
                        duration: 5000
                      });
                    }
                  }}
                  className={`relative z-10 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ease-in-out ${!(user?.isSeller && user?.sellerStatus === 'APPROVED') ? 'opacity-70' : ''}`}
                  title={!(user?.isSeller && user?.sellerStatus === 'APPROVED') ? "Seller verification required to list products" : ""}
                >
                  <span className="flex items-center justify-center whitespace-nowrap">
                    <span className={`${darkMode ? 'bg-blue-700' : 'bg-blue-600'} ${showUserProducts ? 'opacity-100 scale-100' : 'opacity-0 scale-50'} absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs text-white items-center justify-center font-bold transition-all duration-300 ease-in-out flex`}>
                      {userProducts.length}
                    </span>
                    <ShoppingBag size={16} className="mr-2" />
                    <span className={`transition-colors duration-300 ${showUserProducts ? 'text-white' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      My Products
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Products Grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="flex-1 p-4 overflow-y-auto mx-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-700"
        >
          <motion.div 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="flex items-center justify-between mb-5"
          >
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'} flex items-center`}>
              {showUserProducts ? (
                <>
                  <ShoppingBag size={20} className="mr-3" />
                  My Products ({userProducts.length})
                </>
              ) : (
                <>
                  <ShoppingBag size={20} className="mr-3" />
                  Marketplace
                </>
              )}
            </h2>
            
            {/* Simple product count */}
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} flex items-center`}>
              <span>
                {showUserProducts ? userProducts.length : filteredProducts.length} items
              </span>
            </div>
          </motion.div>
          
          <AnimatePresence mode="wait">
            {(showUserProducts ? userProducts.length === 0 : filteredProducts.length === 0) ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`flex flex-col items-center justify-center h-64 bg-opacity-50 rounded-xl ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
              >
                <div className={`p-5 rounded-full mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <ShoppingBag size={40} className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
                <p className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {showUserProducts 
                    ? "You haven't listed any products yet" 
                    : "No products found"
                  }
                </p>
                <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {showUserProducts 
                    ? user?.isSeller && user?.sellerStatus === 'APPROVED'
                      ? "Click 'Sell Item' to add a product" 
                      : "You need seller verification to add products"
                    : "Try adjusting your search or filters"
                  }
                </p>
                
                {showUserProducts && (
                  <button 
                    onClick={() => {
                      if (user?.isSeller && user?.sellerStatus === 'APPROVED') {
                        setShowAddProductModal(true);
                      } else {
                        toast("You need seller verification to add products. Go to Edit Profile to apply.", {
                          icon: 'ℹ️',
                          style: {
                            border: '1px solid #3b82f6',
                            padding: '16px',
                            color: '#1e40af',
                            background: '#eff6ff'
                          },
                          duration: 5000
                        });
                      }
                    }}
                    title={!(user?.isSeller && user?.sellerStatus === 'APPROVED') ? "Seller verification required to list products" : ""}
                    className={`mt-6 px-5 py-2.5 rounded-lg ${
                      user?.isSeller && user?.sellerStatus === 'APPROVED'
                        ? darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                        : darkMode ? 'bg-blue-600/50 hover:bg-blue-700/50' : 'bg-blue-500/50 hover:bg-blue-600/50'
                    } text-white flex items-center transition-colors`}
                  >
                    <Plus size={18} className="mr-2" />
                    Add Product
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5"
              >
                {(showUserProducts ? userProducts : filteredProducts).map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <ProductCard 
                      product={product} 
                      darkMode={darkMode} 
                      user={adaptUserForProductCard(user)} 
                      onBuy={handlePurchase}
                      onEdit={() => handleEditProduct(product.id)}
                      getImageUrl={getImageUrl}
                      isOwner={showUserProducts || user?.id === product.seller.id}
                      onClick={() => handleViewProduct(product)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
      
      {/* Verification Modal */}
      {user && (
        <VerificationModal
          isOpen={verificationModalOpen}
          onClose={() => setVerificationModalOpen(false)}
          type="email"
          value={user.email}
          onVerified={handleVerificationComplete}
        />
      )}
      
      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className={`rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 max-w-md w-full text-center`}
            >
              <div className="bg-green-100 text-green-800 rounded-full p-4 inline-flex mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">Purchase Successful!</h2>
              <p className="mb-4">
                Your purchase has been completed successfully. The seller will be notified.
              </p>
              <button
                onClick={() => setShowSuccess(false)}
                className={`px-4 py-2 rounded-lg ${
                  darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'
                } text-white`}
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Add Funds Modal */}
      <AddFundsModal 
        isOpen={showAddFundsModal}
        onClose={() => setShowAddFundsModal(false)}
        onSuccess={handleAddFundsSuccess}
        currentBalance={wallet.balance}
      />
      
      {/* Add Product Modal */}
      {user?.isSeller && user?.sellerStatus === 'APPROVED' && (
        <AddProductModal 
          isOpen={showAddProductModal} 
          onClose={() => setShowAddProductModal(false)} 
          onProductAdded={handleProductAdded} 
        />
      )}
      
      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={showEditProductModal}
        onClose={() => {
          setShowEditProductModal(false);
          setProductToEdit(null);
        }}
        onProductUpdated={handleProductAdded}
        productId={productToEdit}
      />
      
      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        product={selectedViewProduct}
        onBuy={handlePurchase}
        getImageUrl={getImageUrl}
        currentUser={adaptUserForProductCard(user)}
      />
    </div>
  );
};

export default Marketplace; 