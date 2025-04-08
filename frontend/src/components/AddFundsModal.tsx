import React, { useState } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { Plus, X, Wallet, IndianRupee } from 'lucide-react';
import axiosInstance from '../utils/axios';
import { motion, AnimatePresence } from 'framer-motion';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
  currentBalance: number;
}

interface AddFundsResponse {
  success: boolean;
  balance: number;
}

const AddFundsModal: React.FC<AddFundsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentBalance
}) => {
  const { darkMode } = useDarkMode();
  const [amount, setAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleAddFunds = async () => {
    if (amount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      // Call API to add funds
      const response = await axiosInstance.post<AddFundsResponse>('/api/marketplace/add-funds', {
        amount: amount
      });

      // Handle success
      if (response.data && response.data.success) {
        const newBalance = response.data.balance;
        onSuccess(newBalance);
        onClose();
      } else {
        setError('Failed to add funds. Please try again.');
      }
    } catch (error) {
      console.error('Error adding funds:', error);
      setError('An error occurred while adding funds. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
            className={`relative w-full max-w-md rounded-xl overflow-hidden ${darkMode ? 'bg-gray-800/95' : 'bg-white/95'} shadow-xl backdrop-blur-md`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header with gradient background */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet size={24} />
                  <h3 className="text-xl font-bold">Add Funds to Wallet</h3>
                </div>
                <button 
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Current Balance with glowing effect */}
              <div className={`p-5 rounded-lg mb-6 text-center relative overflow-hidden
                ${darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50'} 
                ${darkMode ? 'border border-gray-600' : 'border border-blue-100'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-50"></div>
                <p className="text-sm font-medium mb-1 text-gray-400">Current Balance</p>
                <div className="flex items-center justify-center gap-1">
                  <IndianRupee size={20} className={`${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {currentBalance.toFixed(2)}
                  </p>
                </div>
              </div>
              
              {/* Amount Input */}
              <div className="mb-5">
                <label htmlFor="amount" className="block text-sm font-medium mb-2">
                  Amount to Add (₹)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 
                      ${darkMode 
                        ? 'bg-gray-700 border-gray-600 focus:ring-indigo-500 text-white' 
                        : 'bg-white border-gray-300 focus:ring-indigo-400 text-gray-900'} 
                      border shadow-sm`}
                    placeholder="Enter amount"
                  />
                </div>
              </div>
              
              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {[100, 500, 1000, 2000, 5000, 10000].map((value) => (
                  <button
                    key={value}
                    onClick={() => setAmount(value)}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors
                      ${darkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-900 border border-gray-200'}
                      hover:border-indigo-400 hover:shadow-sm`}
                  >
                    ₹{value}
                  </button>
                ))}
              </div>
              
              {/* Error Message */}
              {error && (
                <div className="mb-4 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">
                  {error}
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
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
                  onClick={handleAddFunds}
                  disabled={isLoading || amount <= 0}
                  className={`px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2
                    bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700
                    text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Add Funds</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddFundsModal; 