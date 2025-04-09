import { useState, useEffect, useCallback } from "react";
import { User, FileCheck, X, Shield, Lock, RefreshCw, LogOut, Users, Settings, Calendar, AlertTriangle, CheckCircle, Search, Store, Download, File, Check } from "lucide-react";
import { useDarkMode } from "../context/DarkModeContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import DarkModeToggle from "../components/DarkModeToggle";
import { motion, AnimatePresence } from 'framer-motion';
import axios from "axios";
import { toast } from "react-hot-toast";
import axiosInstance from "../utils/axios";
import PasswordVerificationModal from "../components/PasswordVerificationModal";

interface UserData {
  id: number;
  _id?: string;
  email: string;
  username: string;
  mobile: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  twoFactorEnabled: boolean;
  createdAt: string;
  userImage: string | null;
  profilePicture?: string;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  isBanned: boolean;
  bannedAt: string | null;
  isSeller: boolean;
  sellerVerificationDoc: string | null;
  verificationDocument?: string;
  isVerified?: boolean;
  sellerStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
}

const Admin: React.FC = () => {
  const { darkMode } = useDarkMode();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [sellerRequests, setSellerRequests] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'users' | 'seller-requests'>('users');
  const [showDocViewer, setShowDocViewer] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<string | null>(null);
  
  // Password verification modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'ban' | 'unban' | 'delete' | 'lock' | 'unlock' | 'approve-seller' | 'reject-seller';
    userId: number;
    actionDescription: string;
  } | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }
      setUsers(data);
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSellerRequests = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/admin/seller-verifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Failed to fetch seller requests: ${response.status}`);
      }
      setSellerRequests(data);
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Failed to fetch seller verification requests');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    if (user.role !== 'ADMIN') {
      navigate('/');
      return;
    }

    if (activeTab === 'users') {
    fetchUsers();
    } else if (activeTab === 'seller-requests') {
      fetchSellerRequests();
    }
  }, [user, navigate, refreshKey, activeTab, fetchUsers, fetchSellerRequests]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleBan = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server response:', errorData);
        throw new Error(`Failed to ban user: ${response.status}`);
      }

      const updatedUser = await response.json();
      console.log('User banned:', updatedUser);
      
      await fetchUsers();
    } catch (err) {
      console.error('Ban error:', err);
      setError(err instanceof Error ? err.message : 'Failed to ban user');
    }
  };

  const handleUnban = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/admin/users/${userId}/unban`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server response:', errorData);
        throw new Error(`Failed to unban user: ${response.status}`);
      }

      const updatedUser = await response.json();
      console.log('User unbanned:', updatedUser);
      
      await fetchUsers();
    } catch (err) {
      console.error('Unban error:', err);
      setError(err instanceof Error ? err.message : 'Failed to unban user');
    }
  };

  const handleLock = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/admin/users/${userId}/lock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server response:', errorData);
        throw new Error(`Failed to lock user: ${response.status}`);
      }

      const updatedUser = await response.json();
      console.log('User locked:', updatedUser);
      
      await fetchUsers();
    } catch (err) {
      console.error('Lock error:', err);
      setError(err instanceof Error ? err.message : 'Failed to lock user');
    }
  };

  const handleUnlock = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/admin/users/${userId}/unlock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server response:', errorData);
        throw new Error(`Failed to unlock user: ${response.status}`);
      }

      const updatedUser = await response.json();
      console.log('User unlocked:', updatedUser);
      
      await fetchUsers();
    } catch (err) {
      console.error('Unlock error:', err);
      setError(err instanceof Error ? err.message : 'Failed to unlock user');
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Ask for confirmation before deleting
      if (!window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
        return;
      }

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server response:', errorData);
        throw new Error(`Failed to delete user: ${errorData.error || response.status}`);
      }

      console.log('User deleted successfully');
      await fetchUsers(); // Refresh the user list
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleSellerVerification = async (userId: number, action: 'approve' | 'reject') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const endpoint = action === 'approve' ? 'approve-seller' : 'reject-seller';
      const response = await fetch(`/api/admin/users/${userId}/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server response:', errorData);
        throw new Error(`Failed to ${action} seller: ${response.status}`);
      }

      const updatedUser = await response.json();
      console.log(`Seller ${action}d:`, updatedUser);
      
      // Refresh the appropriate data based on active tab
      if (activeTab === 'users') {
        await fetchUsers();
      } else {
        await fetchSellerRequests();
      }
    } catch (err) {
      console.error(`Seller ${action} error:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${action} seller`);
    }
  };

  // Update the filteredUsers to filter out admins and moderators
  const filteredUsers = users
    .filter(user => user.role === 'USER') // Only show USER accounts
    .filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const pendingSellerRequests = activeTab === 'seller-requests' 
    ? sellerRequests 
    : users.filter(user => user.isSeller && user.sellerStatus === 'PENDING');

  // Helper functions for document viewer
  const isImageFile = (url: string | null): boolean => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const lowerCaseUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerCaseUrl.endsWith(ext));
  };

  const getFullUrl = (url: string | null): string => {
    if (!url) return '#';
    
    console.log("Getting full URL for:", url);
    
    // Get filename and construct direct path to verification-documents folder
    const filename = url.split('/').pop();
    if (filename) {
      return `${window.location.protocol}//localhost:3000/uploads/verification-documents/${filename}`;
    }
    
    // Fallback to original URL if no filename
    return url;
  };

  const openDocViewer = (docUrl: string | undefined | null) => {
    if (docUrl) {
      console.log("Opening document viewer for:", docUrl);
      setCurrentDocument(docUrl);
      setShowDocViewer(true);
    }
  };

  // Filter seller requests based on search term
  const filterSellerRequests = (): UserData[] => {
    if (!searchTerm) {
      return pendingSellerRequests as UserData[];
    }
    
    const term = searchTerm.toLowerCase();
    return (pendingSellerRequests as UserData[]).filter(user => 
      user.username.toLowerCase().includes(term) || 
      user.email.toLowerCase().includes(term)
    );
  };

  // Handle seller verification approval
  const handleVerifySeller = async (userId: number | string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Use the correct endpoint with axiosInstance to ensure the right base URL is used
      await axiosInstance.put(`/api/admin/users/${userId}/approve-seller`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      toast.success("Seller verified successfully");
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Error verifying seller:", error);
      toast.error("Failed to verify seller");
    } finally {
      setLoading(false);
    }
  };

  // Handle seller verification rejection
  const handleRejectSeller = async (userId: number | string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Use the correct endpoint with axiosInstance to ensure the right base URL is used
      await axiosInstance.put(`/api/admin/users/${userId}/reject-seller`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      toast.success("Seller request rejected");
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Error rejecting seller:", error);
      toast.error("Failed to reject seller request");
    } finally {
      setLoading(false);
    }
  };

  const renderSellerRequestsTable = () => {
    if (loading) {
      return <div className="text-center py-8"><p>Loading...</p></div>;
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <p className="text-red-500">{error}</p>
          <button 
            onClick={() => setRefreshKey(prev => prev + 1)} 
            className={`mt-4 flex items-center justify-center mx-auto px-4 py-2 rounded-lg ${darkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"} text-white transition-colors`}
          >
            <RefreshCw size={16} className="mr-2" /> Retry
          </button>
        </div>
      );
    }

    const filteredRequests = filterSellerRequests();
    
    if (filteredRequests.length === 0) {
      return (
        <div className="text-center py-8">
          <p>{searchTerm ? "No seller requests match your search." : "No pending seller requests found."}</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className={`min-w-full divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
          <thead className={darkMode ? "bg-gray-800" : "bg-gray-50"}>
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Document
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
            {filteredRequests.map((userData, index) => (
              <tr key={userData.id || userData._id || `seller-req-${index}`} className={`${darkMode ? "hover:bg-gray-800" : "hover:bg-gray-50"}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {userData.userImage ? (
                        <SafeImage 
                          src={userData.userImage}
                          alt={userData.username}
                          className="h-10 w-10 rounded-full object-cover"
                          fallbackComponent={
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>
                              <User size={20} className="text-gray-500" />
                            </div>
                          }
                        />
                      ) : (
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>
                          <User size={20} className="text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                        {userData.username}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={darkMode ? "text-gray-300" : "text-gray-700"}>
                    {userData.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    userData.sellerStatus === 'PENDING' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : userData.sellerStatus === 'APPROVED' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {userData.sellerStatus}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {userData.sellerVerificationDoc || userData.verificationDocument ? (
                    <button
                      onClick={() => openDocViewer(userData.sellerVerificationDoc || userData.verificationDocument)}
                      className={`px-3 py-1 rounded-md ${
                        darkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"
                      } text-sm transition-colors flex items-center`}
                    >
                      <FileCheck size={16} className="mr-1" />
                      View Document
                    </button>
                  ) : (
                    <span className="text-sm text-gray-500">No document</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const userId = userData.id || userData._id;
                        if (userId) initiatePasswordVerification('approve-seller', userId, 'approve seller');
                      }}
                      disabled={!userData.id && !userData._id}
                      className={`px-3 py-1 rounded-md ${
                        !userData.id && !userData._id ? 'bg-gray-400 cursor-not-allowed' : 
                        darkMode ? "bg-green-600 hover:bg-green-700" : "bg-green-500 hover:bg-green-600"
                      } text-white transition-colors flex items-center`}
                    >
                      <Check size={16} className="mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        const userId = userData.id || userData._id;
                        if (userId) initiatePasswordVerification('reject-seller', userId, 'reject seller');
                      }}
                      disabled={!userData.id && !userData._id}
                      className={`px-3 py-1 rounded-md ${
                        !userData.id && !userData._id ? 'bg-gray-400 cursor-not-allowed' : 
                        darkMode ? "bg-red-600 hover:bg-red-700" : "bg-red-500 hover:bg-red-600"
                      } text-white transition-colors flex items-center`}
                    >
                      <X size={16} className="mr-1" />
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Add a SafeImage component for better image handling
  const SafeImage = ({ 
    src, 
    alt, 
    className, 
    fallbackComponent
  }: { 
    src: string | null; 
    alt: string; 
    className: string;
    fallbackComponent: React.ReactNode;
  }) => {
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    
    useEffect(() => {
      // Reset states when src changes
      setIsLoading(true);
      setHasError(false);
      
      if (!src) {
        setHasError(true);
        setIsLoading(false);
        return;
      }
      
      // Log the source for debugging
      console.log("Attempting to load image:", src);
      
      // Function to extract filename from path
      const getFilename = (path: string): string | null => {
        const parts = path.split('/');
        return parts[parts.length - 1] || null;
      };
      
      // Preload the image to check if it loads correctly
      const img = new Image();
      
      // Set correct source URL based on path pattern
      const filename = getFilename(src);
      console.log("Extracted filename:", filename);
      
      if (!filename) {
        setHasError(true);
        setIsLoading(false);
        return;
      }
      
      // Backend server is always on port 3000 regardless of the frontend port
      const backendUrl = `${window.location.protocol}//localhost:3000`;
      
      // Check if this is a verification document
      if (src.includes('verification-documents')) {
        // Load directly from the verification-documents folder on backend
        img.src = `${backendUrl}/uploads/verification-documents/${filename}`;
        console.log("Loading verification document from:", img.src);
      }
      else if (src.startsWith('/uploads/profiles/')) {
        // Profile pictures are in a different directory on backend
        img.src = `${backendUrl}/uploads/profile-pictures/${filename}`;
        console.log("Loading profile picture from:", img.src);
      }
      else if (src.startsWith('http://') || src.startsWith('https://')) {
        // Already a full URL
        img.src = src;
      }
      else if (src.startsWith('/uploads/')) {
        // Other uploads use the full path on backend
        img.src = `${backendUrl}${src}`;
      }
      else {
        // Unknown format, try as is
        img.src = src;
      }
      
      // Handle successful load
      img.onload = () => {
        console.log("Image loaded successfully:", img.src);
        setImgSrc(img.src);
        setIsLoading(false);
        setHasError(false);
      };
      
      // Handle load error
      img.onerror = () => {
        console.error(`Failed to load image from path: ${img.src}`);
        setHasError(true);
        setIsLoading(false);
      };
      
      // Cleanup
      return () => {
        img.onload = null;
        img.onerror = null;
      };
    }, [src]);
    
    if (isLoading) {
      return (
        <div className={`${className} flex items-center justify-center bg-gray-100 dark:bg-gray-700 animate-pulse`}>
          <span className="sr-only">Loading...</span>
        </div>
      );
    }
    
    if (hasError || !imgSrc) {
      return <>{fallbackComponent}</>;
    }
    
    return <img src={imgSrc} alt={alt} className={className} />;
  };

  // Function to handle password verification modal for critical actions
  const initiatePasswordVerification = (
    actionType: 'ban' | 'unban' | 'delete' | 'lock' | 'unlock' | 'approve-seller' | 'reject-seller',
    userId: number | string,
    actionDescription: string
  ) => {
    setPendingAction({
      type: actionType,
      userId: typeof userId === 'string' ? parseInt(userId) : userId,
      actionDescription
    });
    setShowPasswordModal(true);
  };

  // Function to execute pending action after password verification
  const executeVerifiedAction = async () => {
    if (!pendingAction) return;

    const { type, userId } = pendingAction;
    
    try {
      switch (type) {
        case 'ban':
          await handleBan(userId);
          break;
        case 'unban':
          await handleUnban(userId);
          break;
        case 'delete':
          await handleDelete(userId);
          break;
        case 'lock':
          await handleLock(userId);
          break;
        case 'unlock':
          await handleUnlock(userId);
          break;
        case 'approve-seller':
          await handleVerifySeller(userId);
          break;
        case 'reject-seller':
          await handleRejectSeller(userId);
          break;
      }
      toast.success(`Action completed successfully`);
    } catch (error) {
      console.error('Error executing action:', error);
      toast.error('Failed to complete the action');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      {/* Fixed Dark Mode Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <DarkModeToggle />
      </div>

      {/* Header */}
      <div className={`fixed top-0 left-0 right-0 z-10 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Users className={`h-8 w-8 mr-3 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
                <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>Admin Dashboard</h1>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                darkMode ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"
              }`}>
                Admin Panel
              </span>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                className={`p-2 rounded-lg transition-colors flex items-center ${
                  darkMode
                    ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                title="Refresh user list"
              >
                <RefreshCw size={20} className="mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={handleLogout}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  darkMode
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
              >
                <LogOut size={20} className="mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {showDocViewer && currentDocument && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setShowDocViewer(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`relative max-w-3xl w-full max-h-[80vh] overflow-hidden rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 shadow-xl`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Verification Document
                </h3>
                <button
                  onClick={() => setShowDocViewer(false)}
                  className={`p-1.5 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
                >
                  <X size={20} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
                </button>
              </div>

              <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} pt-4`}>
                {isImageFile(currentDocument) ? (
                  <div className="flex items-center justify-center overflow-auto max-h-[60vh]">
                    {/* Updated image component with proper URL handling */}
                    <img 
                      src={
                        currentDocument?.startsWith("http") ? 
                          currentDocument : 
                          `${window.location.protocol}//localhost:3000/uploads/verification-documents/${currentDocument?.split('/').pop()}`
                      }
                      alt="Verification Document" 
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        console.error("Failed to load image:", e);
                        // If image fails to load, show document icon
                        const target = e.target as HTMLImageElement;
                        target.onerror = null; // Prevent infinite error loops
                        target.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE0IDJINiBhMiAyIDAgMCAwLTIgMiB2MTYgYTIgMiAwIDAgMCAyIDIgaDEyIGEyIDIgMCAwIDAgMi0yIFY4IHoiPjwvcGF0aD48cG9seWxpbmUgcG9pbnRzPSIxNCAyIDE0IDggMjAgOCI+PC9wb2x5bGluZT48L3N2Zz4=";
                        target.style.opacity = "0.5"; // Make it visually distinct
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <File size={64} className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <p className={`mb-4 text-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      PDF document cannot be displayed inline
                    </p>
                    <a
                      href={
                        currentDocument?.startsWith("http") ? 
                          currentDocument : 
                          `${window.location.protocol}//localhost:3000/uploads/verification-documents/${currentDocument?.split('/').pop()}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-4 py-2 rounded-lg flex items-center ${
                        darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                      } text-white transition-colors duration-200`}
                    >
                      <Download size={16} className="mr-2" />
                      Download PDF
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="pt-20 p-6">
        <div className="max-w-7xl mx-auto">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 bg-red-100 text-red-600 rounded-lg border border-red-200"
            >
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                {error}
              </div>
            </motion.div>
          )}

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-700">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? darkMode
                      ? 'border-blue-500 text-blue-400'
                      : 'border-blue-500 text-blue-600'
                    : darkMode
                    ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                User Management
              </button>
              <button
                onClick={() => setActiveTab('seller-requests')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'seller-requests'
                    ? darkMode
                      ? 'border-blue-500 text-blue-400'
                      : 'border-blue-500 text-blue-600'
                    : darkMode
                    ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Seller Verification Requests
                {pendingSellerRequests.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-500 text-white">
                    {pendingSellerRequests.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {activeTab === 'users' ? (
            <>
          {/* Stats Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"
          >
            <div className={`p-6 rounded-lg shadow-sm transform transition-all duration-200 hover:scale-105 ${darkMode ? "bg-gray-800 hover:bg-gray-750" : "bg-white hover:bg-gray-50"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Total Users</p>
                  <h3 className={`text-3xl font-bold mt-2 ${darkMode ? "text-white" : "text-gray-900"}`}>{users.length}</h3>
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                    Active accounts in system
                  </p>
                </div>
                <div className={`p-4 rounded-full ${darkMode ? "bg-blue-900/20" : "bg-blue-100"}`}>
                  <Users className={`h-8 w-8 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
                </div>
              </div>
            </div>
            
            <div className={`p-6 rounded-lg shadow-sm transform transition-all duration-200 hover:scale-105 ${darkMode ? "bg-gray-800 hover:bg-gray-750" : "bg-white hover:bg-gray-50"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-600"}`}>2FA Enabled</p>
                  <h3 className={`text-3xl font-bold mt-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                    {users.filter(u => u.twoFactorEnabled).length}
                  </h3>
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                    Secured with 2FA
                  </p>
                </div>
                <div className={`p-4 rounded-full ${darkMode ? "bg-green-900/20" : "bg-green-100"}`}>
                  <Shield className={`h-8 w-8 ${darkMode ? "text-green-400" : "text-green-600"}`} />
                </div>
              </div>
            </div>
            
            <div className={`p-6 rounded-lg shadow-sm transform transition-all duration-200 hover:scale-105 ${darkMode ? "bg-gray-800 hover:bg-gray-750" : "bg-white hover:bg-gray-50"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Locked Accounts</p>
                  <h3 className={`text-3xl font-bold mt-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                    {users.filter(u => u.lockedUntil && new Date(u.lockedUntil) > new Date()).length}
                  </h3>
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                    Currently locked out
                  </p>
                </div>
                <div className={`p-4 rounded-full ${darkMode ? "bg-red-900/20" : "bg-red-100"}`}>
                  <Lock className={`h-8 w-8 ${darkMode ? "text-red-400" : "text-red-600"}`} />
                </div>
              </div>
            </div>
          </motion.div>

          {/* User List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-sm`}
          >
            <div className={`p-6 border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                <h2 className={`text-xl font-semibold flex items-center ${darkMode ? "text-white" : "text-gray-900"}`}>
                  <User className="mr-2" />
                  User Management
                </h2>
                
                {/* Search Bar */}
                <div className="relative w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full sm:w-64 pl-10 pr-4 py-2 rounded-lg border ${
                      darkMode 
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" 
                        : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <Search className={`h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={darkMode ? "bg-gray-800" : "bg-gray-50"}>
                    <tr>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-600"} uppercase tracking-wider`}>
                        User
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-600"} uppercase tracking-wider`}>
                        Account Type
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-600"} uppercase tracking-wider`}>
                        Status
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-600"} uppercase tracking-wider`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
                    {filteredUsers.map((user) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-50"} transition-colors`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {user.userImage ? (
                              <SafeImage 
                                src={user.userImage} 
                                alt={user.username} 
                                className="w-10 h-10 rounded-full mr-3 object-cover ring-2 ring-offset-2 ring-gray-300"
                                fallbackComponent={
                                  <div className={`w-10 h-10 rounded-full mr-3 flex items-center justify-center ${darkMode ? "bg-gray-700" : "bg-gray-200"} ring-2 ring-offset-2 ring-gray-300`}>
                                    <User size={20} className={darkMode ? "text-gray-400" : "text-gray-500"} />
                                  </div>
                                }
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-full mr-3 flex items-center justify-center ${darkMode ? "bg-gray-700" : "bg-gray-200"} ring-2 ring-offset-2 ring-gray-300`}>
                                <User size={20} className={darkMode ? "text-gray-400" : "text-gray-500"} />
                              </div>
                            )}
                            <div>
                              <div className={`text-sm font-medium ${darkMode ? "text-gray-200" : "text-gray-900"}`}>
                                {user.username}
                              </div>
                              <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                                {user.email}
                              </div>
                              {user.mobile && (
                                <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                                  {user.mobile}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.isSeller && user.sellerStatus === 'APPROVED'
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}>
                            {user.isSeller && user.sellerStatus === 'APPROVED' ? "Seller" : "User"}
                          </span>
                          {user.isSeller && user.sellerStatus === 'PENDING' && (
                            <span className="px-3 py-1 mt-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Verification Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.twoFactorEnabled
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {user.twoFactorEnabled ? "2FA Enabled" : "2FA Disabled"}
                            </span>
                            {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
                              <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                                Locked
                              </span>
                            )}
                            {user.isBanned && (
                              <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                Banned
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-4">
                            {!user.isBanned ? (
                              <button
                                onClick={() => initiatePasswordVerification('ban', user.id, 'ban account')}
                                className={`flex items-center px-3 py-1 rounded-md transition-colors ${
                                  darkMode
                                    ? "bg-orange-600 text-white hover:bg-orange-700"
                                    : "bg-orange-500 text-white hover:bg-orange-600"
                                }`}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Ban Account
                              </button>
                            ) : (
                              <button
                                onClick={() => initiatePasswordVerification('unban', user.id, 'unban account')}
                                className={`flex items-center px-3 py-1 rounded-md transition-colors ${
                                  darkMode
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "bg-green-500 text-white hover:bg-green-600"
                                }`}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Unban Account
                              </button>
                            )}
                            {/* Lock/Unlock Button */}
                            {user.lockedUntil && new Date(user.lockedUntil) > new Date() ? (
                              <button
                                onClick={() => initiatePasswordVerification('unlock', user.id, 'unlock account')}
                                className={`flex items-center px-3 py-1 rounded-md transition-colors ${
                                  darkMode
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "bg-green-500 text-white hover:bg-green-600"
                                }`}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Unlock Account
                              </button>
                            ) : (
                              <button
                                onClick={() => initiatePasswordVerification('lock', user.id, 'lock account')}
                                className={`flex items-center px-3 py-1 rounded-md transition-colors ${
                                  darkMode
                                    ? "bg-amber-500 text-white hover:bg-amber-600"
                                    : "bg-amber-400 text-white hover:bg-amber-500"
                                }`}
                              >
                                <Lock className="w-4 h-4 mr-1" />
                                Lock Account
                              </button>
                            )}
                            <button
                              onClick={() => initiatePasswordVerification('delete', user.id, 'delete account')}
                              className={`flex items-center px-3 py-1 rounded-md transition-colors ${
                                darkMode
                                  ? "bg-red-600 text-white hover:bg-red-700"
                                  : "bg-red-500 text-white hover:bg-red-600"
                              }`}
                            >
                              <AlertTriangle className="w-4 h-4 mr-1" />
                              Delete Account
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-sm`}
            >
              <div className={`p-6 border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                <h2 className={`text-xl font-semibold flex items-center ${darkMode ? "text-white" : "text-gray-900"}`}>
                  <Store className="mr-2" />
                  Seller Verification Requests
                </h2>
        </div>
              
              <div className="overflow-x-auto">
                {renderSellerRequestsTable()}
              </div>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Password Verification Modal */}
      <PasswordVerificationModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onVerified={executeVerifiedAction}
        actionType={pendingAction?.actionDescription || 'perform this action'}
      />
    </div>
  );
};

export default Admin; 