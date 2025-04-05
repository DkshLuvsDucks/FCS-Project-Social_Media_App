import React from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import DarkModeToggle from '../components/DarkModeToggle';
import CreatePostForm from '../components/CreatePostForm';
import { ChevronLeft } from 'lucide-react';

const CreatePost: React.FC = () => {
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  
  const handlePostCreated = () => {
    // Redirect to home page after successful post creation
    setTimeout(() => {
      navigate('/');
    }, 2000);
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
            <h1 className="text-xl font-semibold">Create Post</h1>
            <div className="w-10"></div> {/* Spacer to balance the layout */}
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 max-w-3xl mx-auto w-full p-4">
          <div className="my-6">
            <CreatePostForm onPostCreated={handlePostCreated} />
          </div>
          
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} mt-8`}>
            <h2 className="text-lg font-semibold mb-3">Posting Guidelines</h2>
            <ul className={`list-disc pl-5 ${darkMode ? 'text-gray-300' : 'text-gray-700'} space-y-2`}>
              <li>Be respectful and considerate of others</li>
              <li>Don't share sensitive personal information</li>
              <li>Avoid posting content that violates our community standards</li>
              <li>Use the encryption option for private content (only visible to you)</li>
              <li>You can edit or delete your posts after publishing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost; 