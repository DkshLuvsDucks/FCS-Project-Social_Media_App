import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDarkMode } from '../context/DarkModeContext';

interface ComingSoonProps {
  pageName: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ pageName }) => {
  const navigate = useNavigate();
  const { darkMode } = useDarkMode();

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className={`w-full max-w-lg text-center space-y-8 ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } p-8 rounded-2xl shadow-xl`}>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-xl opacity-20 animate-pulse rounded-full" />
          <Construction 
            size={64} 
            className={`mx-auto ${
              darkMode ? 'text-purple-400' : 'text-purple-500'
            } animate-bounce`}
          />
        </div>
        
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          {pageName}
        </h1>
        
        <p className={`text-lg ${
          darkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          We're working hard to bring you something amazing! This feature will be implemented soon.
        </p>

        <div className="h-2 w-48 mx-auto bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-progress" />
        </div>

        <button
          onClick={() => navigate('/home')}
          className={`mt-6 flex items-center justify-center space-x-2 mx-auto px-6 py-3 rounded-lg transition-all duration-300 ${
            darkMode 
              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
          }`}
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </button>
      </div>
    </div>
  );
};

export default ComingSoon; 